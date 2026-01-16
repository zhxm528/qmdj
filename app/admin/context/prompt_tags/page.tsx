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

interface QueryFormValues {
  name?: string;
}

export default function PromptTagsPage() {
  const [form] = Form.useForm<PromptTagFormValues>();
  const [queryForm] = Form.useForm<QueryFormValues>();
  const [loading, setLoading] = useState(false);
  const [tags, setTags] = useState<PromptTag[]>([]);
  const [total, setTotal] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [modalVisible, setModalVisible] = useState(false);
  const [editingTag, setEditingTag] = useState<PromptTag | null>(null);

  const loadTags = async (page: number, size: number, filters?: QueryFormValues) => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.set("page", String(page));
      params.set("pageSize", String(size));

      // 添加查询条件
      if (filters) {
        if (filters.name) {
          params.set("name", filters.name);
        }
      }

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

  // 处理 Modal 打开后的表单值设置
  const handleModalAfterOpenChange = (open: boolean) => {
    if (open) {
      console.log("[prompt_tags] Modal 打开，当前标签:", editingTag);
      // Modal 完全打开后，设置表单值
      // 使用 setTimeout 确保 Form 组件完全渲染和初始化
      setTimeout(() => {
        if (editingTag) {
          // 编辑模式：设置表单值
          const formValues = {
            name: editingTag.name || undefined,
            description: editingTag.description || undefined,
          };
          console.log("[prompt_tags] Modal 打开后设置表单值:", formValues);
          form.setFieldsValue(formValues);
          // 验证表单值是否设置成功
          const currentValues = form.getFieldsValue();
          console.log("[prompt_tags] 表单值已设置，当前表单值:", currentValues);
          console.log("[prompt_tags] 表单值设置验证:", {
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
    setEditingTag(null);
    form.resetFields();
    setModalVisible(true);
  };

  const handleEdit = async (record: PromptTag) => {
    try {
      // 从后端重新查询记录，确保数据最新
      const res = await fetch(`/api/admin/context/prompt_tags?id=${record.id}`);
      const data = await res.json();
      
      // 详细打印后端返回给前端的完整内容
      console.log("[prompt_tags] ========== 后端返回给前端的完整响应 ==========");
      console.log("[prompt_tags] 响应状态码:", res.status);
      console.log("[prompt_tags] 响应状态文本:", res.statusText);
      console.log("[prompt_tags] 响应数据 (JSON):", JSON.stringify(data, null, 2));
      console.log("[prompt_tags] 响应数据 (对象):", data);
      if (data.success) {
        console.log("[prompt_tags] success:", data.success);
        if (data.data) {
          console.log("[prompt_tags] data 字段内容:", data.data);
          console.log("[prompt_tags] data 字段类型:", typeof data.data);
          console.log("[prompt_tags] data 是否为数组:", Array.isArray(data.data));
          if (typeof data.data === "object" && !Array.isArray(data.data)) {
            console.log("[prompt_tags] data 对象的所有字段:");
            Object.keys(data.data).forEach((key) => {
              console.log(`[prompt_tags]   ${key}:`, data.data[key], `(类型: ${typeof data.data[key]})`);
            });
          }
        } else {
          console.log("[prompt_tags] data 字段为空或未定义");
        }
      } else {
        console.log("[prompt_tags] success:", data.success);
        console.log("[prompt_tags] error:", data.error);
      }
      console.log("[prompt_tags] ============================================");
      
      if (data.success && data.data) {
        const tag = data.data;
        console.log("[prompt_tags] 提取的标签数据对象:", tag);
        
        // 先设置 editingTag，然后打开 Modal
        // useEffect 会在 Modal 打开后自动设置表单值
        setEditingTag(tag);
        setModalVisible(true);
      } else {
        message.error(data.error || "查询标签信息失败");
      }
    } catch (error) {
      console.error("[prompt_tags] 查询标签信息失败:", error);
      message.error("查询标签信息失败");
    }
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
        const filters = queryForm.getFieldsValue();
        loadTags(currentPage, pageSize, filters);
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
        const filters = queryForm.getFieldsValue();
        loadTags(currentPage, pageSize, filters);
      } else {
        message.error(data.error || "保存失败");
      }
    } catch (error) {
      console.error("保存失败:", error);
    }
  };

  const handlePageChange = (page: number, size: number) => {
    const filters = queryForm.getFieldsValue();
    loadTags(page, size, filters);
  };

  const handleSearch = () => {
    const filters = queryForm.getFieldsValue();
    loadTags(1, pageSize, filters);
  };

  const handleReset = () => {
    queryForm.resetFields();
    loadTags(1, pageSize);
  };

  const columns: ColumnsType<PromptTag> = [
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
      width: 500,
      render: (value: string | null) => value || "-",
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
            title="确定要删除该标签吗？"
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
      <AdminLayout>
        <div className="min-h-screen bg-gradient-to-b from-amber-50 to-white py-12 px-4">
          <div className="w-full bg-white rounded-lg shadow-md p-8">
            <div className="flex items-center justify-between mb-6">
              <AdminBreadcrumb title="标签" />
              <Button
                type="primary"
                icon={<PlusOutlined />}
                onClick={handleAdd}
              >
                新增标签
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
                    <Form.Item name="name" label="标签名" style={{ marginBottom: '10px' }}>
                      <Input placeholder="请输入标签名" />
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
              scroll={{ x: 880 }}
            />

            <Modal
              title={editingTag ? "编辑标签" : "新增标签"}
              open={modalVisible}
              onOk={handleModalOk}
              onCancel={() => {
                setModalVisible(false);
                form.resetFields();
                setEditingTag(null);
              }}
              afterOpenChange={handleModalAfterOpenChange}
              maskClosable={false}
              destroyOnHidden
              width={700}
              footer={[
                <Button key="close" onClick={() => {
                  setModalVisible(false);
                  form.resetFields();
                  setEditingTag(null);
                }}>
                  关闭
                </Button>,
                <Button key="submit" type="primary" onClick={handleModalOk}>
                  {editingTag ? "更新" : "创建"}
                </Button>,
              ]}
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
      </AdminLayout>
    </ConfigProvider>
  );
}





