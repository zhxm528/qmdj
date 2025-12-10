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

interface PromptFlowStep {
  id: string;
  flow_id: string;
  step_order: number;
  template_id: string;
  version_strategy: string;
  fixed_version_id: string | null;
  optional: boolean;
  created_at: string;
}

interface PromptFlowStepFormValues {
  flow_id?: string;
  step_order?: number;
  template_id?: string;
  version_strategy?: string;
  fixed_version_id?: string;
  optional?: boolean;
}

export default function PromptFlowStepsPage() {
  const [form] = Form.useForm<PromptFlowStepFormValues>();
  const [loading, setLoading] = useState(false);
  const [steps, setSteps] = useState<PromptFlowStep[]>([]);
  const [total, setTotal] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [modalVisible, setModalVisible] = useState(false);
  const [editingStep, setEditingStep] = useState<PromptFlowStep | null>(null);
  const [flows, setFlows] = useState<Array<{ id: string; code: string; name: string }>>([]);
  const [templates, setTemplates] = useState<Array<{ id: string; logical_key: string }>>([]);
  const [versions, setVersions] = useState<Array<{ id: string; version: string; template_id: string }>>([]);

  const loadFlows = async () => {
    try {
      const res = await fetch("/api/admin/context/prompt_flows?pageSize=-1");
      const data = await res.json();
      if (data.success && data.data) {
        setFlows(data.data);
      }
    } catch (error) {
      console.error("加载流程列表失败:", error);
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

  const loadSteps = async (page: number, size: number) => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.set("page", String(page));
      params.set("pageSize", String(size));

      const res = await fetch(`/api/admin/context/prompt_flow_steps?${params.toString()}`);
      const data = await res.json();
      if (data.success) {
        setSteps(data.data || []);
        setTotal(data.total || 0);
        setCurrentPage(page);
        setPageSize(size);
      } else {
        message.error(data.error || "加载流程步骤列表失败");
      }
    } catch (error) {
      console.error("加载流程步骤列表失败:", error);
      message.error("加载流程步骤列表失败");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSteps(1, 10);
    loadFlows();
    loadTemplates();
    loadVersions();
  }, []);

  const handleAdd = () => {
    setEditingStep(null);
    form.resetFields();
    form.setFieldsValue({ version_strategy: "latest", optional: false });
    setModalVisible(true);
  };

  const handleEdit = (record: PromptFlowStep) => {
    setEditingStep(record);
    form.setFieldsValue({
      flow_id: record.flow_id,
      step_order: record.step_order,
      template_id: record.template_id,
      version_strategy: record.version_strategy,
      fixed_version_id: record.fixed_version_id || undefined,
      optional: record.optional,
    });
    loadVersions(record.template_id);
    setModalVisible(true);
  };

  const handleDelete = async (record: PromptFlowStep) => {
    try {
      const res = await fetch(
        `/api/admin/context/prompt_flow_steps?id=${record.id}`,
        {
          method: "DELETE",
        }
      );
      const data = await res.json();
      if (data.success) {
        message.success("删除成功");
        loadSteps(currentPage, pageSize);
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
        flow_id: values.flow_id || null,
        step_order: values.step_order || null,
        template_id: values.template_id || null,
        version_strategy: values.version_strategy || "latest",
        fixed_version_id: values.version_strategy === "pinned" ? (values.fixed_version_id || null) : null,
        optional: values.optional !== undefined ? values.optional : false,
      };

      let res: Response;
      if (editingStep) {
        res = await fetch("/api/admin/context/prompt_flow_steps", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            id: editingStep.id,
            ...payload,
          }),
        });
      } else {
        res = await fetch("/api/admin/context/prompt_flow_steps", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
      }

      const data = await res.json();
      if (data.success) {
        message.success(editingStep ? "更新成功" : "创建成功");
        setModalVisible(false);
        form.resetFields();
        loadSteps(currentPage, pageSize);
      } else {
        message.error(data.error || "保存失败");
      }
    } catch (error) {
      console.error("保存失败:", error);
    }
  };

  const handlePageChange = (page: number, size: number) => {
    loadSteps(page, size);
  };

  const handleTemplateChange = (templateId: string) => {
    form.setFieldsValue({ fixed_version_id: undefined });
    loadVersions(templateId);
  };

  const handleVersionStrategyChange = (strategy: string) => {
    if (strategy !== "pinned") {
      form.setFieldsValue({ fixed_version_id: undefined });
    }
  };

  const getFlowName = (id: string) => {
    const flow = flows.find((f) => f.id === id);
    return flow ? `${flow.name} (${flow.code})` : id;
  };

  const getTemplateName = (id: string) => {
    const template = templates.find((t) => t.id === id);
    return template ? template.logical_key : id;
  };

  const getVersionName = (id: string | null) => {
    if (!id) return "-";
    const version = versions.find((v) => v.id === id);
    return version ? version.version : id;
  };

  const columns: ColumnsType<PromptFlowStep> = [
    {
      title: "ID",
      dataIndex: "id",
      key: "id",
      width: 300,
      fixed: "left",
      ellipsis: true,
    },
    {
      title: "流程",
      dataIndex: "flow_id",
      key: "flow_id",
      width: 250,
      render: (value: string) => getFlowName(value),
    },
    {
      title: "步骤顺序",
      dataIndex: "step_order",
      key: "step_order",
      width: 100,
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
      title: "版本策略",
      dataIndex: "version_strategy",
      key: "version_strategy",
      width: 120,
    },
    {
      title: "固定版本",
      dataIndex: "fixed_version_id",
      key: "fixed_version_id",
      width: 150,
      render: (value: string | null) => getVersionName(value),
    },
    {
      title: "是否可选",
      dataIndex: "optional",
      key: "optional",
      width: 100,
      render: (value: boolean) => (value ? "是" : "否"),
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
            title="确定要删除该流程步骤吗？"
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

  const versionStrategy = form.getFieldValue("version_strategy");

  return (
    <ConfigProvider locale={zhCN}>
      <Layout>
        <div className="min-h-screen bg-gradient-to-b from-amber-50 to-white py-12 px-4">
          <div className="max-w-7xl mx-auto bg-white rounded-lg shadow-md p-8">
            <div className="flex items-center justify-between mb-6">
              <h1 className="text-3xl font-bold text-gray-900">流程步骤</h1>
              <Button
                type="primary"
                icon={<PlusOutlined />}
                onClick={handleAdd}
              >
                新增步骤
              </Button>
            </div>

            <Table<PromptFlowStep>
              columns={columns}
              dataSource={steps}
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
              title={editingStep ? "编辑流程步骤" : "新增流程步骤"}
              open={modalVisible}
              onOk={handleModalOk}
              onCancel={() => {
                setModalVisible(false);
                form.resetFields();
              }}
              destroyOnClose
              width={700}
            >
              <Form<PromptFlowStepFormValues>
                form={form}
                layout="vertical"
                preserve={false}
              >
                <Form.Item
                  label="流程"
                  name="flow_id"
                  rules={[{ required: true, message: "请选择流程" }]}
                >
                  <Select
                    placeholder="请选择流程"
                    showSearch
                    optionFilterProp="label"
                    options={flows.map((f) => ({
                      value: f.id,
                      label: `${f.name} (${f.code})`,
                    }))}
                  />
                </Form.Item>
                <Form.Item
                  label="步骤顺序"
                  name="step_order"
                  rules={[
                    { required: true, message: "请输入步骤顺序" },
                    { type: "number", min: 1, message: "步骤顺序必须大于0" },
                  ]}
                >
                  <Input
                    type="number"
                    min={1}
                    placeholder="请输入步骤顺序（从1开始，按数值大小排序执行）"
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
                  label="版本策略"
                  name="version_strategy"
                  rules={[{ required: true, message: "请选择版本策略" }]}
                >
                  <Select
                    options={[
                      { value: "latest", label: "最新版本 (latest)" },
                      { value: "pinned", label: "固定版本 (pinned)" },
                    ]}
                    onChange={handleVersionStrategyChange}
                  />
                </Form.Item>
                {versionStrategy === "pinned" && (
                  <Form.Item
                    label="固定版本ID"
                    name="fixed_version_id"
                    rules={[
                      { required: true, message: "请选择固定版本" },
                    ]}
                  >
                    <Select
                      placeholder="请选择固定版本（先选择模板）"
                      showSearch
                      optionFilterProp="label"
                      disabled={!form.getFieldValue("template_id")}
                      options={filteredVersions.map((v) => ({
                        value: v.id,
                        label: v.version,
                      }))}
                    />
                  </Form.Item>
                )}
                <Form.Item
                  label="是否可选步骤"
                  name="optional"
                  valuePropName="checked"
                >
                  <Switch checkedChildren="是" unCheckedChildren="否" />
                </Form.Item>
              </Form>
            </Modal>
          </div>
        </div>
      </Layout>
    </ConfigProvider>
  );
}

