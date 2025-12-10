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

interface PromptTemplateVersion {
  id: string;
  template_id: string;
  version: string;
  template_text: string;
  config: any;
  status: string;
  changelog: string | null;
  created_by: string | null;
  created_at: string;
}

interface PromptTemplateVersionFormValues {
  template_id?: string;
  version?: string;
  template_text?: string;
  config?: string;
  status?: string;
  changelog?: string;
  created_by?: string;
}

export default function PromptTemplateVersionsPage() {
  const [form] = Form.useForm<PromptTemplateVersionFormValues>();
  const [loading, setLoading] = useState(false);
  const [versions, setVersions] = useState<PromptTemplateVersion[]>([]);
  const [total, setTotal] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [modalVisible, setModalVisible] = useState(false);
  const [editingVersion, setEditingVersion] = useState<PromptTemplateVersion | null>(null);
  const [templates, setTemplates] = useState<Array<{ id: string; logical_key: string }>>([]);

  const loadTemplates = async () => {
    try {
      const res = await fetch("/api/admin/context/prompt_templates?pageSize=-1");
      const data = await res.json();
      if (data.success && data.data) {
        setTemplates(data.data);
      }
    } catch (error) {
      console.error("加载模板列表失败:", error);
    }
  };

  const loadVersions = async (page: number, size: number) => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.set("page", String(page));
      params.set("pageSize", String(size));

      const res = await fetch(`/api/admin/context/prompt_template_versions?${params.toString()}`);
      const data = await res.json();
      if (data.success) {
        setVersions(data.data || []);
        setTotal(data.total || 0);
        setCurrentPage(page);
        setPageSize(size);
      } else {
        message.error(data.error || "加载模板版本列表失败");
      }
    } catch (error) {
      console.error("加载模板版本列表失败:", error);
      message.error("加载模板版本列表失败");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTemplates();
    loadVersions(1, 10);
  }, []);

  const handleAdd = () => {
    setEditingVersion(null);
    form.resetFields();
    form.setFieldsValue({
      status: "active",
    });
    setModalVisible(true);
  };

  const handleEdit = (record: PromptTemplateVersion) => {
    setEditingVersion(record);
    form.setFieldsValue({
      template_id: record.template_id,
      version: record.version,
      template_text: record.template_text,
      config: record.config ? JSON.stringify(record.config, null, 2) : undefined,
      status: record.status,
      changelog: record.changelog || undefined,
      created_by: record.created_by || undefined,
    });
    setModalVisible(true);
  };

  const handleDelete = async (record: PromptTemplateVersion) => {
    try {
      const res = await fetch(
        `/api/admin/context/prompt_template_versions?id=${record.id}`,
        {
          method: "DELETE",
        }
      );
      const data = await res.json();
      if (data.success) {
        message.success("删除成功");
        loadVersions(currentPage, pageSize);
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
      let config = null;
      if (values.config) {
        try {
          config = JSON.parse(values.config);
        } catch (e) {
          message.error("config 必须是有效的 JSON 格式");
          return;
        }
      }

      const payload: any = {
        template_id: values.template_id || null,
        version: values.version || null,
        template_text: values.template_text || null,
        config: config,
        status: values.status || "active",
        changelog: values.changelog || null,
        created_by: values.created_by || null,
      };

      let res: Response;
      if (editingVersion) {
        res = await fetch("/api/admin/context/prompt_template_versions", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            id: editingVersion.id,
            ...payload,
          }),
        });
      } else {
        res = await fetch("/api/admin/context/prompt_template_versions", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
      }

      const data = await res.json();
      if (data.success) {
        message.success(editingVersion ? "更新成功" : "创建成功");
        setModalVisible(false);
        form.resetFields();
        loadVersions(currentPage, pageSize);
      } else {
        message.error(data.error || "保存失败");
      }
    } catch (error) {
      console.error("保存失败:", error);
    }
  };

  const handlePageChange = (page: number, size: number) => {
    loadVersions(page, size);
  };

  const getTemplateName = (templateId: string) => {
    const template = templates.find((t) => t.id === templateId);
    return template ? template.logical_key : `ID: ${templateId}`;
  };

  const columns: ColumnsType<PromptTemplateVersion> = [
    {
      title: "ID",
      dataIndex: "id",
      key: "id",
      width: 300,
      fixed: "left",
      ellipsis: true,
    },
    {
      title: "模板",
      dataIndex: "template_id",
      key: "template_id",
      width: 200,
      render: (value: string) => getTemplateName(value),
    },
    {
      title: "版本号",
      dataIndex: "version",
      key: "version",
      width: 120,
    },
    {
      title: "状态",
      dataIndex: "status",
      key: "status",
      width: 100,
    },
    {
      title: "创建者",
      dataIndex: "created_by",
      key: "created_by",
      width: 120,
      render: (value: string | null) => value || "-",
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
            title="确定要删除该模板版本吗？"
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
              <h1 className="text-3xl font-bold text-gray-900">模板版本管理</h1>
              <Button
                type="primary"
                icon={<PlusOutlined />}
                onClick={handleAdd}
              >
                新增版本
              </Button>
            </div>

            <Table<PromptTemplateVersion>
              columns={columns}
              dataSource={versions}
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
              title={editingVersion ? "编辑模板版本" : "新增模板版本"}
              open={modalVisible}
              onOk={handleModalOk}
              onCancel={() => {
                setModalVisible(false);
                form.resetFields();
              }}
              destroyOnClose
              width={900}
            >
              <Form<PromptTemplateVersionFormValues>
                form={form}
                layout="vertical"
                preserve={false}
              >
                <Form.Item
                  label="模板"
                  name="template_id"
                  rules={[{ required: true, message: "请选择模板" }]}
                >
                  <Select
                    showSearch
                    placeholder="请选择模板"
                    optionFilterProp="children"
                    options={templates.map((t) => ({
                      value: t.id,
                      label: t.logical_key,
                    }))}
                  />
                </Form.Item>
                <Form.Item
                  label="版本号"
                  name="version"
                  rules={[{ required: true, message: "请输入版本号" }]}
                >
                  <Input placeholder="如：1.0.0, 1.1.0" />
                </Form.Item>
                <Form.Item
                  label="模板内容"
                  name="template_text"
                  rules={[{ required: true, message: "请输入模板内容" }]}
                >
                  <TextArea rows={8} placeholder="包含占位符的提示词文本，如：{{chart_json}}, {{question}}" />
                </Form.Item>
                <Form.Item label="配置 (JSON)" name="config">
                  <TextArea rows={4} placeholder='{"max_history_tokens": 4000, "style": "concise"}' />
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
                <Form.Item label="变更说明" name="changelog">
                  <TextArea rows={3} placeholder="记录本版本相较上一版改动的内容" />
                </Form.Item>
                <Form.Item label="创建者" name="created_by">
                  <Input placeholder="账号/姓名" />
                </Form.Item>
              </Form>
            </Modal>
          </div>
        </div>
      </Layout>
    </ConfigProvider>
  );
}

