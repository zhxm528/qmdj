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
} from "antd";
import zhCN from "antd/locale/zh_CN";
import type { ColumnsType } from "antd/es/table";
import { PlusOutlined, EditOutlined, DeleteOutlined } from "@ant-design/icons";
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

export default function ProjectsPage() {
  const [form] = Form.useForm<ProjectFormValues>();
  const [loading, setLoading] = useState(false);
  const [projects, setProjects] = useState<Project[]>([]);
  const [total, setTotal] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [modalVisible, setModalVisible] = useState(false);
  const [editingProject, setEditingProject] = useState<Project | null>(null);

  const loadProjects = async (page: number, size: number) => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.set("page", String(page));
      params.set("pageSize", String(size));

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

  const handleAdd = () => {
    setEditingProject(null);
    form.resetFields();
    setModalVisible(true);
  };

  const handleEdit = (record: Project) => {
    setEditingProject(record);
    form.setFieldsValue({
      code: record.code,
      name: record.name,
      description: record.description || undefined,
    });
    setModalVisible(true);
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
        loadProjects(currentPage, pageSize);
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
        loadProjects(currentPage, pageSize);
      } else {
        message.error(data.error || "保存失败");
      }
    } catch (error) {
      console.error("保存失败:", error);
      // 校验错误已在表单内提示，这里只处理网络错误
    }
  };

  const handlePageChange = (page: number, size: number) => {
    loadProjects(page, size);
  };

  const columns: ColumnsType<Project> = [
    {
      title: "ID",
      dataIndex: "id",
      key: "id",
      width: 300,
      fixed: "left",
      ellipsis: true,
    },
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
      width: 300,
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
      title: "更新时间",
      dataIndex: "updated_at",
      key: "updated_at",
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
            title="确定要删除该项目吗？"
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
              <h1 className="text-3xl font-bold text-gray-900">项目管理</h1>
              <Button
                type="primary"
                icon={<PlusOutlined />}
                onClick={handleAdd}
              >
                新增项目
              </Button>
            </div>

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
              scroll={{ x: 1500 }}
            />

            <Modal
              title={editingProject ? "编辑项目" : "新增项目"}
              open={modalVisible}
              onOk={handleModalOk}
              onCancel={() => {
                setModalVisible(false);
                form.resetFields();
              }}
              destroyOnClose
              width={700}
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

