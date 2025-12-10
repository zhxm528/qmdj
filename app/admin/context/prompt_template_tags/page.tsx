"use client";

import { useEffect, useState } from "react";
import Layout from "@/components/Layout";
import {
  ConfigProvider,
  Table,
  Button,
  Modal,
  Form,
  Select,
  Space,
  Popconfirm,
  message,
} from "antd";
import zhCN from "antd/locale/zh_CN";
import type { ColumnsType } from "antd/es/table";
import { PlusOutlined, EditOutlined, DeleteOutlined } from "@ant-design/icons";

interface PromptTemplateTag {
  template_id: string;
  tag_id: string;
}

interface PromptTemplateTagFormValues {
  template_id?: string;
  tag_id?: string;
}

export default function PromptTemplateTagsPage() {
  const [form] = Form.useForm<PromptTemplateTagFormValues>();
  const [loading, setLoading] = useState(false);
  const [templateTags, setTemplateTags] = useState<PromptTemplateTag[]>([]);
  const [total, setTotal] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [modalVisible, setModalVisible] = useState(false);
  const [editingTag, setEditingTag] = useState<PromptTemplateTag | null>(null);
  const [templates, setTemplates] = useState<Array<{ id: string; logical_key: string }>>([]);
  const [tags, setTags] = useState<Array<{ id: string; name: string }>>([]);

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

  const loadTags = async () => {
    try {
      const res = await fetch("/api/admin/context/prompt_tags?pageSize=-1");
      const data = await res.json();
      if (data.success && data.data) {
        setTags(data.data);
      }
    } catch (error) {
      console.error("加载标签列表失败:", error);
    }
  };

  const loadTemplateTags = async (page: number, size: number) => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.set("page", String(page));
      params.set("pageSize", String(size));

      const res = await fetch(`/api/admin/context/prompt_template_tags?${params.toString()}`);
      const data = await res.json();
      if (data.success) {
        setTemplateTags(data.data || []);
        setTotal(data.total || 0);
        setCurrentPage(page);
        setPageSize(size);
      } else {
        message.error(data.error || "加载模板标签关联列表失败");
      }
    } catch (error) {
      console.error("加载模板标签关联列表失败:", error);
      message.error("加载模板标签关联列表失败");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTemplateTags(1, 10);
    loadTemplates();
    loadTags();
  }, []);

  const handleAdd = () => {
    setEditingTag(null);
    form.resetFields();
    setModalVisible(true);
  };

  const handleEdit = (record: PromptTemplateTag) => {
    setEditingTag(record);
    form.setFieldsValue({
      template_id: record.template_id,
      tag_id: record.tag_id,
    });
    setModalVisible(true);
  };

  const handleDelete = async (record: PromptTemplateTag) => {
    try {
      const res = await fetch(
        `/api/admin/context/prompt_template_tags?template_id=${record.template_id}&tag_id=${record.tag_id}`,
        {
          method: "DELETE",
        }
      );
      const data = await res.json();
      if (data.success) {
        message.success("删除成功");
        loadTemplateTags(currentPage, pageSize);
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
        template_id: values.template_id || null,
        tag_id: values.tag_id || null,
      };

      let res: Response;
      if (editingTag) {
        res = await fetch("/api/admin/context/prompt_template_tags", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            old_template_id: editingTag.template_id,
            old_tag_id: editingTag.tag_id,
            ...payload,
          }),
        });
      } else {
        res = await fetch("/api/admin/context/prompt_template_tags", {
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
        loadTemplateTags(currentPage, pageSize);
      } else {
        message.error(data.error || "保存失败");
      }
    } catch (error) {
      console.error("保存失败:", error);
    }
  };

  const handlePageChange = (page: number, size: number) => {
    loadTemplateTags(page, size);
  };

  const getTemplateName = (id: string) => {
    const template = templates.find((t) => t.id === id);
    return template ? template.logical_key : id;
  };

  const getTagName = (id: string) => {
    const tag = tags.find((t) => t.id === id);
    return tag ? tag.name : id;
  };

  const columns: ColumnsType<PromptTemplateTag> = [
    {
      title: "模板ID",
      dataIndex: "template_id",
      key: "template_id",
      width: 300,
      ellipsis: true,
      render: (value: string) => getTemplateName(value),
    },
    {
      title: "标签ID",
      dataIndex: "tag_id",
      key: "tag_id",
      width: 300,
      ellipsis: true,
      render: (value: string) => getTagName(value),
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
            title="确定要删除该关联吗？"
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
              <h1 className="text-3xl font-bold text-gray-900">模板标签关联</h1>
              <Button
                type="primary"
                icon={<PlusOutlined />}
                onClick={handleAdd}
              >
                新增关联
              </Button>
            </div>

            <Table<PromptTemplateTag>
              columns={columns}
              dataSource={templateTags}
              rowKey={(record) => `${record.template_id}-${record.tag_id}`}
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
              title={editingTag ? "编辑模板标签关联" : "新增模板标签关联"}
              open={modalVisible}
              onOk={handleModalOk}
              onCancel={() => {
                setModalVisible(false);
                form.resetFields();
              }}
              destroyOnClose
              width={700}
            >
              <Form<PromptTemplateTagFormValues>
                form={form}
                layout="vertical"
                preserve={false}
              >
                <Form.Item
                  label="模板"
                  name="template_id"
                  rules={[{ required: true, message: "请选择模板" }]}
                >
                  <Select
                    placeholder="请选择模板"
                    showSearch
                    optionFilterProp="label"
                    options={templates.map((t) => ({
                      value: t.id,
                      label: t.logical_key || t.id,
                    }))}
                  />
                </Form.Item>
                <Form.Item
                  label="标签"
                  name="tag_id"
                  rules={[{ required: true, message: "请选择标签" }]}
                >
                  <Select
                    placeholder="请选择标签"
                    showSearch
                    optionFilterProp="label"
                    options={tags.map((t) => ({
                      value: t.id,
                      label: t.name,
                    }))}
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

