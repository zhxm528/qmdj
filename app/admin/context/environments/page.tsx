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

const { TextArea } = Input;

interface Environment {
  id: string;
  code: string;
  name: string;
  description: string | null;
}

interface EnvironmentFormValues {
  code?: string;
  name?: string;
  description?: string;
}

export default function EnvironmentsPage() {
  const [form] = Form.useForm<EnvironmentFormValues>();
  const [loading, setLoading] = useState(false);
  const [environments, setEnvironments] = useState<Environment[]>([]);
  const [total, setTotal] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [modalVisible, setModalVisible] = useState(false);
  const [editingEnvironment, setEditingEnvironment] = useState<Environment | null>(null);

  const loadEnvironments = async (page: number, size: number) => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.set("page", String(page));
      params.set("pageSize", String(size));

      const res = await fetch(`/api/admin/context/environments?${params.toString()}`);
      const data = await res.json();
      if (data.success) {
        setEnvironments(data.data || []);
        setTotal(data.total || 0);
        setCurrentPage(page);
        setPageSize(size);
      } else {
        message.error(data.error || "加载环境列表失败");
      }
    } catch (error) {
      console.error("加载环境列表失败:", error);
      message.error("加载环境列表失败");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadEnvironments(1, 10);
  }, []);

  const handleAdd = () => {
    setEditingEnvironment(null);
    form.resetFields();
    setModalVisible(true);
  };

  const handleEdit = (record: Environment) => {
    setEditingEnvironment(record);
    form.setFieldsValue({
      code: record.code,
      name: record.name,
      description: record.description || undefined,
    });
    setModalVisible(true);
  };

  const handleDelete = async (record: Environment) => {
    try {
      const res = await fetch(
        `/api/admin/context/environments?id=${record.id}`,
        {
          method: "DELETE",
        }
      );
      const data = await res.json();
      if (data.success) {
        message.success("删除成功");
        loadEnvironments(currentPage, pageSize);
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
      if (editingEnvironment) {
        res = await fetch("/api/admin/context/environments", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            id: editingEnvironment.id,
            ...payload,
          }),
        });
      } else {
        res = await fetch("/api/admin/context/environments", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
      }

      const data = await res.json();
      if (data.success) {
        message.success(editingEnvironment ? "更新成功" : "创建成功");
        setModalVisible(false);
        form.resetFields();
        loadEnvironments(currentPage, pageSize);
      } else {
        message.error(data.error || "保存失败");
      }
    } catch (error) {
      console.error("保存失败:", error);
    }
  };

  const handlePageChange = (page: number, size: number) => {
    loadEnvironments(page, size);
  };

  const columns: ColumnsType<Environment> = [
    {
      title: "ID",
      dataIndex: "id",
      key: "id",
      width: 300,
      fixed: "left",
      ellipsis: true,
    },
    {
      title: "环境代号",
      dataIndex: "code",
      key: "code",
      width: 120,
    },
    {
      title: "环境名称",
      dataIndex: "name",
      key: "name",
      width: 200,
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
            title="确定要删除该环境吗？"
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
              <h1 className="text-3xl font-bold text-gray-900">环境</h1>
              <Button
                type="primary"
                icon={<PlusOutlined />}
                onClick={handleAdd}
              >
                新增环境
              </Button>
            </div>

            <Table<Environment>
              columns={columns}
              dataSource={environments}
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
              title={editingEnvironment ? "编辑环境" : "新增环境"}
              open={modalVisible}
              onOk={handleModalOk}
              onCancel={() => {
                setModalVisible(false);
                form.resetFields();
              }}
              destroyOnClose
              width={700}
            >
              <Form<EnvironmentFormValues>
                form={form}
                layout="vertical"
                preserve={false}
              >
                <Form.Item
                  label="环境代号"
                  name="code"
                  rules={[
                    { required: true, message: "请选择环境代号" },
                  ]}
                >
                  <Select
                    placeholder="请选择环境代号"
                    disabled={!!editingEnvironment}
                    options={[
                      { value: "dev", label: "开发环境 (dev)" },
                      { value: "staging", label: "预发布环境 (staging)" },
                      { value: "prod", label: "生产环境 (prod)" },
                    ]}
                  />
                </Form.Item>
                <Form.Item
                  label="环境名称"
                  name="name"
                  rules={[
                    { required: true, message: "请输入环境名称" },
                    { max: 50, message: "环境名称不能超过50个字符" },
                  ]}
                >
                  <Input placeholder="请输入环境名称（如：开发环境、预发布环境、生产环境）" />
                </Form.Item>
                <Form.Item label="描述" name="description">
                  <TextArea
                    rows={4}
                    placeholder="请输入描述（该环境的用途说明）"
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

