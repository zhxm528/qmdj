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
  Select,
  Switch,
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
}

interface Term {
  id: string;
  term_key: string;
  name: string;
  alias: string | null;
  pinyin: string | null;
  category_id: string | null;
  category_name: string | null;
  short_desc: string | null;
  full_desc: string | null;
  status: number;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

interface TermFormValues {
  term_key?: string;
  name?: string;
  alias?: string;
  pinyin?: string;
  category_id?: string | null;
  short_desc?: string;
  full_desc?: string;
  status?: boolean;
  sort_order?: number;
}

export default function TermPage() {
  const [form] = Form.useForm<TermFormValues>();
  const [loading, setLoading] = useState(false);
  const [terms, setTerms] = useState<Term[]>([]);
  const [total, setTotal] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [modalVisible, setModalVisible] = useState(false);
  const [editingTerm, setEditingTerm] = useState<Term | null>(null);
  const [categories, setCategories] = useState<TermCategory[]>([]);

  const loadCategories = async () => {
    try {
      const res = await fetch("/api/admin/term/term_category?pageSize=-1");
      const data = await res.json();
      if (data.success && data.data) {
        setCategories(data.data);
      }
    } catch (error) {
      console.error("加载分类列表失败:", error);
    }
  };

  const loadTerms = async (page: number, size: number) => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.set("page", String(page));
      params.set("pageSize", String(size));

      const res = await fetch(`/api/admin/term/term?${params.toString()}`);
      const data = await res.json();
      if (data.success) {
        setTerms(data.data || []);
        setTotal(data.total || 0);
        setCurrentPage(page);
        setPageSize(size);
      } else {
        message.error(data.error || "加载术语列表失败");
      }
    } catch (error) {
      console.error("加载术语列表失败:", error);
      message.error("加载术语列表失败");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTerms(1, 10);
    loadCategories();
  }, []);

  // 处理 Modal 打开后的表单值设置
  const handleModalAfterOpenChange = (open: boolean) => {
    if (open) {
      // Modal 完全打开后，设置表单值
      // 使用 setTimeout 确保 Form 组件完全渲染和初始化
      setTimeout(() => {
        if (editingTerm) {
          // 编辑模式：设置表单值
          const formValues = {
            term_key: editingTerm.term_key || undefined,
            name: editingTerm.name || undefined,
            alias: editingTerm.alias || undefined,
            pinyin: editingTerm.pinyin || undefined,
            category_id: editingTerm.category_id || null,
            short_desc: editingTerm.short_desc || undefined,
            full_desc: editingTerm.full_desc || undefined,
            status: editingTerm.status === 1,
            sort_order: editingTerm.sort_order,
          };
          form.setFieldsValue(formValues);
        } else {
          // 新增模式，设置默认值
          form.setFieldsValue({
            status: true,
            sort_order: 1000,
          });
        }
      }, 100);
    }
  };

  const handleAdd = () => {
    setEditingTerm(null);
    form.resetFields();
    setModalVisible(true);
  };

  const handleEdit = (record: Term) => {
    // 先设置 editingTerm，然后打开 Modal
    // handleModalAfterOpenChange 会在 Modal 打开后自动设置表单值
    setEditingTerm(record);
    setModalVisible(true);
  };

  const handleDelete = async (record: Term) => {
    try {
      const res = await fetch(
        `/api/admin/term/term?id=${record.id}`,
        {
          method: "DELETE",
        }
      );
      const data = await res.json();
      if (data.success) {
        message.success("删除成功");
        loadTerms(currentPage, pageSize);
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
      // 新增时，如果 status 未设置，默认为 1（启用）
      const statusValue = editingTerm 
        ? (values.status ? 1 : 0) 
        : (values.status !== undefined ? (values.status ? 1 : 0) : 1);
      
      const payload: any = {
        term_key: values.term_key || null,
        name: values.name || null,
        alias: values.alias || null,
        pinyin: values.pinyin || null,
        category_id: values.category_id || null,
        short_desc: values.short_desc || null,
        full_desc: values.full_desc || null,
        status: statusValue,
        sort_order: values.sort_order ?? 1000,
      };

      let res: Response;
      if (editingTerm) {
        res = await fetch("/api/admin/term/term", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            id: editingTerm.id,
            ...payload,
          }),
        });
      } else {
        res = await fetch("/api/admin/term/term", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
      }

      const data = await res.json();
      if (data.success) {
        message.success(editingTerm ? "更新成功" : "创建成功");
        setModalVisible(false);
        form.resetFields();
        loadTerms(currentPage, pageSize);
      } else {
        message.error(data.error || "保存失败");
      }
    } catch (error) {
      console.error("保存失败:", error);
    }
  };

  const handlePageChange = (page: number, size: number) => {
    loadTerms(page, size);
  };

  const columns: ColumnsType<Term> = [
    {
      title: "ID",
      dataIndex: "id",
      key: "id",
      width: 100,
      fixed: "left",
    },
    {
      title: "术语Key",
      dataIndex: "term_key",
      key: "term_key",
      width: 150,
    },
    {
      title: "名称",
      dataIndex: "name",
      key: "name",
      width: 200,
    },
    {
      title: "别名",
      dataIndex: "alias",
      key: "alias",
      width: 200,
      ellipsis: true,
      render: (value: string | null) => value || "-",
    },
    {
      title: "拼音",
      dataIndex: "pinyin",
      key: "pinyin",
      width: 200,
      ellipsis: true,
      render: (value: string | null) => value || "-",
    },
    {
      title: "分类",
      dataIndex: "category_name",
      key: "category_name",
      width: 150,
      render: (value: string | null) => value || "-",
    },
    {
      title: "简要说明",
      dataIndex: "short_desc",
      key: "short_desc",
      width: 250,
      ellipsis: true,
      render: (value: string | null) => value || "-",
    },
    {
      title: "状态",
      dataIndex: "status",
      key: "status",
      width: 80,
      render: (value: number) => (value === 1 ? "启用" : "停用"),
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
            title="确定要删除该术语吗？"
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
        <div className="min-h-screen bg-gradient-to-b from-amber-50 to-white py-12 px-4">
          <div className="w-full bg-white rounded-lg shadow-md p-8">
            {/* 时间轴导航 */}
            <TermTimeline currentStep={1} />

            <div className="flex items-center justify-between mb-6">
              <AdminBreadcrumb title="术语管理" />
              <Button
                type="primary"
                icon={<PlusOutlined />}
                onClick={handleAdd}
              >
                新增术语
              </Button>
            </div>

            <Table<Term>
              columns={columns}
              dataSource={terms}
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
              scroll={{ x: 2000 }}
            />

            <Modal
              title={editingTerm ? "编辑术语" : "新增术语"}
              open={modalVisible}
              onOk={handleModalOk}
              onCancel={() => {
                setModalVisible(false);
                form.resetFields();
                setEditingTerm(null);
              }}
              afterOpenChange={handleModalAfterOpenChange}
              maskClosable={false}
              destroyOnClose
              width={800}
            >
              <Form<TermFormValues>
                form={form}
                layout="vertical"
                preserve={false}
              >
                <Form.Item
                  label="术语Key"
                  name="term_key"
                  rules={[
                    { required: true, message: "请输入术语Key" },
                    { max: 128, message: "术语Key不能超过128个字符" },
                    {
                      pattern: /^[a-z][a-z0-9_]*$/,
                      message: "术语Key只能包含小写字母、数字和下划线，且必须以字母开头",
                    },
                  ]}
                >
                  <Input
                    placeholder="请输入术语Key（如：member_level）"
                    disabled={!!editingTerm}
                  />
                </Form.Item>
                <Form.Item
                  label="名称"
                  name="name"
                  rules={[
                    { required: true, message: "请输入名称" },
                    { max: 256, message: "名称不能超过256个字符" },
                  ]}
                >
                  <Input placeholder="请输入显示名称（如：会员等级）" />
                </Form.Item>
                <Form.Item
                  label="别名"
                  name="alias"
                  rules={[
                    { max: 512, message: "别名不能超过512个字符" },
                  ]}
                >
                  <Input placeholder="请输入别名/缩写/旧称，用逗号分隔（如：VIP,等级）" />
                </Form.Item>
                <Form.Item
                  label="拼音"
                  name="pinyin"
                  rules={[
                    { max: 512, message: "拼音不能超过512个字符" },
                  ]}
                >
                  <Input placeholder="请输入名称的拼音或简拼（如：huiyuan dengji, hydj）" />
                </Form.Item>
                <Form.Item
                  label="分类"
                  name="category_id"
                >
                  <Select
                    placeholder="请选择分类（可选）"
                    allowClear
                    showSearch
                    optionFilterProp="label"
                    options={categories.map((c) => ({
                      value: c.id,
                      label: `${c.name} (${c.code})`,
                    }))}
                  />
                </Form.Item>
                <Form.Item
                  label="简要说明"
                  name="short_desc"
                  rules={[
                    { max: 512, message: "简要说明不能超过512个字符" },
                  ]}
                >
                  <TextArea
                    rows={3}
                    placeholder="请输入列表展示用的简要说明（1~2句话）"
                  />
                </Form.Item>
                <Form.Item
                  label="详细解释"
                  name="full_desc"
                >
                  <TextArea
                    rows={6}
                    placeholder="请输入详细解释，支持较长文本"
                  />
                </Form.Item>
                <Form.Item
                  label="状态"
                  name="status"
                  valuePropName="checked"
                >
                  <Switch checkedChildren="启用" unCheckedChildren="停用" />
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




