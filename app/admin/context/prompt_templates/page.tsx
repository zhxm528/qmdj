"use client";

import { useEffect, useState } from "react";
import Layout from "@/components/Layout";
import {
  ConfigProvider,
  Table,
  Button,
  Modal,
  Form,
  Input,
  Select,
  Space,
  Popconfirm,
  message,
} from "antd";
import zhCN from "antd/locale/zh_CN";
import type { ColumnsType } from "antd/es/table";
import { PlusOutlined, EditOutlined, DeleteOutlined } from "@ant-design/icons";
import dayjs from "dayjs";

const { TextArea } = Input;

interface PromptTemplate {
  id: string;
  logical_key: string;
  scope: string;
  project_id: string | null;
  scene_code: string | null;
  role: string;
  language: string;
  description: string | null;
  current_version_id: string | null;
  status: string;
  task_type: string | null;
  sensitivity: string | null;
  metadata: any;
  created_at: string;
  updated_at: string;
}

interface PromptTemplateFormValues {
  logical_key?: string;
  scope?: string;
  project_id?: string;
  scene_code?: string;
  role?: string;
  language?: string;
  description?: string;
  current_version_id?: string;
  status?: string;
  task_type?: string;
  sensitivity?: string;
  metadata?: string;
}

export default function PromptTemplatesPage() {
  const [form] = Form.useForm<PromptTemplateFormValues>();
  const [loading, setLoading] = useState(false);
  const [templates, setTemplates] = useState<PromptTemplate[]>([]);
  const [total, setTotal] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [modalVisible, setModalVisible] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<PromptTemplate | null>(null);
  const [projects, setProjects] = useState<Array<{ id: string; name: string }>>([]);

  const loadProjects = async () => {
    try {
      const res = await fetch("/api/admin/context/projects?pageSize=-1");
      const data = await res.json();
      if (data.success && data.data) {
        setProjects(data.data);
      }
    } catch (error) {
      console.error("加载项目列表失败:", error);
    }
  };

  const loadTemplates = async (page: number, size: number) => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.set("page", String(page));
      params.set("pageSize", String(size));

      const res = await fetch(`/api/admin/context/prompt_templates?${params.toString()}`);
      const data = await res.json();
      if (data.success) {
        setTemplates(data.data || []);
        setTotal(data.total || 0);
        setCurrentPage(page);
        setPageSize(size);
      } else {
        message.error(data.error || "加载提示词模板列表失败");
      }
    } catch (error) {
      console.error("加载提示词模板列表失败:", error);
      message.error("加载提示词模板列表失败");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadProjects();
    loadTemplates(1, 10);
  }, []);

  const handleAdd = () => {
    setEditingTemplate(null);
    form.resetFields();
    form.setFieldsValue({
      scope: "global",
      role: "system",
      language: "zh-CN",
      status: "active",
    });
    setModalVisible(true);
  };

  const handleEdit = (record: PromptTemplate) => {
    setEditingTemplate(record);
    form.setFieldsValue({
      logical_key: record.logical_key,
      scope: record.scope,
      project_id: record.project_id || undefined,
      scene_code: record.scene_code || undefined,
      role: record.role,
      language: record.language,
      description: record.description || undefined,
      current_version_id: record.current_version_id || undefined,
      status: record.status,
      task_type: record.task_type || undefined,
      sensitivity: record.sensitivity || undefined,
      metadata: record.metadata ? JSON.stringify(record.metadata, null, 2) : undefined,
    });
    setModalVisible(true);
  };

  const handleDelete = async (record: PromptTemplate) => {
    try {
      const res = await fetch(
        `/api/admin/context/prompt_templates?id=${record.id}`,
        {
          method: "DELETE",
        }
      );
      const data = await res.json();
      if (data.success) {
        message.success("删除成功");
        loadTemplates(currentPage, pageSize);
      } else {
        message.error(data.error || "删除失败");
      }
    } catch (error) {
      console.error("删除失败:", error);
      message.error("删除失败");
    }
  };

  const handleModalOk = async () => {
    try {
      const values = await form.validateFields();
      let metadata = null;
      if (values.metadata) {
        try {
          metadata = JSON.parse(values.metadata);
        } catch (e) {
          message.error("metadata 必须是有效的 JSON 格式");
          return;
        }
      }

      const payload: any = {
        logical_key: values.logical_key || null,
        scope: values.scope || null,
        project_id: values.project_id || null,
        scene_code: values.scene_code || null,
        role: values.role || null,
        language: values.language || "zh-CN",
        description: values.description || null,
        current_version_id: values.current_version_id || null,
        status: values.status || "active",
        task_type: values.task_type || null,
        sensitivity: values.sensitivity || null,
        metadata: metadata,
      };

      let res: Response;
      if (editingTemplate) {
        res = await fetch("/api/admin/context/prompt_templates", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            id: editingTemplate.id,
            ...payload,
          }),
        });
      } else {
        res = await fetch("/api/admin/context/prompt_templates", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
      }

      const data = await res.json();
      if (data.success) {
        message.success(editingTemplate ? "更新成功" : "创建成功");
        setModalVisible(false);
        form.resetFields();
        loadTemplates(currentPage, pageSize);
      } else {
        message.error(data.error || "保存失败");
      }
    } catch (error) {
      console.error("保存失败:", error);
    }
  };

  const handlePageChange = (page: number, size: number) => {
    loadTemplates(page, size);
  };

  const getProjectName = (projectId: string | null) => {
    if (!projectId) return "-";
    const project = projects.find((p) => p.id === projectId);
    return project ? project.name : `ID: ${projectId}`;
  };

  const columns: ColumnsType<PromptTemplate> = [
    {
      title: "ID",
      dataIndex: "id",
      key: "id",
      width: 300,
      fixed: "left",
      ellipsis: true,
    },
    {
      title: "逻辑键",
      dataIndex: "logical_key",
      key: "logical_key",
      width: 200,
    },
    {
      title: "作用范围",
      dataIndex: "scope",
      key: "scope",
      width: 100,
    },
    {
      title: "项目",
      dataIndex: "project_id",
      key: "project_id",
      width: 150,
      render: (value: string | null) => getProjectName(value),
    },
    {
      title: "场景代码",
      dataIndex: "scene_code",
      key: "scene_code",
      width: 150,
      render: (value: string | null) => value || "-",
    },
    {
      title: "角色",
      dataIndex: "role",
      key: "role",
      width: 100,
    },
    {
      title: "语言",
      dataIndex: "language",
      key: "language",
      width: 100,
    },
    {
      title: "状态",
      dataIndex: "status",
      key: "status",
      width: 100,
    },
    {
      title: "创建时间",
      dataIndex: "created_at",
      key: "created_at",
      width: 180,
      render: (value: string) =>
        value ? dayjs(value).format("YYYY-MM-DD HH:mm:ss") : "-",
    },
    {
      title: "操作",
      key: "action",
      fixed: "right",
      width: 160,
      render: (_, record) => (
        <Space>
          <Button
            type="link"
            icon={<EditOutlined />}
            onClick={() => handleEdit(record)}
          >
            编辑
          </Button>
          <Popconfirm
            title="确定要删除该提示词模板吗？"
            onConfirm={() => handleDelete(record)}
          >
            <Button type="link" danger icon={<DeleteOutlined />}>
              删除
            </Button>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <ConfigProvider locale={zhCN}>
      <Layout>
        <div className="min-h-screen bg-gradient-to-b from-amber-50 to-white py-12 px-4">
          <div className="max-w-7xl mx-auto bg-white rounded-lg shadow-md p-8">
            <div className="flex items-center justify-between mb-6">
              <h1 className="text-3xl font-bold text-gray-900">提示词模板管理</h1>
              <Button
                type="primary"
                icon={<PlusOutlined />}
                onClick={handleAdd}
              >
                新增模板
              </Button>
            </div>

            <Table<PromptTemplate>
              columns={columns}
              dataSource={templates}
              rowKey="id"
              loading={loading}
              pagination={{
                current: currentPage,
                pageSize: pageSize === -1 ? total || 10 : pageSize,
                total: total,
                showSizeChanger: true,
                pageSizeOptions: ["10", "100", "9999"],
                showTotal: (total) =>
                  pageSize === -1 ? `共 ${total} 条，显示全部` : `共 ${total} 条`,
                onChange: (page, size) => {
                  const s = size === 9999 ? -1 : size || 10;
                  handlePageChange(page, s);
                },
                onShowSizeChange: (current, size) => {
                  const s = size === 9999 ? -1 : size || 10;
                  handlePageChange(1, s);
                },
              }}
              scroll={{ x: 1500 }}
            />

            <Modal
              title={editingTemplate ? "编辑提示词模板" : "新增提示词模板"}
              open={modalVisible}
              onOk={handleModalOk}
              onCancel={() => {
                setModalVisible(false);
                form.resetFields();
              }}
              destroyOnClose
              width={800}
            >
              <Form<PromptTemplateFormValues>
                form={form}
                layout="vertical"
                preserve={false}
              >
                <Form.Item
                  label="逻辑键"
                  name="logical_key"
                  rules={[{ required: true, message: "请输入逻辑键" }]}
                >
                  <Input placeholder="如：qmdj.master.analyze_chart" />
                </Form.Item>
                <Form.Item
                  label="作用范围"
                  name="scope"
                  rules={[{ required: true, message: "请选择作用范围" }]}
                >
                  <Select>
                    <Select.Option value="global">global</Select.Option>
                    <Select.Option value="project">project</Select.Option>
                    <Select.Option value="scene">scene</Select.Option>
                  </Select>
                </Form.Item>
                <Form.Item label="项目" name="project_id">
                  <Select
                    showSearch
                    placeholder="请选择项目（可选）"
                    allowClear
                    optionFilterProp="children"
                    options={projects.map((p) => ({
                      value: p.id,
                      label: p.name,
                    }))}
                  />
                </Form.Item>
                <Form.Item label="场景代码" name="scene_code">
                  <Input placeholder="如：analyze_chart, classify_question" />
                </Form.Item>
                <Form.Item
                  label="角色"
                  name="role"
                  rules={[{ required: true, message: "请选择角色" }]}
                >
                  <Select>
                    <Select.Option value="system">system</Select.Option>
                    <Select.Option value="user">user</Select.Option>
                    <Select.Option value="assistant">assistant</Select.Option>
                    <Select.Option value="tool">tool</Select.Option>
                    <Select.Option value="fewshot">fewshot</Select.Option>
                  </Select>
                </Form.Item>
                <Form.Item
                  label="语言"
                  name="language"
                  rules={[{ required: true, message: "请输入语言" }]}
                >
                  <Input placeholder="如：zh-CN, en-US" />
                </Form.Item>
                <Form.Item label="描述" name="description">
                  <TextArea rows={3} placeholder="说明该提示词主要用途" />
                </Form.Item>
                <Form.Item label="当前版本ID" name="current_version_id">
                  <Input placeholder="UUID格式（可选）" />
                </Form.Item>
                <Form.Item
                  label="状态"
                  name="status"
                  rules={[{ required: true, message: "请选择状态" }]}
                >
                  <Select>
                    <Select.Option value="active">active</Select.Option>
                    <Select.Option value="testing">testing</Select.Option>
                    <Select.Option value="deprecated">deprecated</Select.Option>
                  </Select>
                </Form.Item>
                <Form.Item label="任务类型" name="task_type">
                  <Input placeholder="如：analysis, classification, generation" />
                </Form.Item>
                <Form.Item label="敏感等级" name="sensitivity">
                  <Input placeholder="如：low, normal, high" />
                </Form.Item>
                <Form.Item label="元数据 (JSON)" name="metadata">
                  <TextArea rows={6} placeholder='{"owner": "qmdj-team", "notes": "..."}' />
                </Form.Item>
              </Form>
            </Modal>
          </div>
        </div>
      </Layout>
    </ConfigProvider>
  );
}

