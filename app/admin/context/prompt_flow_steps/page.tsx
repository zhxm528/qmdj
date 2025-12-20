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

interface QueryFormValues {
  flow_id?: string;
  template_id?: string; // 改为模板ID，下拉选择
  version_strategy?: string;
  fixed_version_id?: string; // 改为固定版本ID，下拉选择
}

export default function PromptFlowStepsPage() {
  const [form] = Form.useForm<PromptFlowStepFormValues>();
  const [queryForm] = Form.useForm<QueryFormValues>();
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
  const [queryVersions, setQueryVersions] = useState<Array<{ id: string; version: string; template_id: string }>>([]);

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

  const loadVersions = async (templateId?: string): Promise<void> => {
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

  const loadSteps = async (page: number, size: number, filters?: QueryFormValues) => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.set("page", String(page));
      params.set("pageSize", String(size));

      // 添加查询条件
      if (filters) {
        if (filters.flow_id) {
          params.set("flow_id", filters.flow_id);
        }
        if (filters.template_id) {
          params.set("template_id", filters.template_id);
        }
        if (filters.version_strategy) {
          params.set("version_strategy", filters.version_strategy);
        }
        if (filters.fixed_version_id) {
          params.set("fixed_version_id", filters.fixed_version_id);
        }
      }

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

  // 处理 Modal 打开后的表单值设置
  const handleModalAfterOpenChange = async (open: boolean) => {
    if (open) {
      console.log("[prompt_flow_steps] Modal 打开，当前步骤:", editingStep);
      // Modal 完全打开后，设置表单值
      // 使用 setTimeout 确保 Form 组件完全渲染和初始化
      setTimeout(async () => {
        if (editingStep) {
          // 编辑模式：先设置基础字段
          form.setFieldsValue({
            flow_id: editingStep.flow_id || undefined,
            step_order: editingStep.step_order || undefined,
            template_id: editingStep.template_id || undefined,
            version_strategy: editingStep.version_strategy || "latest",
            optional: editingStep.optional !== undefined ? editingStep.optional : false,
          });
          
          // 如果有模板ID，先加载版本列表
          if (editingStep.template_id) {
            await loadVersions(editingStep.template_id);
            // 等待一个渲染周期，确保 filteredVersions 已更新
            await new Promise(resolve => setTimeout(resolve, 50));
          }
          
          // 在版本列表加载完成后，再设置 fixed_version_id
          if (editingStep.fixed_version_id) {
            form.setFieldsValue({
              fixed_version_id: editingStep.fixed_version_id,
            });
          }
          
          console.log("[prompt_flow_steps] Modal 打开后设置表单值完成");
          // 验证表单值是否设置成功
          const currentValues = form.getFieldsValue();
          console.log("[prompt_flow_steps] 表单值已设置，当前表单值:", currentValues);
        } else {
          // 新增模式，重置表单
          form.resetFields();
          form.setFieldsValue({ version_strategy: "latest", optional: false });
        }
      }, 100);
    }
  };

  const handleAdd = () => {
    setEditingStep(null);
    form.resetFields();
    form.setFieldsValue({ version_strategy: "latest", optional: false });
    setModalVisible(true);
  };

  const handleEdit = async (record: PromptFlowStep) => {
    try {
      console.log("[prompt_flow_steps] 点击编辑按钮，步骤ID:", record.id);
      // 从后端重新查询记录，确保数据最新
      const res = await fetch(`/api/admin/context/prompt_flow_steps?id=${record.id}`);
      const data = await res.json();
      
      // 详细打印后端返回给前端的内容
      console.log("[prompt_flow_steps] ========== 后端返回给前端的完整响应 ==========");
      console.log("[prompt_flow_steps] 响应状态码:", res.status);
      console.log("[prompt_flow_steps] 响应状态文本:", res.statusText);
      console.log("[prompt_flow_steps] 响应数据 (JSON):", JSON.stringify(data, null, 2));
      console.log("[prompt_flow_steps] 响应数据 (对象):", data);
      if (data.success) {
        console.log("[prompt_flow_steps] success:", data.success);
        if (data.data) {
          console.log("[prompt_flow_steps] data 字段内容:", data.data);
          console.log("[prompt_flow_steps] data 字段类型:", typeof data.data);
          console.log("[prompt_flow_steps] data 是否为数组:", Array.isArray(data.data));
          if (typeof data.data === "object" && !Array.isArray(data.data)) {
            console.log("[prompt_flow_steps] data 对象的所有字段:");
            Object.keys(data.data).forEach((key) => {
              console.log(`[prompt_flow_steps]   ${key}:`, data.data[key], `(类型: ${typeof data.data[key]})`);
            });
          }
        } else {
          console.log("[prompt_flow_steps] data 字段为空或未定义");
        }
      } else {
        console.log("[prompt_flow_steps] success:", data.success);
        console.log("[prompt_flow_steps] error:", data.error);
      }
      console.log("[prompt_flow_steps] ============================================");
      
      if (data.success && data.data) {
        const step = data.data;
        console.log("[prompt_flow_steps] 提取的步骤数据对象:", step);
        
        // 先设置 editingStep，然后打开 Modal
        // handleModalAfterOpenChange 会在 Modal 打开后自动设置表单值
        setEditingStep(step);
        setModalVisible(true);
      } else {
        message.error(data.error || "查询流程步骤信息失败");
      }
    } catch (error) {
      console.error("[prompt_flow_steps] 查询流程步骤信息失败:", error);
      message.error("查询流程步骤信息失败");
    }
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
        const filters = queryForm.getFieldsValue();
        loadSteps(currentPage, pageSize, filters);
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
      // 确保步骤顺序是整数
      const stepOrder = values.step_order !== undefined && values.step_order !== null 
        ? parseInt(String(values.step_order), 10) 
        : null;
      
      const payload: any = {
        flow_id: values.flow_id || null,
        step_order: stepOrder,
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
        const filters = queryForm.getFieldsValue();
        loadSteps(currentPage, pageSize, filters);
      } else {
        message.error(data.error || "保存失败");
      }
    } catch (error) {
      console.error("保存失败:", error);
    }
  };

  const handlePageChange = (page: number, size: number) => {
    const filters = queryForm.getFieldsValue();
    loadSteps(page, size, filters);
  };

  const handleSearch = () => {
    const filters = queryForm.getFieldsValue();
    loadSteps(1, pageSize, filters);
  };

  const handleReset = () => {
    queryForm.resetFields();
    loadSteps(1, pageSize);
  };

  const handleTemplateChange = (templateId: string) => {
    form.setFieldsValue({ fixed_version_id: undefined });
    loadVersions(templateId);
  };

  // 查询条件中模板改变时的处理
  const handleQueryTemplateChange = async (templateId: string) => {
    queryForm.setFieldsValue({ fixed_version_id: undefined });
    if (templateId) {
      // 加载该模板关联的版本列表
      try {
        const res = await fetch(`/api/admin/context/prompt_template_versions?pageSize=-1&template_id=${templateId}`);
        const data = await res.json();
        if (data.success && data.data) {
          setQueryVersions(data.data);
        } else {
          setQueryVersions([]);
        }
      } catch (error) {
        console.error("加载查询条件版本列表失败:", error);
        setQueryVersions([]);
      }
    } else {
      setQueryVersions([]);
    }
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
      title: "流程",
      dataIndex: "flow_id",
      key: "flow_id",
      width: 300,
      ellipsis: true,
      render: (value: string) => getFlowName(value),
    },
    {
      title: "步骤顺序",
      dataIndex: "step_order",
      key: "step_order",
      width: 120,
    },
    {
      title: "模板",
      dataIndex: "template_id",
      key: "template_id",
      width: 350,
      ellipsis: true,
      render: (value: string) => getTemplateName(value),
    },
    {
      title: "版本策略",
      dataIndex: "version_strategy",
      key: "version_strategy",
      width: 150,
      render: (value: string) => {
        if (value === "pinned") return "固定版本";
        if (value === "latest") return "最新版本";
        return value;
      },
    },
    {
      title: "固定版本",
      dataIndex: "fixed_version_id",
      key: "fixed_version_id",
      width: 200,
      ellipsis: true,
      render: (value: string | null) => getVersionName(value),
    },
    {
      title: "是否可选",
      dataIndex: "optional",
      key: "optional",
      width: 120,
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
            title="确定要删除该流程步骤吗？"
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

  // 使用 Form.useWatch 实时监听模板ID和版本策略的变化
  const templateId = Form.useWatch("template_id", form);
  const versionStrategy = Form.useWatch("version_strategy", form);

  // 只显示与选中模板关联的版本
  const filteredVersions = templateId
    ? versions.filter((v) => v.template_id === templateId)
    : [];

  // 查询条件中的模板ID和固定版本联动
  const queryTemplateId = Form.useWatch("template_id", queryForm);
  // 只显示与选中模板关联的版本
  const filteredQueryVersions = queryTemplateId
    ? queryVersions.filter((v) => v.template_id === queryTemplateId)
    : [];

  return (
    <ConfigProvider locale={zhCN}>
      <Layout>
        <div className="min-h-screen bg-gradient-to-b from-amber-50 to-white py-12 px-4">
          <div className="max-w-7xl mx-auto bg-white rounded-lg shadow-md p-8">
            {/* 时间轴导航 */}
            <ContextTimeline currentStep={4} />

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

            {/* 查询条件 */}
            <Card title="查询条件" className="mb-6">
              <Form<QueryFormValues>
                form={queryForm}
                layout="vertical"
                onFinish={handleSearch}
              >
                <Row gutter={[16, 0]}>
                  <Col xs={24} sm={12} md={6}>
                    <Form.Item name="flow_id" label="流程" style={{ marginBottom: '10px' }}>
                      <Select
                        placeholder="请选择流程"
                        allowClear
                        showSearch
                        optionFilterProp="label"
                        options={flows.map((f) => ({
                          value: f.id,
                          label: `${f.name} (${f.code})`,
                        }))}
                      />
                    </Form.Item>
                  </Col>
                  <Col xs={24} sm={12} md={6}>
                    <Form.Item name="template_id" label="模板" style={{ marginBottom: '10px' }}>
                      <Select
                        placeholder="请选择模板"
                        allowClear
                        showSearch
                        optionFilterProp="label"
                        onChange={handleQueryTemplateChange}
                        options={templates.map((t) => ({
                          value: t.id,
                          label: t.logical_key || t.id,
                        }))}
                      />
                    </Form.Item>
                  </Col>
                  <Col xs={24} sm={12} md={6}>
                    <Form.Item name="version_strategy" label="版本策略" style={{ marginBottom: '10px' }}>
                      <Select
                        placeholder="请选择版本策略"
                        allowClear
                        options={[
                          { value: "latest", label: "最新版本" },
                          { value: "pinned", label: "固定版本" },
                        ]}
                      />
                    </Form.Item>
                  </Col>
                  <Col xs={24} sm={12} md={6}>
                    <Form.Item name="fixed_version_id" label="固定版本" style={{ marginBottom: '10px' }}>
                      <Select
                        placeholder="请选择固定版本（先选择模板）"
                        allowClear
                        showSearch
                        optionFilterProp="label"
                        disabled={!queryTemplateId}
                        options={filteredQueryVersions.map((v) => ({
                          value: v.id,
                          label: v.version,
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
              scroll={{ x: 1420 }}
            />

            <Modal
              title={editingStep ? "编辑流程步骤" : "新增流程步骤"}
              open={modalVisible}
              onOk={handleModalOk}
              onCancel={() => {
                setModalVisible(false);
                form.resetFields();
                setEditingStep(null);
              }}
              afterOpenChange={handleModalAfterOpenChange}
              maskClosable={false}
              destroyOnClose
              width={700}
              footer={[
                <Button key="close" onClick={() => {
                  setModalVisible(false);
                  form.resetFields();
                  setEditingStep(null);
                }}>
                  关闭
                </Button>,
                <Button key="submit" type="primary" onClick={handleModalOk}>
                  {editingStep ? "更新" : "创建"}
                </Button>,
              ]}
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
                    {
                      validator: (_, value) => {
                        if (value === undefined || value === null || value === "") {
                          return Promise.reject(new Error("请输入步骤顺序"));
                        }
                        const numValue = Number(value);
                        if (isNaN(numValue)) {
                          return Promise.reject(new Error("步骤顺序必须是数字"));
                        }
                        if (!Number.isInteger(numValue)) {
                          return Promise.reject(new Error("步骤顺序必须是正整数"));
                        }
                        if (numValue < 1) {
                          return Promise.reject(new Error("步骤顺序必须大于0"));
                        }
                        return Promise.resolve();
                      },
                    },
                  ]}
                >
                  <Input
                    type="number"
                    min={1}
                    step={1}
                    placeholder="请输入步骤顺序（从1开始，按数值大小排序执行）"
                    onKeyPress={(e) => {
                      // 阻止输入非数字字符（除了退格、删除、Tab等）
                      if (!/[0-9]/.test(e.key) && !['Backspace', 'Delete', 'Tab', 'ArrowLeft', 'ArrowRight'].includes(e.key)) {
                        e.preventDefault();
                      }
                    }}
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
                    label="固定版本"
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

