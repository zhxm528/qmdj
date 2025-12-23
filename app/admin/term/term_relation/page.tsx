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
import dayjs from "dayjs";
import TermTimeline from "@/components/TermTimeline";

interface Term {
  id: string;
  name: string;
  term_key: string;
}

interface TermRelation {
  id: string;
  from_term_id: string;
  to_term_id: string;
  from_term_name: string | null;
  to_term_name: string | null;
  relation_type: string;
  created_at: string;
  updated_at: string;
}

interface TermRelationFormValues {
  from_term_id?: string;
  to_term_id?: string;
  relation_type?: string;
}

const RELATION_TYPES = [
  { value: "related", label: "相关" },
  { value: "parent", label: "父级" },
  { value: "child", label: "子级" },
  { value: "synonym", label: "同义词" },
  { value: "antonym", label: "反义词" },
];

export default function TermRelationPage() {
  const [form] = Form.useForm<TermRelationFormValues>();
  const [loading, setLoading] = useState(false);
  const [relations, setRelations] = useState<TermRelation[]>([]);
  const [total, setTotal] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [modalVisible, setModalVisible] = useState(false);
  const [editingRelation, setEditingRelation] = useState<TermRelation | null>(null);
  const [terms, setTerms] = useState<Term[]>([]);

  const loadTerms = async () => {
    try {
      const res = await fetch("/api/admin/term/term?pageSize=-1");
      const data = await res.json();
      if (data.success && data.data) {
        setTerms(data.data);
      }
    } catch (error) {
      console.error("加载术语列表失败:", error);
    }
  };

  const loadRelations = async (page: number, size: number) => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.set("page", String(page));
      params.set("pageSize", String(size));

      const res = await fetch(`/api/admin/term/term_relation?${params.toString()}`);
      const data = await res.json();
      if (data.success) {
        setRelations(data.data || []);
        setTotal(data.total || 0);
        setCurrentPage(page);
        setPageSize(size);
      } else {
        message.error(data.error || "加载术语关系列表失败");
      }
    } catch (error) {
      console.error("加载术语关系列表失败:", error);
      message.error("加载术语关系列表失败");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadRelations(1, 10);
    loadTerms();
  }, []);

  const handleAdd = () => {
    setEditingRelation(null);
    form.resetFields();
    form.setFieldsValue({
      relation_type: "related",
    });
    setModalVisible(true);
  };

  const handleEdit = (record: TermRelation) => {
    setEditingRelation(record);
    form.setFieldsValue({
      from_term_id: record.from_term_id,
      to_term_id: record.to_term_id,
      relation_type: record.relation_type,
    });
    setModalVisible(true);
  };

  const handleDelete = async (record: TermRelation) => {
    try {
      const res = await fetch(
        `/api/admin/term/term_relation?id=${record.id}`,
        {
          method: "DELETE",
        }
      );
      const data = await res.json();
      if (data.success) {
        message.success("删除成功");
        loadRelations(currentPage, pageSize);
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
        from_term_id: values.from_term_id || null,
        to_term_id: values.to_term_id || null,
        relation_type: values.relation_type || "related",
      };

      let res: Response;
      if (editingRelation) {
        res = await fetch("/api/admin/term/term_relation", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            id: editingRelation.id,
            ...payload,
          }),
        });
      } else {
        res = await fetch("/api/admin/term/term_relation", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
      }

      const data = await res.json();
      if (data.success) {
        message.success(editingRelation ? "更新成功" : "创建成功");
        setModalVisible(false);
        form.resetFields();
        loadRelations(currentPage, pageSize);
      } else {
        message.error(data.error || "保存失败");
      }
    } catch (error) {
      console.error("保存失败:", error);
    }
  };

  const handlePageChange = (page: number, size: number) => {
    loadRelations(page, size);
  };

  const getTermName = (id: string) => {
    const term = terms.find((t) => t.id === id);
    return term ? `${term.name} (${term.term_key})` : id;
  };

  const getRelationTypeLabel = (type: string) => {
    const relationType = RELATION_TYPES.find((r) => r.value === type);
    return relationType ? relationType.label : type;
  };

  const columns: ColumnsType<TermRelation> = [
    {
      title: "ID",
      dataIndex: "id",
      key: "id",
      width: 100,
      fixed: "left",
    },
    {
      title: "源术语",
      dataIndex: "from_term_name",
      key: "from_term_name",
      width: 200,
      render: (value: string | null, record: TermRelation) =>
        value || getTermName(record.from_term_id),
    },
    {
      title: "目标术语",
      dataIndex: "to_term_name",
      key: "to_term_name",
      width: 200,
      render: (value: string | null, record: TermRelation) =>
        value || getTermName(record.to_term_id),
    },
    {
      title: "关系类型",
      dataIndex: "relation_type",
      key: "relation_type",
      width: 120,
      render: (value: string) => getRelationTypeLabel(value),
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
            title="确定要删除该关系吗？"
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
            {/* 时间轴导航 */}
            <TermTimeline currentStep={2} />

            <div className="flex items-center justify-between mb-6">
              <h1 className="text-3xl font-bold text-gray-900">术语关系</h1>
              <Button
                type="primary"
                icon={<PlusOutlined />}
                onClick={handleAdd}
              >
                新增关系
              </Button>
            </div>

            <Table<TermRelation>
              columns={columns}
              dataSource={relations}
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
              title={editingRelation ? "编辑术语关系" : "新增术语关系"}
              open={modalVisible}
              onOk={handleModalOk}
              onCancel={() => {
                setModalVisible(false);
                form.resetFields();
              }}
              destroyOnClose
              width={700}
            >
              <Form<TermRelationFormValues>
                form={form}
                layout="vertical"
                preserve={false}
              >
                {editingRelation && (
                  <Form.Item label="ID" name="id">
                    <span>{editingRelation.id}</span>
                  </Form.Item>
                )}
                <Form.Item
                  label="源术语"
                  name="from_term_id"
                  rules={[{ required: true, message: "请选择源术语" }]}
                >
                  <Select
                    placeholder="请选择源术语"
                    showSearch
                    optionFilterProp="label"
                    options={terms.map((t) => ({
                      value: t.id,
                      label: `${t.name} (${t.term_key})`,
                    }))}
                  />
                </Form.Item>
                <Form.Item
                  label="目标术语"
                  name="to_term_id"
                  rules={[{ required: true, message: "请选择目标术语" }]}
                >
                  <Select
                    placeholder="请选择目标术语"
                    showSearch
                    optionFilterProp="label"
                    options={terms.map((t) => ({
                      value: t.id,
                      label: `${t.name} (${t.term_key})`,
                    }))}
                  />
                </Form.Item>
                <Form.Item
                  label="关系类型"
                  name="relation_type"
                  rules={[{ required: true, message: "请选择关系类型" }]}
                >
                  <Select
                    placeholder="请选择关系类型"
                    options={RELATION_TYPES}
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
