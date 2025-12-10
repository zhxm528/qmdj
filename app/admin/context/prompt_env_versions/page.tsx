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
  Switch,
  Space,
  Popconfirm,
  message,
} from "antd";
import zhCN from "antd/locale/zh_CN";
import type { ColumnsType } from "antd/es/table";
import { PlusOutlined, EditOutlined, DeleteOutlined } from "@ant-design/icons";
import dayjs from "dayjs";

const { TextArea } = Input;

interface PromptEnvVersion {
  id: string;
  environment_id: string;
  template_id: string;
  version_id: string;
  enabled: boolean;
  traffic_percent: number;
  created_at: string;
}

interface PromptEnvVersionFormValues {
  environment_id?: string;
  template_id?: string;
  version_id?: string;
  enabled?: boolean;
  traffic_percent?: number;
}

export default function PromptEnvVersionsPage() {
  const [form] = Form.useForm<PromptEnvVersionFormValues>();
  const [loading, setLoading] = useState(false);
  const [envVersions, setEnvVersions] = useState<PromptEnvVersion[]>([]);
  const [total, setTotal] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [modalVisible, setModalVisible] = useState(false);
  const [editingEnvVersion, setEditingEnvVersion] = useState<PromptEnvVersion | null>(null);
  const [environments, setEnvironments] = useState<Array<{ id: string; code: string; name: string }>>([]);
  const [templates, setTemplates] = useState<Array<{ id: string; logical_key: string }>>([]);
  const [versions, setVersions] = useState<Array<{ id: string; version: string; template_id: string }>>([]);

  const loadEnvironments = async () => {
    try {
      const res = await fetch("/api/admin/context/environments?pageSize=-1");
      const data = await res.json();
      if (data.success && data.data) {
        setEnvironments(data.data);
      }
    } catch (error) {
      console.error("加载环境列表失败:", error);
    }
  };

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

  const loadVersions = async (templateId?: string) => {
    try {
      let url = "/api/admin/context/prompt_template_versions?pageSize=-1";
      if (templateId) {
        url += `&template_id=${templateId}`;
      }
      const res = await fetch(url);
      const data = await res.json();
      if (data.success && data.data) {
        setVersions(data.data);
      }
    } catch (error) {
      console.error("加载版本列表失败:", error);
    }
  };

  const loadEnvVersions = async (page: number, size: number) => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.set("page", String(page));
      params.set("pageSize", String(size));

      const res = await fetch(`/api/admin/context/prompt_env_versions?${params.toString()}`);
      const data = await res.json();
      if (data.success) {
        setEnvVersions(data.data || []);
        setTotal(data.total || 0);
        setCurrentPage(page);
        setPageSize(size);
      } else {
        message.error(data.error || "加载环境版本映射列表失败");
      }
    } catch (error) {
      console.error("加载环境版本映射列表失败:", error);
      message.error("加载环境版本映射列表失败");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadEnvVersions(1, 10);
    loadEnvironments();
    loadTemplates();
    loadVersions();
  }, []);

  const handleAdd = () => {
    setEditingEnvVersion(null);
    form.resetFields();
    form.setFieldsValue({ enabled: true, traffic_percent: 100 });
    setModalVisible(true);
  };

  const handleEdit = (record: PromptEnvVersion) => {
    setEditingEnvVersion(record);
    form.setFieldsValue({
      environment_id: record.environment_id,
      template_id: record.template_id,
      version_id: record.version_id,
      enabled: record.enabled,
      traffic_percent: record.traffic_percent,
    });
    loadVersions(record.template_id);
    setModalVisible(true);
  };

  const handleDelete = async (record: PromptEnvVersion) => {
    try {
      const res = await fetch(
        `/api/admin/context/prompt_env_versions?id=${record.id}`,
        {
          method: "DELETE",
        }
      );
      const data = await res.json();
      if (data.success) {
        message.success("删除成功");
        loadEnvVersions(currentPage, pageSize);
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
      const payload: any = {
        environment_id: values.environment_id || null,
        template_id: values.template_id || null,
        version_id: values.version_id || null,
        enabled: values.enabled !== undefined ? values.enabled : true,
        traffic_percent: values.traffic_percent || 100,
      };

      let res: Response;
      if (editingEnvVersion) {
        res = await fetch("/api/admin/context/prompt_env_versions", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            id: editingEnvVersion.id,
            ...payload,
          }),
        });
      } else {
        res = await fetch("/api/admin/context/prompt_env_versions", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
      }

      const data = await res.json();
      if (data.success) {
        message.success(editingEnvVersion ? "更新成功" : "创建成功");
        setModalVisible(false);
        form.resetFields();
        loadEnvVersions(currentPage, pageSize);
      } else {
        message.error(data.error || "保存失败");
      }
    } catch (error) {
      console.error("保存失败:", error);
    }
  };

  const handlePageChange = (page: number, size: number) => {
    loadEnvVersions(page, size);
  };

  const handleTemplateChange = (templateId: string) => {
    form.setFieldsValue({ version_id: undefined });
    loadVersions(templateId);
  };

  const getEnvironmentName = (id: string) => {
    const env = environments.find((e) => e.id === id);
    return env ? `${env.name} (${env.code})` : id;
  };

  const getTemplateName = (id: string) => {
    const template = templates.find((t) => t.id === id);
    return template ? template.logical_key : id;
  };

  const getVersionName = (id: string) => {
    const version = versions.find((v) => v.id === id);
    return version ? version.version : id;
  };

  const columns: ColumnsType<PromptEnvVersion> = [
    {
      title: "ID",
      dataIndex: "id",
      key: "id",
      width: 300,
      fixed: "left",
      ellipsis: true,
    },
    {
      title: "环境",
      dataIndex: "environment_id",
      key: "environment_id",
      width: 150,
      render: (value: string) => getEnvironmentName(value),
    },
    {
      title: "模板",
      dataIndex: "template_id",
      key: "template_id",
      width: 300,
      ellipsis: true,
      render: (value: string) => getTemplateName(value),
    },
    {
      title: "版本",
      dataIndex: "version_id",
      key: "version_id",
      width: 150,
      render: (value: string) => getVersionName(value),
    },
    {
      title: "是否启用",
      dataIndex: "enabled",
      key: "enabled",
      width: 100,
      render: (value: boolean) => (value ? "是" : "否"),
    },
    {
      title: "流量权重",
      dataIndex: "traffic_percent",
      key: "traffic_percent",
      width: 120,
      render: (value: number) => `${value}%`,
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
            title="确定要删除该环境版本映射吗？"
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

  const filteredVersions = form.getFieldValue("template_id")
    ? versions.filter((v) => v.template_id === form.getFieldValue("template_id"))
    : versions;

  return (
    <ConfigProvider locale={zhCN}>
      <Layout>
        <div className="min-h-screen bg-gradient-to-b from-amber-50 to-white py-12 px-4">
          <div className="max-w-7xl mx-auto bg-white rounded-lg shadow-md p-8">
            <div className="flex items-center justify-between mb-6">
              <h1 className="text-3xl font-bold text-gray-900">环境版本映射</h1>
              <Button
                type="primary"
                icon={<PlusOutlined />}
                onClick={handleAdd}
              >
                新增映射
              </Button>
            </div>

            <Table<PromptEnvVersion>
              columns={columns}
              dataSource={envVersions}
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
              title={editingEnvVersion ? "编辑环境版本映射" : "新增环境版本映射"}
              open={modalVisible}
              onOk={handleModalOk}
              onCancel={() => {
                setModalVisible(false);
                form.resetFields();
              }}
              destroyOnClose
              width={700}
            >
              <Form<PromptEnvVersionFormValues>
                form={form}
                layout="vertical"
                preserve={false}
              >
                <Form.Item
                  label="环境"
                  name="environment_id"
                  rules={[{ required: true, message: "请选择环境" }]}
                >
                  <Select
                    placeholder="请选择环境"
                    showSearch
                    optionFilterProp="label"
                    options={environments.map((e) => ({
                      value: e.id,
                      label: `${e.name} (${e.code})`,
                    }))}
                  />
                </Form.Item>
                <Form.Item
                  label="模板"
                  name="template_id"
                  rules={[{ required: true, message: "请选择模板" }]}
                >
                  <Select
                    placeholder="请选择模板"
                    showSearch
                    optionFilterProp="label"
                    onChange={handleTemplateChange}
                    options={templates.map((t) => ({
                      value: t.id,
                      label: t.logical_key || t.id,
                    }))}
                  />
                </Form.Item>
                <Form.Item
                  label="版本"
                  name="version_id"
                  rules={[{ required: true, message: "请选择版本" }]}
                >
                  <Select
                    placeholder="请选择版本（先选择模板）"
                    showSearch
                    optionFilterProp="label"
                    disabled={!form.getFieldValue("template_id")}
                    options={filteredVersions.map((v) => ({
                      value: v.id,
                      label: v.version,
                    }))}
                  />
                </Form.Item>
                <Form.Item
                  label="是否启用"
                  name="enabled"
                  valuePropName="checked"
                >
                  <Switch checkedChildren="是" unCheckedChildren="否" />
                </Form.Item>
                <Form.Item
                  label="流量权重"
                  name="traffic_percent"
                  rules={[
                    { required: true, message: "请输入流量权重" },
                    { type: "number", min: 0, max: 100, message: "流量权重必须在0-100之间" },
                  ]}
                >
                  <Input
                    type="number"
                    min={0}
                    max={100}
                    placeholder="请输入流量权重（0-100，用于A/B测试）"
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

