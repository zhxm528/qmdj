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

const { TextArea } = Input;

interface PromptTag {
  id: string;
  name: string;
  description: string | null;
}

interface PromptTagFormValues {
  name?: string;
  description?: string;
}

export default function PromptTagsPage() {
  const [form] = Form.useForm<PromptTagFormValues>();
  const [loading, setLoading] = useState(false);
  const [tags, setTags] = useState<PromptTag[]>([]);
  const [total, setTotal] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [modalVisible, setModalVisible] = useState(false);
  const [editingTag, setEditingTag] = useState<PromptTag | null>(null);

  const loadTags = async (page: number, size: number) => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.set("page", String(page));
      params.set("pageSize", String(size));

      const res = await fetch(`/api/admin/context/prompt_tags?${params.toString()}`);
      const data = await res.json();
      if (data.success) {
        setTags(data.data || []);
        setTotal(data.total || 0);
        setCurrentPage(page);
        setPageSize(size);
      } else {
        message.error(data.error || "加载标签列表失败");
      }
    } catch (error) {
      console.error("加载标签列表失败:", error);
      message.error("加载标签列表失败");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTags(1, 10);
  }, []);

  const handleAdd = () => {
    setEditingTag(null);
    form.resetFields();
    setModalVisible(true);
  };

  const handleEdit = (record: PromptTag) => {
    setEditingTag(record);
    form.setFieldsValue({
      name: record.name,
      description: record.description || undefined,
    });
    setModalVisible(true);
  };

  const handleDelete = async (record: PromptTag) => {
    try {
      const res = await fetch(
        `/api/admin/context/prompt_tags?id=${record.id}`,
        {
          method: "DELETE",
        }
      );
      const data = await res.json();
      if (data.success) {
        message.success("删除成功");
        loadTags(currentPage, pageSize);
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
        description: values.description || null,
      };

      let res: Response;
      if (editingTag) {
        res = await fetch("/api/admin/context/prompt_tags", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            id: editingTag.id,
            ...payload,
          }),
        });
      } else {
        res = await fetch("/api/admin/context/prompt_tags", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
      }

      const data = await res.json();
      if (data.success) {
        message.success(editingTag ? "更新成功" : "创建成功");
        setModalVisible(false);
        form.resetFields();
        loadTags(currentPage, pageSize);
      } else {
        message.error(data.error || "保存失败");
      }
    } catch (error) {
      console.error("保存失败:", error);
    }
  };

  const handlePageChange = (page: number, size: number) => {
    loadTags(page, size);
  };

  const columns: ColumnsType<PromptTag> = [
    {
      title: "ID",
      dataIndex: "id",
      key: "id",
      width: 300,
      fixed: "left",
      ellipsis: true,
    },
    {
      title: "标签名",
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
            title="确定要删除该标签吗？"
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
              <h1 className="text-3xl font-bold text-gray-900">标签</h1>
              <Button
                type="primary"
                icon={<PlusOutlined />}
                onClick={handleAdd}
              >
                新增标签
              </Button>
            </div>

            <Table<PromptTag>
              columns={columns}
              dataSource={tags}
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
              title={editingTag ? "编辑标签" : "新增标签"}
              open={modalVisible}
              onOk={handleModalOk}
              onCancel={() => {
                setModalVisible(false);
                form.resetFields();
              }}
              destroyOnClose
              width={700}
            >
              <Form<PromptTagFormValues>
                form={form}
                layout="vertical"
                preserve={false}
              >
                <Form.Item
                  label="标签名"
                  name="name"
                  rules={[
                    { required: true, message: "请输入标签名" },
                    { max: 100, message: "标签名不能超过100个字符" },
                  ]}
                >
                  <Input placeholder="请输入标签名（如：metaphysics, qmdj, analysis）" />
                </Form.Item>
                <Form.Item label="描述" name="description">
                  <TextArea
                    rows={4}
                    placeholder="请输入标签描述（说明该标签的意义和使用范围）"
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

