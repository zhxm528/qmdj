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
  InputNumber,
  DatePicker,
  Select,
  Switch,
  Space,
  Popconfirm,
  message,
} from "antd";
import zhCN from "antd/locale/zh_CN";
import type { ColumnsType } from "antd/es/table";
import { PlusOutlined, EditOutlined, DeleteOutlined } from "@ant-design/icons";
import dayjs, { Dayjs } from "dayjs";

interface MemberCard {
  card_id: number;
  card_no: string;
  member_id: number;
  is_primary: boolean;
  status: number;
  issued_at: string;
  expired_at: string | null;
  remark: string | null;
}

interface MemberCardFormValues {
  card_no?: string;
  member_id?: number;
  is_primary?: boolean;
  status?: number;
  expired_at?: Dayjs | null;
  remark?: string;
}

export default function MemberCardPage() {
  const [form] = Form.useForm<MemberCardFormValues>();
  const [loading, setLoading] = useState(false);
  const [cards, setCards] = useState<MemberCard[]>([]);
  const [total, setTotal] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [modalVisible, setModalVisible] = useState(false);
  const [editingCard, setEditingCard] = useState<MemberCard | null>(null);
  const [members, setMembers] = useState<Array<{ member_id: number; full_name: string | null; mobile: string | null }>>([]);

  // 加载会员列表（用于下拉选择）
  const loadMembers = async () => {
    try {
      const res = await fetch("/api/admin/member/member?pageSize=-1");
      const data = await res.json();
      if (data.success && data.data) {
        setMembers(data.data);
      }
    } catch (error) {
      console.error("加载会员列表失败:", error);
    }
  };

  const loadCards = async (page: number, size: number) => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.set("page", String(page));
      params.set("pageSize", String(size));

      const res = await fetch(`/api/admin/member/member_card?${params.toString()}`);
      const data = await res.json();
      if (data.success) {
        setCards(data.data || []);
        setTotal(data.total || 0);
        setCurrentPage(page);
        setPageSize(size);
      } else {
        message.error(data.error || "加载会员卡列表失败");
      }
    } catch (error) {
      console.error("加载会员卡列表失败:", error);
      message.error("加载会员卡列表失败");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadMembers();
    loadCards(1, 10);
  }, []);

  const handleAdd = () => {
    setEditingCard(null);
    form.resetFields();
    form.setFieldsValue({
      is_primary: true,
      status: 1,
    });
    setModalVisible(true);
  };

  const handleEdit = (record: MemberCard) => {
    setEditingCard(record);
    form.setFieldsValue({
      card_no: record.card_no,
      member_id: record.member_id,
      is_primary: record.is_primary,
      status: record.status,
      expired_at: record.expired_at ? dayjs(record.expired_at) : null,
      remark: record.remark || undefined,
    });
    setModalVisible(true);
  };

  const handleDelete = async (record: MemberCard) => {
    try {
      const res = await fetch(
        `/api/admin/member/member_card?id=${record.card_id}`,
        {
          method: "DELETE",
        }
      );
      const data = await res.json();
      if (data.success) {
        message.success("删除成功");
        loadCards(currentPage, pageSize);
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
        card_no: values.card_no || null,
        member_id: values.member_id || null,
        is_primary: values.is_primary ?? true,
        status: values.status ?? 1,
        expired_at: values.expired_at
          ? values.expired_at.format("YYYY-MM-DD HH:mm:ss")
          : null,
        remark: values.remark || null,
      };

      let res: Response;
      if (editingCard) {
        res = await fetch("/api/admin/member/member_card", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            card_id: editingCard.card_id,
            ...payload,
          }),
        });
      } else {
        res = await fetch("/api/admin/member/member_card", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
      }

      const data = await res.json();
      if (data.success) {
        message.success(editingCard ? "更新成功" : "创建成功");
        setModalVisible(false);
        form.resetFields();
        loadCards(currentPage, pageSize);
      } else {
        message.error(data.error || "保存失败");
      }
    } catch (error) {
      console.error("保存失败:", error);
      // 校验错误已在表单内提示，这里只处理网络错误
    }
  };

  const handlePageChange = (page: number, size: number) => {
    loadCards(page, size);
  };

  const getMemberName = (memberId: number) => {
    const member = members.find((m) => m.member_id === memberId);
    if (member) {
      return member.full_name || member.mobile || `ID: ${memberId}`;
    }
    return `ID: ${memberId}`;
  };

  const columns: ColumnsType<MemberCard> = [
    {
      title: "ID",
      dataIndex: "card_id",
      key: "card_id",
      width: 80,
      fixed: "left",
    },
    {
      title: "会员卡号",
      dataIndex: "card_no",
      key: "card_no",
      width: 150,
    },
    {
      title: "会员ID",
      dataIndex: "member_id",
      key: "member_id",
      width: 100,
      render: (value: number) => getMemberName(value),
    },
    {
      title: "是否主卡",
      dataIndex: "is_primary",
      key: "is_primary",
      width: 100,
      render: (value: boolean) => (value ? "是" : "否"),
    },
    {
      title: "状态",
      dataIndex: "status",
      key: "status",
      width: 100,
      render: (value: number) => (value === 1 ? "正常" : "挂失/注销"),
    },
    {
      title: "发卡时间",
      dataIndex: "issued_at",
      key: "issued_at",
      width: 180,
      render: (value: string) =>
        value ? dayjs(value).format("YYYY-MM-DD HH:mm:ss") : "-",
    },
    {
      title: "过期时间",
      dataIndex: "expired_at",
      key: "expired_at",
      width: 180,
      render: (value: string | null) =>
        value ? dayjs(value).format("YYYY-MM-DD HH:mm:ss") : "-",
    },
    {
      title: "备注",
      dataIndex: "remark",
      key: "remark",
      ellipsis: true,
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
            title="确定要删除该会员卡吗？"
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
              <h1 className="text-3xl font-bold text-gray-900">会员卡管理</h1>
              <Button
                type="primary"
                icon={<PlusOutlined />}
                onClick={handleAdd}
              >
                新增会员卡
              </Button>
            </div>

            <Table<MemberCard>
              columns={columns}
              dataSource={cards}
              rowKey="card_id"
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
              scroll={{ x: 1200 }}
            />

            <Modal
              title={editingCard ? "编辑会员卡" : "新增会员卡"}
              open={modalVisible}
              onOk={handleModalOk}
              onCancel={() => {
                setModalVisible(false);
                form.resetFields();
              }}
              destroyOnClose
              width={600}
            >
              <Form<MemberCardFormValues>
                form={form}
                layout="vertical"
                preserve={false}
              >
                <Form.Item
                  label="会员卡号"
                  name="card_no"
                  rules={[{ required: true, message: "请输入会员卡号" }]}
                >
                  <Input placeholder="请输入会员卡号" />
                </Form.Item>
                <Form.Item
                  label="会员"
                  name="member_id"
                  rules={[{ required: true, message: "请选择会员" }]}
                >
                  <Select
                    showSearch
                    placeholder="请选择会员"
                    optionFilterProp="children"
                    filterOption={(input, option) =>
                      (option?.label ?? "").toLowerCase().includes(input.toLowerCase())
                    }
                    options={members.map((m) => ({
                      value: m.member_id,
                      label: `${m.full_name || ""} ${m.mobile || ""} (ID: ${m.member_id})`.trim(),
                    }))}
                  />
                </Form.Item>
                <Form.Item
                  label="是否主卡"
                  name="is_primary"
                  valuePropName="checked"
                  initialValue={true}
                >
                  <Switch checkedChildren="是" unCheckedChildren="否" />
                </Form.Item>
                <Form.Item
                  label="状态"
                  name="status"
                  initialValue={1}
                  rules={[{ required: true, message: "请选择状态" }]}
                >
                  <Select>
                    <Select.Option value={1}>正常</Select.Option>
                    <Select.Option value={0}>挂失/注销</Select.Option>
                  </Select>
                </Form.Item>
                <Form.Item label="过期时间" name="expired_at">
                  <DatePicker
                    showTime
                    style={{ width: "100%" }}
                    format="YYYY-MM-DD HH:mm:ss"
                  />
                </Form.Item>
                <Form.Item label="备注" name="remark">
                  <Input.TextArea rows={3} placeholder="请输入备注" />
                </Form.Item>
              </Form>
            </Modal>
          </div>
        </div>
      </Layout>
    </ConfigProvider>
  );
}
