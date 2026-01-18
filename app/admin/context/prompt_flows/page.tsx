"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import AdminLayout from "@/components/admin/AdminLayout";
import AdminBreadcrumb from "@/components/admin/AdminBreadcrumb";
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

interface PromptFlow {
  id: string;
  project_id: string | null;
  code: string;
  name: string;
  description: string | null;
  created_at: string;
}

interface PromptFlowFormValues {
  project_id?: string;
  code?: string;
  name?: string;
  description?: string;
}

interface QueryFormValues {
  code?: string;
  name?: string;
}

export default function PromptFlowsPage() {
  const [form] = Form.useForm<PromptFlowFormValues>();
  const [queryForm] = Form.useForm<QueryFormValues>();
  const [loading, setLoading] = useState(false);
  const [flows, setFlows] = useState<PromptFlow[]>([]);
  const [total, setTotal] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [modalVisible, setModalVisible] = useState(false);
  const [editingFlow, setEditingFlow] = useState<PromptFlow | null>(null);
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

  const loadFlows = async (page: number, size: number, filters?: QueryFormValues) => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.set("page", String(page));
      params.set("pageSize", String(size));

      // 添加查询条件
      if (filters) {
        if (filters.code) {
          params.set("code", filters.code);
        }
        if (filters.name) {
          params.set("name", filters.name);
        }
      }

      const res = await fetch(`/api/admin/context/prompt_flows?${params.toString()}`);
      const data = await res.json();
      if (data.success) {
        setFlows(data.data || []);
        setTotal(data.total || 0);
        setCurrentPage(page);
        setPageSize(size);
      } else {
        message.error(data.error || "加载流程列表失败");
      }
    } catch (error) {
      console.error("加载流程列表失败:", error);
      message.error("加载流程列表失败");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadFlows(1, 10);
    loadProjects();
  }, []);

  // 处理 Modal 打开后的表单值设置
  const handleModalAfterOpenChange = (open: boolean) => {
    if (open) {
      console.log("[prompt_flows] Modal 打开，当前流程:", editingFlow);
      // Modal 完全打开后，设置表单值
      // 使用 setTimeout 确保 Form 组件完全渲染和初始化
      setTimeout(() => {
        if (editingFlow) {
          // 编辑模式：设置表单值
          const formValues = {
            project_id: editingFlow.project_id || undefined,
            code: editingFlow.code || undefined,
            name: editingFlow.name || undefined,
            description: editingFlow.description || undefined,
          };
          console.log("[prompt_flows] Modal 打开后设置表单值:", formValues);
          form.setFieldsValue(formValues);
          // 验证表单值是否设置成功
          const currentValues = form.getFieldsValue();
          console.log("[prompt_flows] 表单值已设置，当前表单值:", currentValues);
          console.log("[prompt_flows] 表单值设置验证:", {
            project_id: currentValues.project_id === formValues.project_id,
            code: currentValues.code === formValues.code,
            name: currentValues.name === formValues.name,
            description: currentValues.description === formValues.description,
          });
        } else {
          // 新增模式，重置表单
          form.resetFields();
        }
      }, 100);
    }
  };

  const handleAdd = () => {
    setEditingFlow(null);
    form.resetFields();
    setModalVisible(true);
  };

  const handleEdit = async (record: PromptFlow) => {
    try {
      console.log("[prompt_flows] 点击编辑按钮，流程ID:", record.id);
      // 从后端重新查询记录，确保数据最新
      const res = await fetch(`/api/admin/context/prompt_flows?id=${record.id}`);
      const data = await res.json();
      
      // 详细打印后端返回给前端的内容
      console.log("[prompt_flows] ========== 后端返回给前端的完整响应 ==========");
      console.log("[prompt_flows] 响应状态码:", res.status);
      console.log("[prompt_flows] 响应状态文本:", res.statusText);
      console.log("[prompt_flows] 响应数据 (JSON):", JSON.stringify(data, null, 2));
      console.log("[prompt_flows] 响应数据 (对象):", data);
      if (data.success) {
        console.log("[prompt_flows] success:", data.success);
        if (data.data) {
          console.log("[prompt_flows] data 字段内容:", data.data);
          console.log("[prompt_flows] data 字段类型:", typeof data.data);
          console.log("[prompt_flows] data 是否为数组:", Array.isArray(data.data));
          if (typeof data.data === "object" && !Array.isArray(data.data)) {
            console.log("[prompt_flows] data 对象的所有字段:");
            Object.keys(data.data).forEach((key) => {
              console.log(`[prompt_flows]   ${key}:`, data.data[key], `(类型: ${typeof data.data[key]})`);
            });
          }
        } else {
          console.log("[prompt_flows] data 字段为空或未定义");
        }
      } else {
        console.log("[prompt_flows] success:", data.success);
        console.log("[prompt_flows] error:", data.error);
      }
      console.log("[prompt_flows] ============================================");
      
      if (data.success && data.data) {
        const flow = data.data;
        console.log("[prompt_flows] 提取的流程数据对象:", flow);
        
        // 先设置 editingFlow，然后打开 Modal
        // handleModalAfterOpenChange 会在 Modal 打开后自动设置表单值
        setEditingFlow(flow);
        setModalVisible(true);
      } else {
        message.error(data.error || "查询流程信息失败");
      }
    } catch (error) {
      console.error("[prompt_flows] 查询流程信息失败:", error);
      message.error("查询流程信息失败");
    }
  };

  const handleDelete = async (record: PromptFlow) => {
    try {
      const res = await fetch(
        `/api/admin/context/prompt_flows?id=${record.id}`,
        {
          method: "DELETE",
        }
      );
      const data = await res.json();
      if (data.success) {
        message.success("删除成功");
        const filters = queryForm.getFieldsValue();
        loadFlows(currentPage, pageSize, filters);
      } else {
        message.error(data.error || "删除失败");
      }
    } catch (error) {
      console.error("删除失败:", error);
      message.error("删除失败");
    }
  };

  const handleCopy = (record: PromptFlow) => {
    Modal.confirm({
      title: "复制流程",
      content: "复制流程，同时也复制流程下的所有步骤",
      okText: "确定",
      cancelText: "取消",
      onOk: async () => {
        try {
          const res = await fetch("/api/admin/context/prompt_flows", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              copy_from_id: record.id,
            }),
          });
          const data = await res.json();
          if (data.success) {
            message.success("复制成功");
            const filters = queryForm.getFieldsValue();
            loadFlows(currentPage, pageSize, filters);
          } else {
            message.error(data.error || "复制失败");
          }
        } catch (error) {
          console.error("复制失败:", error);
          message.error("复制失败");
        }
      },
    });
  };

  const handleModalOk = async () => {
    try {
      const values = await form.validateFields();
      const payload: any = {
        project_id: values.project_id || null,
        code: values.code || null,
        name: values.name || null,
        description: values.description || null,
      };

      let res: Response;
      if (editingFlow) {
        res = await fetch("/api/admin/context/prompt_flows", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            id: editingFlow.id,
            ...payload,
          }),
        });
      } else {
        res = await fetch("/api/admin/context/prompt_flows", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
      }

      const data = await res.json();
      if (data.success) {
        message.success(editingFlow ? "更新成功" : "创建成功");
        setModalVisible(false);
        form.resetFields();
        const filters = queryForm.getFieldsValue();
        loadFlows(currentPage, pageSize, filters);
      } else {
        message.error(data.error || "保存失败");
      }
    } catch (error) {
      console.error("保存失败:", error);
    }
  };

  const handlePageChange = (page: number, size: number) => {
    const filters = queryForm.getFieldsValue();
    loadFlows(page, size, filters);
  };

  const handleSearch = () => {
    const filters = queryForm.getFieldsValue();
    loadFlows(1, pageSize, filters);
  };

  const handleReset = () => {
    queryForm.resetFields();
    loadFlows(1, pageSize);
  };

  const getProjectName = (id: string | null) => {
    if (!id) return "全局流程";
    const project = projects.find((p) => p.id === id);
    return project ? project.name : id;
  };

  const columns: ColumnsType<PromptFlow> = [
    {
      title: "所属项目",
      dataIndex: "project_id",
      key: "project_id",
      width: 250,
      ellipsis: true,
      render: (value: string | null) => getProjectName(value),
    },
    {
      title: "流程代码",
      dataIndex: "code",
      key: "code",
      width: 350,
      ellipsis: true,
    },
    {
      title: "流程名称",
      dataIndex: "name",
      key: "name",
      width: 350,
      ellipsis: true,
      render: (value: string, record: PromptFlow) => (
        <Link
          href={`/admin/context/prompt_flow_steps?flow_id=${record.id}`}
          className="text-amber-600 hover:text-amber-700 hover:underline"
        >
          {value}
        </Link>
      ),
    },
    {
      title: "描述",
      dataIndex: "description",
      key: "description",
      width: 600,
      ellipsis: true,
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
            title="确定要删除该流程吗？"
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
      <AdminLayout>
        <div className="min-h-screen bg-[var(--color-surface)] py-12 px-4">
          <div className="w-full bg-[var(--color-card-bg)] rounded-lg shadow-md p-8">
            {/* 时间轴导航 */}
            <ContextTimeline currentStep={3} />

            <div className="flex items-center justify-between mb-6">
              <AdminBreadcrumb title="流程" />
              <Button
                type="primary"
                icon={<PlusOutlined />}
                onClick={handleAdd}
              >
                新增流程
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
                    <Form.Item name="code" label="流程代码" style={{ marginBottom: '10px' }}>
                      <Input placeholder="请输入流程代码" />
                    </Form.Item>
                  </Col>
                  <Col xs={24} sm={12} md={6}>
                    <Form.Item name="name" label="流程名称" style={{ marginBottom: '10px' }}>
                      <Input placeholder="请输入流程名称" />
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

            <Table<PromptFlow>
              columns={columns}
              dataSource={flows}
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
              scroll={{ x: 1540 }}
            />

            <Modal
              title={editingFlow ? "编辑流程" : "新增流程"}
              open={modalVisible}
              onOk={handleModalOk}
              onCancel={() => {
                setModalVisible(false);
                form.resetFields();
                setEditingFlow(null);
              }}
              afterOpenChange={handleModalAfterOpenChange}
              maskClosable={false}
              destroyOnClose
              width={700}
              footer={[
                <Button key="close" onClick={() => {
                  setModalVisible(false);
                  form.resetFields();
                  setEditingFlow(null);
                }}>
                  关闭
                </Button>,
                <Button key="submit" type="primary" onClick={handleModalOk}>
                  {editingFlow ? "更新" : "创建"}
                </Button>,
              ]}
            >
              <Form<PromptFlowFormValues>
                form={form}
                layout="vertical"
                preserve={false}
              >
                <Form.Item
                  label="所属项目"
                  name="project_id"
                  tooltip="留空表示全局流程"
                >
                  <Select
                    placeholder="请选择项目（可选，留空为全局流程）"
                    allowClear
                    showSearch
                    optionFilterProp="label"
                    options={projects.map((p) => ({
                      value: p.id,
                      label: p.name,
                    }))}
                  />
                </Form.Item>
                <Form.Item
                  label="流程代码"
                  name="code"
                  rules={[
                    { required: true, message: "请输入流程代码" },
                    { max: 100, message: "流程代码不能超过100个字符" },
                  ]}
                  tooltip='Flow = 把多个提示词按角色和顺序组织成一次 LLM 调用的"流程配置"，它是提示词管理系统里，从"单条文案"上升到"完整场景能力"的关键抽象。'
                >
                  <Input placeholder="请输入流程代码（如：qmdj.analyze_chart_flow）" />
                </Form.Item>
                <Form.Item
                  label="流程名称"
                  name="name"
                  rules={[
                    { required: true, message: "请输入流程名称" },
                    { max: 200, message: "流程名称不能超过200个字符" },
                  ]}
                >
                  <Input placeholder="请输入流程名称（如：奇门遁甲看盘完整上下文）" />
                </Form.Item>
                <Form.Item label="描述" name="description">
                  <TextArea
                    rows={4}
                    placeholder="请输入描述（说明该流程包含哪些步骤、适用场景等）"
                  />
                </Form.Item>
              </Form>
            </Modal>
          </div>
        </div>
      </AdminLayout>
    </ConfigProvider>
  );
}





