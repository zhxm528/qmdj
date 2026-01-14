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
  Card,
  Row,
  Col,
} from "antd";
import zhCN from "antd/locale/zh_CN";
import type { ColumnsType } from "antd/es/table";
import { PlusOutlined, EditOutlined, DeleteOutlined, SearchOutlined, CopyOutlined } from "@ant-design/icons";
import dayjs from "dayjs";
import ContextTimeline from "@/components/ContextTimeline";

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

interface QueryFormValues {
  logical_key?: string;
  status?: string;
  scene_code?: string;
  scope?: string;
  role?: string;
  project_id?: string;
  language?: string;
  current_version_id?: string;
}

export default function PromptTemplatesPage() {
  const [form] = Form.useForm<PromptTemplateFormValues>();
  const [queryForm] = Form.useForm<QueryFormValues>();
  const [loading, setLoading] = useState(false);
  const [templates, setTemplates] = useState<PromptTemplate[]>([]);
  const [total, setTotal] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [modalVisible, setModalVisible] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<PromptTemplate | null>(null);
  const [copyModalVisible, setCopyModalVisible] = useState(false);
  const [copyForm] = Form.useForm<{ logical_key: string; project_id?: string }>();
  const [copyingTemplate, setCopyingTemplate] = useState<PromptTemplate | null>(null);
  const [projects, setProjects] = useState<Array<{ id: string; name: string }>>([]);
  const [versions, setVersions] = useState<Array<{ id: string; version: string; template_id: string }>>([]);
  const [templateList, setTemplateList] = useState<Array<{ id: string; logical_key: string }>>([]);

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

  const loadVersions = async () => {
    try {
      const res = await fetch("/api/admin/context/prompt_template_versions?pageSize=-1");
      const data = await res.json();
      if (data.success && data.data) {
        setVersions(data.data);
      }
    } catch (error) {
      console.error("加载版本列表失败:", error);
    }
  };

  const loadTemplateList = async () => {
    try {
      const res = await fetch("/api/admin/context/prompt_templates?pageSize=-1");
      const data = await res.json();
      if (data.success && data.data) {
        setTemplateList(data.data);
      }
    } catch (error) {
      console.error("加载模板列表失败:", error);
    }
  };

  const loadTemplates = async (page: number, size: number, filters?: QueryFormValues) => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.set("page", String(page));
      params.set("pageSize", String(size));

      // 添加查询条件
      if (filters) {
        if (filters.logical_key) {
          params.set("logical_key", filters.logical_key);
        }
        if (filters.status) {
          params.set("status", filters.status);
        }
        if (filters.scene_code) {
          params.set("scene_code", filters.scene_code);
        }
        if (filters.scope) {
          params.set("scope", filters.scope);
        }
        if (filters.role) {
          params.set("role", filters.role);
        }
        if (filters.project_id) {
          params.set("project_id", filters.project_id);
        }
        if (filters.language) {
          params.set("language", filters.language);
        }
        if (filters.current_version_id) {
          params.set("current_version_id", filters.current_version_id);
        }
      }

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
    loadVersions();
    loadTemplateList();
    loadTemplates(1, 10);
  }, []);

  const handleCopyModalAfterOpenChange = (open: boolean) => {
    if (!open || !copyingTemplate) return;
    copyForm.setFieldsValue({
      logical_key: copyingTemplate.logical_key || "",
      project_id: copyingTemplate.project_id || undefined,
    });
    console.log("[prompt_templates] 复制弹窗打开后设置表单值:", {
      logical_key: copyingTemplate.logical_key || "",
      project_id: copyingTemplate.project_id || null,
    });
    console.log("[prompt_templates] 复制弹窗当前表单值:", copyForm.getFieldsValue());
  };

  // 处理 Modal 打开后的表单值设置
  const handleModalAfterOpenChange = (open: boolean) => {
    if (open) {
      console.log("[prompt_templates] Modal 打开，当前模板:", editingTemplate);
      // Modal 完全打开后，设置表单值
      // 使用 setTimeout 确保 Form 组件完全渲染和初始化
      setTimeout(() => {
        if (editingTemplate) {
          // 编辑模式：设置表单值
          const formValues = {
            logical_key: editingTemplate.logical_key || undefined,
            scope: editingTemplate.scope || undefined,
            project_id: editingTemplate.project_id || undefined,
            scene_code: editingTemplate.scene_code || undefined,
            role: editingTemplate.role || undefined,
            language: editingTemplate.language || undefined,
            description: editingTemplate.description || undefined,
            current_version_id: editingTemplate.current_version_id || undefined,
            status: editingTemplate.status || undefined,
            task_type: editingTemplate.task_type || undefined,
            sensitivity: editingTemplate.sensitivity || undefined,
            metadata: editingTemplate.metadata ? JSON.stringify(editingTemplate.metadata, null, 2) : undefined,
          };
          console.log("[prompt_templates] Modal 打开后设置表单值:", formValues);
          form.setFieldsValue(formValues);
          // 验证表单值是否设置成功
          const currentValues = form.getFieldsValue();
          console.log("[prompt_templates] 表单值已设置，当前表单值:", currentValues);
        } else {
          // 新增模式，重置表单
          form.resetFields();
          form.setFieldsValue({
            scope: "global",
            role: "system",
            language: "zh-CN",
            status: "active",
          });
        }
      }, 100);
    }
  };

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

  const handleEdit = async (record: PromptTemplate) => {
    try {
      console.log("[prompt_templates] 点击编辑按钮，模板ID:", record.id);
      // 从后端重新查询记录，确保数据最新
      const res = await fetch(`/api/admin/context/prompt_templates?id=${record.id}`);
      const data = await res.json();
      
      // 详细打印后端返回给前端的内容
      console.log("[prompt_templates] ========== 后端返回给前端的完整响应 ==========");
      console.log("[prompt_templates] 响应状态码:", res.status);
      console.log("[prompt_templates] 响应状态文本:", res.statusText);
      console.log("[prompt_templates] 响应数据 (JSON):", JSON.stringify(data, null, 2));
      console.log("[prompt_templates] 响应数据 (对象):", data);
      if (data.success) {
        console.log("[prompt_templates] success:", data.success);
        if (data.data) {
          console.log("[prompt_templates] data 字段内容:", data.data);
          console.log("[prompt_templates] data 字段类型:", typeof data.data);
          console.log("[prompt_templates] data 是否为数组:", Array.isArray(data.data));
          if (typeof data.data === "object" && !Array.isArray(data.data)) {
            console.log("[prompt_templates] data 对象的所有字段:");
            Object.keys(data.data).forEach((key) => {
              console.log(`[prompt_templates]   ${key}:`, data.data[key], `(类型: ${typeof data.data[key]})`);
            });
          }
        } else {
          console.log("[prompt_templates] data 字段为空或未定义");
        }
      } else {
        console.log("[prompt_templates] success:", data.success);
        console.log("[prompt_templates] error:", data.error);
      }
      console.log("[prompt_templates] ============================================");
      
      if (data.success && data.data) {
        const template = data.data;
        console.log("[prompt_templates] 提取的模板数据对象:", template);
        
        // 先设置 editingTemplate，然后打开 Modal
        // handleModalAfterOpenChange 会在 Modal 打开后自动设置表单值
        setEditingTemplate(template);
        setModalVisible(true);
      } else {
        message.error(data.error || "查询提示词模板信息失败");
      }
    } catch (error) {
      console.error("[prompt_templates] 查询提示词模板信息失败:", error);
      message.error("查询提示词模板信息失败");
    }
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
        const filters = queryForm.getFieldsValue();
        loadTemplates(currentPage, pageSize, filters);
      } else {
        message.error(data.error || "删除失败");
      }
    } catch (error) {
      console.error("删除失败:", error);
      message.error("删除失败");
    }
  };

  const handleCopy = (record: PromptTemplate) => {
    console.log("[prompt_templates] 点击复制按钮，当前行模板:", {
      id: record.id,
      logical_key: record.logical_key,
      project_id: record.project_id,
    });
    setCopyingTemplate(record);
    setCopyModalVisible(true);
  };

  const handleCopyOk = async () => {
    try {
      const values = await copyForm.validateFields();
      if (!copyingTemplate) return;

      // 构建复制数据，使用原记录的所有字段，但替换逻辑键和项目
      const payload: any = {
        logical_key: values.logical_key || copyingTemplate.logical_key,
        scope: copyingTemplate.scope || null,
        project_id: values.project_id || copyingTemplate.project_id || null,
        scene_code: copyingTemplate.scene_code || null,
        role: copyingTemplate.role || null,
        language: copyingTemplate.language || "zh-CN",
        description: copyingTemplate.description || null,
        current_version_id: copyingTemplate.current_version_id || null,
        status: copyingTemplate.status || "active",
        task_type: copyingTemplate.task_type || null,
        sensitivity: copyingTemplate.sensitivity || null,
        metadata: copyingTemplate.metadata || null,
      };

      const res = await fetch("/api/admin/context/prompt_templates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (data.success) {
        message.success("复制成功");
        setCopyModalVisible(false);
        copyForm.resetFields();
        setCopyingTemplate(null);
        const filters = queryForm.getFieldsValue();
        loadTemplates(currentPage, pageSize, filters);
      } else {
        message.error(data.error || "复制失败");
      }
    } catch (error) {
      console.error("复制失败:", error);
      message.error("复制失败");
    }
  };

  const handleCopyCancel = () => {
    setCopyModalVisible(false);
    copyForm.resetFields();
    setCopyingTemplate(null);
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
        const filters = queryForm.getFieldsValue();
        loadTemplates(currentPage, pageSize, filters);
      } else {
        message.error(data.error || "保存失败");
      }
    } catch (error) {
      console.error("保存失败:", error);
    }
  };

  const handlePageChange = (page: number, size: number) => {
    const filters = queryForm.getFieldsValue();
    loadTemplates(page, size, filters);
  };

  const handleSearch = () => {
    const filters = queryForm.getFieldsValue();
    loadTemplates(1, pageSize, filters);
  };

  const handleReset = () => {
    queryForm.resetFields();
    loadTemplates(1, pageSize);
  };

  const getProjectName = (projectId: string | null) => {
    if (!projectId) return "-";
    const project = projects.find((p) => p.id === projectId);
    return project ? project.name : `ID: ${projectId}`;
  };

  const getTemplateName = (templateId: string) => {
    const template = templateList.find((t) => t.id === templateId);
    return template ? template.logical_key : `ID: ${templateId}`;
  };

  const getVersionLabel = (version: { id: string; version: string; template_id: string }) => {
    const templateName = getTemplateName(version.template_id);
    return `${version.version} (${templateName})`;
  };

  const columns: ColumnsType<PromptTemplate> = [
    {
      title: "逻辑键",
      dataIndex: "logical_key",
      key: "logical_key",
      width: 300,
      ellipsis: true,
    },
    {
      title: "作用范围",
      dataIndex: "scope",
      key: "scope",
      width: 120,
    },
    {
      title: "项目",
      dataIndex: "project_id",
      key: "project_id",
      width: 200,
      ellipsis: true,
      render: (value: string | null) => getProjectName(value),
    },
    {
      title: "场景代码",
      dataIndex: "scene_code",
      key: "scene_code",
      width: 200,
      ellipsis: true,
      render: (value: string | null) => value || "-",
    },
    {
      title: "角色",
      dataIndex: "role",
      key: "role",
      width: 120,
    },
    {
      title: "语言",
      dataIndex: "language",
      key: "language",
      width: 120,
    },
    {
      title: "状态",
      dataIndex: "status",
      key: "status",
      width: 120,
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
      width: 220,
      render: (_, record) => (
        <Space size="small">
          <Button
            type="link"
            icon={<EditOutlined />}
            onClick={() => handleEdit(record)}
            style={{ padding: 0 }}
          >
            编辑
          </Button>
          <Button
            type="link"
            icon={<CopyOutlined />}
            onClick={() => handleCopy(record)}
            style={{ padding: 0 }}
          >
            复制
          </Button>
          <Popconfirm
            title="确定要删除该提示词模板吗？"
            onConfirm={() => handleDelete(record)}
          >
            <Button type="link" danger icon={<DeleteOutlined />} style={{ padding: 0 }}>
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
            {/* 时间轴导航 */}
            <ContextTimeline currentStep={1} />

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

            {/* 查询条件 */}
            <Card title="查询条件" className="mb-6">
              <Form<QueryFormValues>
                form={queryForm}
                layout="vertical"
                onFinish={handleSearch}
              >
                <Row gutter={[16, 0]}>
                  <Col xs={24} sm={12} md={6}>
                    <Form.Item name="logical_key" label="逻辑键" style={{ marginBottom: '10px' }}>
                      <Input placeholder="请输入逻辑键" />
                    </Form.Item>
                  </Col>
                  <Col xs={24} sm={12} md={6}>
                    <Form.Item name="scene_code" label="场景代码" style={{ marginBottom: '10px' }}>
                      <Input placeholder="请输入场景代码" />
                    </Form.Item>
                  </Col>
                  <Col xs={24} sm={12} md={6}>
                    <Form.Item name="scope" label="作用范围" style={{ marginBottom: '10px' }}>
                      <Select
                        placeholder="请选择作用范围"
                        allowClear
                        options={[
                          { value: "global", label: "global" },
                          { value: "project", label: "project" },
                          { value: "scene", label: "scene" },
                        ]}
                      />
                    </Form.Item>
                  </Col>
                  <Col xs={24} sm={12} md={6}>
                    <Form.Item name="status" label="状态" style={{ marginBottom: '10px' }}>
                      <Select
                        placeholder="请选择状态"
                        allowClear
                        options={[
                          { value: "active", label: "active" },
                          { value: "testing", label: "testing" },
                          { value: "deprecated", label: "deprecated" },
                        ]}
                      />
                    </Form.Item>
                  </Col>
                </Row>
                <Row gutter={[16, 0]}>
                  <Col xs={24} sm={12} md={6}>
                    <Form.Item name="role" label="角色" style={{ marginBottom: '10px' }}>
                      <Select
                        placeholder="请选择角色"
                        allowClear
                        options={[
                          { value: "system", label: "system" },
                          { value: "user", label: "user" },
                          { value: "assistant", label: "assistant" },
                          { value: "tool", label: "tool" },
                          { value: "fewshot", label: "fewshot" },
                        ]}
                      />
                    </Form.Item>
                  </Col>
                  <Col xs={24} sm={12} md={6}>
                    <Form.Item name="project_id" label="项目" style={{ marginBottom: '10px' }}>
                      <Select
                        placeholder="请选择项目"
                        allowClear
                        showSearch
                        optionFilterProp="label"
                        options={projects.map((p) => ({
                          value: p.id,
                          label: p.name,
                        }))}
                      />
                    </Form.Item>
                  </Col>
                  <Col xs={24} sm={12} md={6}>
                    <Form.Item name="language" label="语言" style={{ marginBottom: '10px' }}>
                      <Select
                        placeholder="请选择语言"
                        allowClear
                        showSearch
                        optionFilterProp="label"
                        options={[
                          { value: "zh-CN", label: "zh-CN" },
                          { value: "en-US", label: "en-US" },
                          { value: "ja-JP", label: "ja-JP" },
                          { value: "ko-KR", label: "ko-KR" },
                          { value: "fr-FR", label: "fr-FR" },
                          { value: "de-DE", label: "de-DE" },
                          { value: "es-ES", label: "es-ES" },
                        ]}
                      />
                    </Form.Item>
                  </Col>
                  <Col xs={24} sm={12} md={6}>
                    <Form.Item name="current_version_id" label="当前版本ID" style={{ marginBottom: '10px' }}>
                      <Select
                        placeholder="请选择版本"
                        allowClear
                        showSearch
                        optionFilterProp="label"
                        options={versions.map((v) => ({
                          value: v.id,
                          label: getVersionLabel(v),
                        }))}
                      />
                    </Form.Item>
                  </Col>
                </Row>
                <Row>
                  <Col span={24}>
                    <Space>
                      <Button type="primary" icon={<SearchOutlined />} onClick={handleSearch}>
                        查询
                      </Button>
                      <Button onClick={handleReset}>重置</Button>
                    </Space>
                  </Col>
                </Row>
              </Form>
            </Card>

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
              scroll={{ x: 1420 }}
            />

            <Modal
              title={editingTemplate ? "编辑提示词模板" : "新增提示词模板"}
              open={modalVisible}
              onOk={handleModalOk}
              onCancel={() => {
                setModalVisible(false);
                form.resetFields();
                setEditingTemplate(null);
              }}
              afterOpenChange={handleModalAfterOpenChange}
              maskClosable={false}
              destroyOnClose
              width={800}
              footer={[
                <Button key="close" onClick={() => {
                  setModalVisible(false);
                  form.resetFields();
                  setEditingTemplate(null);
                }}>
                  关闭
                </Button>,
                <Button key="submit" type="primary" onClick={handleModalOk}>
                  {editingTemplate ? "更新" : "创建"}
                </Button>,
              ]}
            >
              <Form<PromptTemplateFormValues>
                form={form}
                layout="vertical"
                preserve={false}
              >
                <Form.Item
                  label="逻辑键（200个字符以内）"
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
                <Form.Item label="项目（可选）" name="project_id">
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
                <Form.Item label="场景代码（100个字符以内，可选）" name="scene_code">
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
                  label="语言（20个字符以内）"
                  name="language"
                  rules={[{ required: true, message: "请输入语言" }]}
                >
                  <Input placeholder="如：zh-CN, en-US" />
                </Form.Item>
                <Form.Item label="描述（可选）" name="description">
                  <TextArea rows={3} placeholder="说明该提示词主要用途" />
                </Form.Item>
                <Form.Item label="当前版本ID（可选）" name="current_version_id">
                  <Select
                    placeholder="请选择版本（可选）"
                    allowClear
                    showSearch
                    optionFilterProp="label"
                    options={versions.map((v) => ({
                      value: v.id,
                      label: getVersionLabel(v),
                    }))}
                  />
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
                <Form.Item label="任务类型（50个字符以内，可选）" name="task_type">
                  <Input placeholder="如：analysis, classification, generation" />
                </Form.Item>
                <Form.Item label="敏感等级（50个字符以内，可选）" name="sensitivity">
                  <Input placeholder="如：low, normal, high" />
                </Form.Item>
                <Form.Item label="元数据（JSON格式，可选）" name="metadata">
                  <TextArea rows={6} placeholder='{"owner": "qmdj-team", "notes": "..."}' />
                </Form.Item>
              </Form>
            </Modal>

            {/* 复制Modal */}
            <Modal
              title="复制提示词模板"
              open={copyModalVisible}
              onOk={handleCopyOk}
              onCancel={handleCopyCancel}
              afterOpenChange={handleCopyModalAfterOpenChange}
              maskClosable={false}
              destroyOnClose
              width={600}
              footer={[
                <Button key="cancel" onClick={handleCopyCancel}>
                  取消
                </Button>,
                <Button key="submit" type="primary" onClick={handleCopyOk}>
                  确定
                </Button>,
              ]}
            >
              <Form<{ logical_key: string; project_id?: string }>
                form={copyForm}
                layout="vertical"
                preserve={false}
              >
                <Form.Item
                  label="逻辑键（200个字符以内）"
                  name="logical_key"
                  rules={[{ required: true, message: "请输入逻辑键" }]}
                >
                  <Input placeholder="如：qmdj.master.analyze_chart" />
                </Form.Item>
                <Form.Item label="项目（可选）" name="project_id">
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
              </Form>
            </Modal>
          </div>
        </div>
      </Layout>
    </ConfigProvider>
  );
}
