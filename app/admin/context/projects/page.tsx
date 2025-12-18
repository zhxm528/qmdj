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

interface Project {
  id: string;
  code: string;
  name: string;
  description: string | null;
  created_at: string;
  updated_at: string;
}

interface ProjectFormValues {
  code?: string;
  name?: string;
  description?: string;
}

interface QueryFormValues {
  code?: string;
  name?: string;
}

export default function ProjectsPage() {
  const [form] = Form.useForm<ProjectFormValues>();
  const [queryForm] = Form.useForm<QueryFormValues>();
  const [loading, setLoading] = useState(false);
  const [projects, setProjects] = useState<Project[]>([]);
  const [total, setTotal] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [modalVisible, setModalVisible] = useState(false);
  const [editingProject, setEditingProject] = useState<Project | null>(null);

  const loadProjects = async (page: number, size: number, filters?: QueryFormValues) => {
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

      const res = await fetch(`/api/admin/context/projects?${params.toString()}`);
      const data = await res.json();
      if (data.success) {
        setProjects(data.data || []);
        setTotal(data.total || 0);
        setCurrentPage(page);
        setPageSize(size);
      } else {
        message.error(data.error || "加载项目列表失败");
      }
    } catch (error) {
      console.error("加载项目列表失败:", error);
      message.error("加载项目列表失败");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadProjects(1, 10);
  }, []);

  // 处理 Modal 打开后的表单值设置
  const handleModalAfterOpenChange = (open: boolean) => {
    if (open) {
      console.log("[projects] Modal 打开，当前项目:", editingProject);
      // Modal 完全打开后，设置表单值
      // 使用 setTimeout 确保 Form 组件完全渲染和初始化
      setTimeout(() => {
        if (editingProject) {
          // 编辑模式：设置表单值
          const formValues = {
            code: editingProject.code || undefined,
            name: editingProject.name || undefined,
            description: editingProject.description || undefined,
          };
          console.log("[projects] Modal 打开后设置表单值:", formValues);
          form.setFieldsValue(formValues);
          // 验证表单值是否设置成功
          const currentValues = form.getFieldsValue();
          console.log("[projects] 表单值已设置，当前表单值:", currentValues);
          console.log("[projects] 表单值设置验证:", {
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
    setEditingProject(null);
    form.resetFields();
    setModalVisible(true);
  };

  const handleEdit = async (record: Project) => {
    try {
      // 从后端重新查询记录，确保数据最新
      const res = await fetch(`/api/admin/context/projects?id=${record.id}`);
      const data = await res.json();
      
      // 详细打印后端返回给前端的内容
      console.log("[projects] ========== 后端返回给前端的完整响应 ==========");
      console.log("[projects] 响应状态码:", res.status);
      console.log("[projects] 响应状态文本:", res.statusText);
      console.log("[projects] 响应数据 (JSON):", JSON.stringify(data, null, 2));
      console.log("[projects] 响应数据 (对象):", data);
      if (data.success) {
        console.log("[projects] success:", data.success);
        if (data.data) {
          console.log("[projects] data 字段内容:", data.data);
          console.log("[projects] data 字段类型:", typeof data.data);
          console.log("[projects] data 是否为数组:", Array.isArray(data.data));
          if (typeof data.data === "object" && !Array.isArray(data.data)) {
            console.log("[projects] data 对象的所有字段:");
            Object.keys(data.data).forEach((key) => {
              console.log(`[projects]   ${key}:`, data.data[key], `(类型: ${typeof data.data[key]})`);
            });
          }
        } else {
          console.log("[projects] data 字段为空或未定义");
        }
      } else {
        console.log("[projects] success:", data.success);
        console.log("[projects] error:", data.error);
      }
      console.log("[projects] ============================================");
      
      if (data.success && data.data) {
        const project = data.data;
        console.log("[projects] 提取的项目数据对象:", project);
        
        // 先设置 editingProject，然后打开 Modal
        // useEffect 会在 Modal 打开后自动设置表单值
        setEditingProject(project);
        setModalVisible(true);
      } else {
        message.error(data.error || "查询项目信息失败");
      }
    } catch (error) {
      console.error("[projects] 查询项目信息失败:", error);
      message.error("查询项目信息失败");
    }
  };

  const handleDelete = async (record: Project) => {
    try {
      const res = await fetch(
        `/api/admin/context/projects?id=${record.id}`,
        {
          method: "DELETE",
        }
      );
      const data = await res.json();
      if (data.success) {
        message.success("删除成功");
        const filters = queryForm.getFieldsValue();
        loadProjects(currentPage, pageSize, filters);
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
        code: values.code || null,
        name: values.name || null,
        description: values.description || null,
      };

      let res: Response;
      if (editingProject) {
        res = await fetch("/api/admin/context/projects", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            id: editingProject.id,
            ...payload,
          }),
        });
      } else {
        res = await fetch("/api/admin/context/projects", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
      }

      const data = await res.json();
      if (data.success) {
        message.success(editingProject ? "更新成功" : "创建成功");
        setModalVisible(false);
        form.resetFields();
        const filters = queryForm.getFieldsValue();
        loadProjects(currentPage, pageSize, filters);
      } else {
        message.error(data.error || "保存失败");
      }
    } catch (error) {
      console.error("保存失败:", error);
      // 校验错误已在表单内提示，这里只处理网络错误
    }
  };

  const handlePageChange = (page: number, size: number) => {
    const filters = queryForm.getFieldsValue();
    loadProjects(page, size, filters);
  };

  const handleSearch = () => {
    const filters = queryForm.getFieldsValue();
    loadProjects(1, pageSize, filters);
  };

  const handleReset = () => {
    queryForm.resetFields();
    loadProjects(1, pageSize);
  };

  const columns: ColumnsType<Project> = [
    {
      title: "项目代码",
      dataIndex: "code",
      key: "code",
      width: 150,
    },
    {
      title: "项目名称",
      dataIndex: "name",
      key: "name",
      width: 200,
    },
    {
      title: "项目描述",
      dataIndex: "description",
      key: "description",
      width: 400,
      render: (value: string | null) => value || "-",
    },
    {
      title: "创建时间",
      dataIndex: "created_at",
      key: "created_at",
      width: 180,
      align: "center",
      render: (value: string) =>
        value ? dayjs(value).format("YYYY-MM-DD HH:mm:ss") : "-",
    },
    {
      title: "更新时间",
      dataIndex: "updated_at",
      key: "updated_at",
      width: 180,
      align: "center",
      render: (value: string) =>
        value ? dayjs(value).format("YYYY-MM-DD HH:mm:ss") : "-",
    },
    {
      title: "操作",
      key: "action",
      fixed: "right",
      width: 180,
      align: "center",
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
            title="确定要删除该项目吗？"
            onConfirm={() => handleDelete(record)}
          >
            <Button 
              type="link" 
              danger 
              icon={<DeleteOutlined />}
              style={{ padding: 0 }}
            >
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
              <h1 className="text-3xl font-bold text-gray-900">项目管理</h1>
              <Button
                type="primary"
                icon={<PlusOutlined />}
                onClick={handleAdd}
              >
                新增项目
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
                    <Form.Item name="code" label="项目代码" style={{ marginBottom: '10px' }}>
                      <Input placeholder="请输入项目代码" />
                    </Form.Item>
                  </Col>
                  <Col xs={24} sm={12} md={6}>
                    <Form.Item name="name" label="项目名称" style={{ marginBottom: '10px' }}>
                      <Input placeholder="请输入项目名称" />
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

            <Table<Project>
              columns={columns}
              dataSource={projects}
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
              scroll={{ x: 1110 }}
            />

            <Modal
              title={editingProject ? "编辑项目" : "新增项目"}
              open={modalVisible}
              onOk={handleModalOk}
              onCancel={() => {
                setModalVisible(false);
                form.resetFields();
                setEditingProject(null);
              }}
              afterOpenChange={handleModalAfterOpenChange}
              maskClosable={false}
              destroyOnHidden
              width={700}
              footer={[
                <Button key="close" onClick={() => {
                  setModalVisible(false);
                  form.resetFields();
                  setEditingProject(null);
                }}>
                  关闭
                </Button>,
                <Button key="submit" type="primary" onClick={handleModalOk}>
                  {editingProject ? "更新" : "创建"}
                </Button>,
              ]}
            >
              <Form<ProjectFormValues>
                form={form}
                layout="vertical"
                preserve={false}
              >
                <Form.Item
                  label="项目代码"
                  name="code"
                  rules={[
                    { required: true, message: "请输入项目代码" },
                    { max: 50, message: "项目代码不能超过50个字符" },
                    { pattern: /^[a-z0-9_]+$/, message: "项目代码只能包含小写字母、数字和下划线" },
                  ]}
                  tooltip="项目代码用于在代码中引用，如 'qmdj'，不建议修改"
                >
                  <Input
                    placeholder="请输入项目代码（如：qmdj）"
                    disabled={!!editingProject}
                  />
                </Form.Item>
                <Form.Item
                  label="项目名称"
                  name="name"
                  rules={[
                    { required: true, message: "请输入项目名称" },
                    { max: 100, message: "项目名称不能超过100个字符" },
                  ]}
                >
                  <Input placeholder="请输入项目名称（如：奇门遁甲问事助手）" />
                </Form.Item>
                <Form.Item
                  label="项目描述"
                  name="description"
                  rules={[
                    { max: 1000, message: "项目描述不能超过1000个字符" },
                  ]}
                >
                  <Input.TextArea
                    rows={4}
                    placeholder="请输入项目描述（说明该项目做什么、适用范围等）"
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

