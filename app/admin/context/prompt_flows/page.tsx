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

export default function PromptFlowsPage() {
  const [form] = Form.useForm<PromptFlowFormValues>();
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

  const loadFlows = async (page: number, size: number) => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.set("page", String(page));
      params.set("pageSize", String(size));

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

  const handleAdd = () => {
    setEditingFlow(null);
    form.resetFields();
    setModalVisible(true);
  };

  const handleEdit = (record: PromptFlow) => {
    setEditingFlow(record);
    form.setFieldsValue({
      project_id: record.project_id || undefined,
      code: record.code,
      name: record.name,
      description: record.description || undefined,
    });
    setModalVisible(true);
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
        loadFlows(currentPage, pageSize);
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
        loadFlows(currentPage, pageSize);
      } else {
        message.error(data.error || "保存失败");
      }
    } catch (error) {
      console.error("保存失败:", error);
    }
  };

  const handlePageChange = (page: number, size: number) => {
    loadFlows(page, size);
  };

  const getProjectName = (id: string | null) => {
    if (!id) return "全局流程";
    const project = projects.find((p) => p.id === id);
    return project ? project.name : id;
  };

  const columns: ColumnsType<PromptFlow> = [
    {
      title: "ID",
      dataIndex: "id",
      key: "id",
      width: 300,
      fixed: "left",
      ellipsis: true,
    },
    {
      title: "所属项目",
      dataIndex: "project_id",
      key: "project_id",
      width: 200,
      render: (value: string | null) => getProjectName(value),
    },
    {
      title: "流程代码",
      dataIndex: "code",
      key: "code",
      width: 250,
    },
    {
      title: "流程名称",
      dataIndex: "name",
      key: "name",
      width: 250,
    },
    {
      title: "描述",
      dataIndex: "description",
      key: "description",
      width: 400,
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
            title="确定要删除该流程吗？"
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
              <h1 className="text-3xl font-bold text-gray-900">流程</h1>
              <Button
                type="primary"
                icon={<PlusOutlined />}
                onClick={handleAdd}
              >
                新增流程
              </Button>
            </div>

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
              scroll={{ x: 1500 }}
            />

            <Modal
              title={editingFlow ? "编辑流程" : "新增流程"}
              open={modalVisible}
              onOk={handleModalOk}
              onCancel={() => {
                setModalVisible(false);
                form.resetFields();
              }}
              destroyOnClose
              width={700}
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
                  tooltip="流程代码用于在代码中引用，如 'qmdj.analyze_chart_flow'"
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
      </Layout>
    </ConfigProvider>
  );
}

