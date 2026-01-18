"use client";

import { useEffect, useState } from "react";
import AdminLayout from "@/components/admin/AdminLayout";
import AdminBreadcrumb from "@/components/admin/AdminBreadcrumb";
import {
  ConfigProvider,
  Table,
  Button,
  Modal,
  Form,
  Input,
  InputNumber,
  Space,
  Popconfirm,
  message,
} from "antd";
import zhCN from "antd/locale/zh_CN";
import type { ColumnsType } from "antd/es/table";
import { PlusOutlined, EditOutlined, DeleteOutlined } from "@ant-design/icons";
import dayjs from "dayjs";
import TermTimeline from "@/components/TermTimeline";

const { TextArea } = Input;

interface TermCategory {
  id: string;
  name: string;
  code: string;
  description: string | null;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

interface TermCategoryFormValues {
  name?: string;
  code?: string;
  description?: string;
  sort_order?: number;
}

export default function TermCategoryPage() {
  const [form] = Form.useForm<TermCategoryFormValues>();
  const [loading, setLoading] = useState(false);
  const [categories, setCategories] = useState<TermCategory[]>([]);
  const [total, setTotal] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [modalVisible, setModalVisible] = useState(false);
  const [editingCategory, setEditingCategory] = useState<TermCategory | null>(null);

  const loadCategories = async (page: number, size: number) => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.set("page", String(page));
      params.set("pageSize", String(size));

      const res = await fetch(`/api/admin/term/term_category?${params.toString()}`);
      const data = await res.json();
      if (data.success) {
        setCategories(data.data || []);
        setTotal(data.total || 0);
        setCurrentPage(page);
        setPageSize(size);
      } else {
        message.error(data.error || "加载分类列表失败");
      }
    } catch (error) {
      console.error("加载分类列表失败:", error);
      message.error("加载分类列表失败");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCategories(1, 10);
  }, []);

  const handleAdd = () => {
    setEditingCategory(null);
    form.resetFields();
    form.setFieldsValue({ sort_order: 100 });
    setModalVisible(true);
  };

  const handleEdit = (record: TermCategory) => {
    setEditingCategory(record);
    form.setFieldsValue({
      name: record.name,
      code: record.code,
      description: record.description || undefined,
      sort_order: record.sort_order,
    });
    setModalVisible(true);
  };

  const handleDelete = async (record: TermCategory) => {
    try {
      const res = await fetch(
        `/api/admin/term/term_category?id=${record.id}`,
        {
          method: "DELETE",
        }
      );
      const data = await res.json();
      if (data.success) {
        message.success("删除成功");
        loadCategories(currentPage, pageSize);
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
        name: values.name || null,
        code: values.code || null,
        description: values.description || null,
        sort_order: values.sort_order ?? 100,
      };

      let res: Response;
      if (editingCategory) {
        res = await fetch("/api/admin/term/term_category", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            id: editingCategory.id,
            ...payload,
          }),
        });
      } else {
        res = await fetch("/api/admin/term/term_category", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
      }

      const data = await res.json();
      if (data.success) {
        message.success(editingCategory ? "更新成功" : "创建成功");
        setModalVisible(false);
        form.resetFields();
        loadCategories(currentPage, pageSize);
      } else {
        message.error(data.error || "保存失败");
      }
    } catch (error) {
      console.error("保存失败:", error);
    }
  };

  const handlePageChange = (page: number, size: number) => {
    loadCategories(page, size);
  };

  const columns: ColumnsType<TermCategory> = [
    {
      title: "ID",
      dataIndex: "id",
      key: "id",
      width: 100,
      fixed: "left",
    },
    {
      title: "分类名称",
      dataIndex: "name",
      key: "name",
      width: 200,
    },
    {
      title: "分类编码",
      dataIndex: "code",
      key: "code",
      width: 150,
    },
    {
      title: "分类说明",
      dataIndex: "description",
      key: "description",
      width: 300,
      ellipsis: true,
      render: (value: string | null) => value || "-",
    },
    {
      title: "排序值",
      dataIndex: "sort_order",
      key: "sort_order",
      width: 100,
      sorter: (a, b) => a.sort_order - b.sort_order,
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
            title="确定要删除该分类吗？"
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
      <AdminLayout>
        <div className="min-h-screen bg-[var(--color-surface)] py-12 px-4">
          <div className="w-full bg-[var(--color-card-bg)] rounded-lg shadow-md p-8">
            {/* 时间轴导航 */}
            <TermTimeline currentStep={0} />

            <div className="flex items-center justify-between mb-6">
              <AdminBreadcrumb title="术语分类" />
              <Button
                type="primary"
                icon={<PlusOutlined />}
                onClick={handleAdd}
              >
                新增分类
              </Button>
            </div>

            <Table<TermCategory>
              columns={columns}
              dataSource={categories}
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
              title={editingCategory ? "编辑分类" : "新增分类"}
              open={modalVisible}
              onOk={handleModalOk}
              onCancel={() => {
                setModalVisible(false);
                form.resetFields();
              }}
              destroyOnClose
              width={700}
            >
              <Form<TermCategoryFormValues>
                form={form}
                layout="vertical"
                preserve={false}
              >
                {editingCategory && (
                  <Form.Item label="ID" name="id">
                    <Input value={editingCategory.id} disabled />
                  </Form.Item>
                )}
                <Form.Item
                  label="分类名称"
                  name="name"
                  rules={[
                    { required: true, message: "请输入分类名称" },
                    { max: 128, message: "分类名称不能超过128个字符" },
                  ]}
                >
                  <Input placeholder="请输入分类名称（如：会员体系）" />
                </Form.Item>
                <Form.Item
                  label="分类编码"
                  name="code"
                  rules={[
                    { required: true, message: "请输入分类编码" },
                    { max: 64, message: "分类编码不能超过64个字符" },
                    {
                      pattern: /^[a-z][a-z0-9_]*$/,
                      message: "分类编码只能包含小写字母、数字和下划线，且必须以字母开头",
                    },
                  ]}
                >
                  <Input
                    placeholder="请输入分类编码（如：member, payment）"
                    disabled={!!editingCategory}
                  />
                </Form.Item>
                <Form.Item
                  label="分类说明"
                  name="description"
                  rules={[
                    { max: 512, message: "分类说明不能超过512个字符" },
                  ]}
                >
                  <TextArea
                    rows={4}
                    placeholder="请输入分类说明"
                  />
                </Form.Item>
                <Form.Item
                  label="排序值"
                  name="sort_order"
                  rules={[{ type: "number", message: "请输入有效的数字" }]}
                >
                  <InputNumber
                    min={0}
                    placeholder="排序值，越小越靠前"
                    style={{ width: "100%" }}
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




