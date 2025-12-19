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
import { PlusOutlined, EditOutlined, DeleteOutlined, SearchOutlined } from "@ant-design/icons";
import dayjs from "dayjs";
import ContextTimeline from "@/components/ContextTimeline";

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
  updated_at: string | null;
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

interface QueryFormValues {
  template_logical_key?: string;
  status?: string;
}

export default function PromptTemplateVersionsPage() {
  const [form] = Form.useForm<PromptTemplateVersionFormValues>();
  const [queryForm] = Form.useForm<QueryFormValues>();
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

  const loadVersions = async (page: number, size: number, filters?: QueryFormValues) => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.set("page", String(page));
      params.set("pageSize", String(size));

      // 添加查询条件
      if (filters) {
        if (filters.template_logical_key) {
          params.set("template_logical_key", filters.template_logical_key);
        }
        if (filters.status) {
          params.set("status", filters.status);
        }
      }

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

  // 处理 Modal 打开后的表单值设置
  const handleModalAfterOpenChange = (open: boolean) => {
    if (open) {
      console.log("[prompt_template_versions] Modal 打开，当前版本:", editingVersion);
      // Modal 完全打开后，设置表单值
      // 使用 setTimeout 确保 Form 组件完全渲染和初始化
      setTimeout(() => {
        if (editingVersion) {
          // 编辑模式：设置表单值
          // 将模板内容中的 \n 字符串转换为实际的换行符
          let templateText = editingVersion.template_text || undefined;
          if (templateText) {
            // 将字符串 "\n" 转换为实际的换行符
            templateText = templateText.replace(/\\n/g, "\n");
          }
          
          const formValues = {
            template_id: editingVersion.template_id || undefined,
            version: editingVersion.version || undefined,
            template_text: templateText,
            config: editingVersion.config ? JSON.stringify(editingVersion.config, null, 2) : undefined,
            status: editingVersion.status || undefined,
            changelog: editingVersion.changelog || undefined,
            created_by: editingVersion.created_by || undefined,
          };
          console.log("[prompt_template_versions] Modal 打开后设置表单值:", formValues);
          form.setFieldsValue(formValues);
          // 验证表单值是否设置成功
          const currentValues = form.getFieldsValue();
          console.log("[prompt_template_versions] 表单值已设置，当前表单值:", currentValues);
        } else {
          // 新增模式，重置表单
          form.resetFields();
          form.setFieldsValue({
            status: "active",
          });
        }
      }, 100);
    }
  };

  const handleAdd = () => {
    setEditingVersion(null);
    form.resetFields();
    form.setFieldsValue({
      status: "active",
    });
    setModalVisible(true);
  };

  const handleEdit = async (record: PromptTemplateVersion) => {
    try {
      console.log("[prompt_template_versions] 点击编辑按钮，版本ID:", record.id);
      // 从后端重新查询记录，确保数据最新
      const res = await fetch(`/api/admin/context/prompt_template_versions?id=${record.id}`);
      const data = await res.json();
      
      // 详细打印后端返回给前端的内容
      console.log("[prompt_template_versions] ========== 后端返回给前端的完整响应 ==========");
      console.log("[prompt_template_versions] 响应状态码:", res.status);
      console.log("[prompt_template_versions] 响应状态文本:", res.statusText);
      console.log("[prompt_template_versions] 响应数据 (JSON):", JSON.stringify(data, null, 2));
      console.log("[prompt_template_versions] 响应数据 (对象):", data);
      if (data.success) {
        console.log("[prompt_template_versions] success:", data.success);
        if (data.data) {
          console.log("[prompt_template_versions] data 字段内容:", data.data);
          console.log("[prompt_template_versions] data 字段类型:", typeof data.data);
          console.log("[prompt_template_versions] data 是否为数组:", Array.isArray(data.data));
          if (typeof data.data === "object" && !Array.isArray(data.data)) {
            console.log("[prompt_template_versions] data 对象的所有字段:");
            Object.keys(data.data).forEach((key) => {
              console.log(`[prompt_template_versions]   ${key}:`, data.data[key], `(类型: ${typeof data.data[key]})`);
            });
          }
        } else {
          console.log("[prompt_template_versions] data 字段为空或未定义");
        }
      } else {
        console.log("[prompt_template_versions] success:", data.success);
        console.log("[prompt_template_versions] error:", data.error);
      }
      console.log("[prompt_template_versions] ============================================");
      
      if (data.success && data.data) {
        const version = data.data;
        console.log("[prompt_template_versions] 提取的版本数据对象:", version);
        
        // 先设置 editingVersion，然后打开 Modal
        // handleModalAfterOpenChange 会在 Modal 打开后自动设置表单值
        setEditingVersion(version);
        setModalVisible(true);
      } else {
        message.error(data.error || "查询模板版本信息失败");
      }
    } catch (error) {
      console.error("[prompt_template_versions] 查询模板版本信息失败:", error);
      message.error("查询模板版本信息失败");
    }
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
        const filters = queryForm.getFieldsValue();
        loadVersions(currentPage, pageSize, filters);
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

      // 将模板内容中的换行符转换为 \n 字符串
      let templateText = values.template_text || null;
      if (templateText) {
        // 将实际的换行符（\r\n 或 \n）转换为字符串 "\n"
        templateText = templateText.replace(/\r\n/g, "\\n").replace(/\n/g, "\\n");
      }

      const payload: any = {
        template_id: values.template_id || null,
        version: values.version || null,
        template_text: templateText,
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
        const filters = queryForm.getFieldsValue();
        loadVersions(currentPage, pageSize, filters);
      } else {
        message.error(data.error || "保存失败");
      }
    } catch (error) {
      console.error("保存失败:", error);
    }
  };

  const handlePageChange = (page: number, size: number) => {
    const filters = queryForm.getFieldsValue();
    loadVersions(page, size, filters);
  };

  const handleSearch = () => {
    const filters = queryForm.getFieldsValue();
    loadVersions(1, pageSize, filters);
  };

  const handleReset = () => {
    queryForm.resetFields();
    loadVersions(1, pageSize);
  };

  const getTemplateName = (templateId: string) => {
    const template = templates.find((t) => t.id === templateId);
    return template ? template.logical_key : `ID: ${templateId}`;
  };

  const columns: ColumnsType<PromptTemplateVersion> = [
    {
      title: "模板",
      dataIndex: "template_id",
      key: "template_id",
      width: 300,
      ellipsis: true,
      render: (value: string) => getTemplateName(value),
    },
    {
      title: "版本号",
      dataIndex: "version",
      key: "version",
      width: 150,
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
      title: "更新时间",
      dataIndex: "updated_at",
      key: "updated_at",
      width: 180,
      render: (value: string | null) =>
        value ? dayjs(value).format("YYYY-MM-DD HH:mm:ss") : "-",
    },
    {
      title: "操作",
      key: "action",
      fixed: "right",
      width: 160,
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
          <Popconfirm
            title="确定要删除该模板版本吗？"
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
            <ContextTimeline currentStep={2} />

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

            {/* 查询条件 */}
            <Card title="查询条件" className="mb-6">
              <Form<QueryFormValues>
                form={queryForm}
                layout="vertical"
                onFinish={handleSearch}
              >
                <Row gutter={[16, 0]}>
                  <Col xs={24} sm={12} md={6}>
                    <Form.Item name="template_logical_key" label="模板" style={{ marginBottom: '10px' }}>
                      <Input placeholder="请输入模板逻辑键" />
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
              scroll={{ x: 1090 }}
            />

            <Modal
              title={editingVersion ? "编辑模板版本" : "新增模板版本"}
              open={modalVisible}
              onOk={handleModalOk}
              onCancel={() => {
                setModalVisible(false);
                form.resetFields();
                setEditingVersion(null);
              }}
              afterOpenChange={handleModalAfterOpenChange}
              maskClosable={false}
              destroyOnClose
              width={900}
              footer={[
                <Button key="close" onClick={() => {
                  setModalVisible(false);
                  form.resetFields();
                  setEditingVersion(null);
                }}>
                  关闭
                </Button>,
                <Button key="submit" type="primary" onClick={handleModalOk}>
                  {editingVersion ? "更新" : "创建"}
                </Button>,
              ]}
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

