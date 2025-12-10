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
  Select,
  Space,
  Popconfirm,
  message,
} from "antd";
import zhCN from "antd/locale/zh_CN";
import type { ColumnsType } from "antd/es/table";
import { PlusOutlined, EditOutlined, DeleteOutlined } from "@ant-design/icons";
import dayjs from "dayjs";

interface PointsTransaction {
  points_txn_id: number;
  member_id: number;
  card_id: number | null;
  change_type: string;
  change_points: number;
  balance_after: number;
  related_type: string | null;
  related_id: number | null;
  remark: string | null;
  created_at: string;
}

interface PointsTransactionFormValues {
  member_id?: number;
  card_id?: number | null;
  change_type?: string;
  change_points?: number;
  balance_after?: number;
  related_type?: string | null;
  related_id?: number | null;
  remark?: string;
}

export default function PointsTransactionPage() {
  const [form] = Form.useForm<PointsTransactionFormValues>();
  const [loading, setLoading] = useState(false);
  const [transactions, setTransactions] = useState<PointsTransaction[]>([]);
  const [total, setTotal] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [modalVisible, setModalVisible] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState<PointsTransaction | null>(null);
  const [members, setMembers] = useState<Array<{ member_id: number; full_name: string | null; mobile: string | null }>>([]);
  const [cards, setCards] = useState<Array<{ card_id: number; card_no: string; member_id: number }>>([]);

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

  // 加载会员卡列表（用于下拉选择）
  const loadCards = async () => {
    try {
      const res = await fetch("/api/admin/member/member_card?pageSize=-1");
      const data = await res.json();
      if (data.success && data.data) {
        setCards(data.data);
      }
    } catch (error) {
      console.error("加载会员卡列表失败:", error);
    }
  };

  const loadTransactions = async (page: number, size: number) => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.set("page", String(page));
      params.set("pageSize", String(size));

      const res = await fetch(`/api/admin/member/points_transaction?${params.toString()}`);
      const data = await res.json();
      if (data.success) {
        setTransactions(data.data || []);
        setTotal(data.total || 0);
        setCurrentPage(page);
        setPageSize(size);
      } else {
        message.error(data.error || "加载积分变动记录失败");
      }
    } catch (error) {
      console.error("加载积分变动记录失败:", error);
      message.error("加载积分变动记录失败");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadMembers();
    loadCards();
    loadTransactions(1, 10);
  }, []);

  const handleAdd = () => {
    setEditingTransaction(null);
    form.resetFields();
    setModalVisible(true);
  };

  const handleEdit = (record: PointsTransaction) => {
    setEditingTransaction(record);
    form.setFieldsValue({
      member_id: record.member_id,
      card_id: record.card_id || null,
      change_type: record.change_type,
      change_points: record.change_points,
      balance_after: record.balance_after,
      related_type: record.related_type || null,
      related_id: record.related_id || null,
      remark: record.remark || undefined,
    });
    setModalVisible(true);
  };

  const handleDelete = async (record: PointsTransaction) => {
    try {
      const res = await fetch(
        `/api/admin/member/points_transaction?id=${record.points_txn_id}`,
        {
          method: "DELETE",
        }
      );
      const data = await res.json();
      if (data.success) {
        message.success("删除成功");
        loadTransactions(currentPage, pageSize);
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
        member_id: values.member_id || null,
        card_id: values.card_id || null,
        change_type: values.change_type || null,
        change_points: values.change_points || 0,
        balance_after: values.balance_after || 0,
        related_type: values.related_type || null,
        related_id: values.related_id || null,
        remark: values.remark || null,
      };

      let res: Response;
      if (editingTransaction) {
        res = await fetch("/api/admin/member/points_transaction", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            points_txn_id: editingTransaction.points_txn_id,
            ...payload,
          }),
        });
      } else {
        res = await fetch("/api/admin/member/points_transaction", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
      }

      const data = await res.json();
      if (data.success) {
        message.success(editingTransaction ? "更新成功" : "创建成功");
        setModalVisible(false);
        form.resetFields();
        loadTransactions(currentPage, pageSize);
      } else {
        message.error(data.error || "保存失败");
      }
    } catch (error) {
      console.error("保存失败:", error);
      // 校验错误已在表单内提示，这里只处理网络错误
    }
  };

  const handlePageChange = (page: number, size: number) => {
    loadTransactions(page, size);
  };

  const getMemberName = (memberId: number) => {
    const member = members.find((m) => m.member_id === memberId);
    if (member) {
      return member.full_name || member.mobile || `ID: ${memberId}`;
    }
    return `ID: ${memberId}`;
  };

  const getCardNo = (cardId: number | null) => {
    if (!cardId) return "-";
    const card = cards.find((c) => c.card_id === cardId);
    return card ? card.card_no : `ID: ${cardId}`;
  };

  const getChangeTypeName = (type: string) => {
    const typeMap: Record<string, string> = {
      EARN: "获得",
      REDEEM: "兑换",
      ADJUST: "调整",
      EXPIRE: "过期",
    };
    return typeMap[type] || type;
  };

  const columns: ColumnsType<PointsTransaction> = [
    {
      title: "ID",
      dataIndex: "points_txn_id",
      key: "points_txn_id",
      width: 80,
      fixed: "left",
    },
    {
      title: "会员",
      dataIndex: "member_id",
      key: "member_id",
      width: 150,
      render: (value: number) => getMemberName(value),
    },
    {
      title: "会员卡号",
      dataIndex: "card_id",
      key: "card_id",
      width: 120,
      render: (value: number | null) => getCardNo(value),
    },
    {
      title: "变动类型",
      dataIndex: "change_type",
      key: "change_type",
      width: 100,
      render: (value: string) => getChangeTypeName(value),
    },
    {
      title: "变动积分",
      dataIndex: "change_points",
      key: "change_points",
      width: 120,
      render: (value: number) => {
        const color = value >= 0 ? "text-green-600" : "text-red-600";
        const sign = value >= 0 ? "+" : "";
        return <span className={color}>{sign}{value.toLocaleString()}</span>;
      },
    },
    {
      title: "变动后余额",
      dataIndex: "balance_after",
      key: "balance_after",
      width: 120,
      render: (value: number) => value.toLocaleString(),
    },
    {
      title: "关联类型",
      dataIndex: "related_type",
      key: "related_type",
      width: 120,
      render: (value: string | null) => value || "-",
    },
    {
      title: "关联ID",
      dataIndex: "related_id",
      key: "related_id",
      width: 100,
      render: (value: number | null) => value || "-",
    },
    {
      title: "备注",
      dataIndex: "remark",
      key: "remark",
      ellipsis: true,
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
            title="确定要删除该积分变动记录吗？"
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
              <h1 className="text-3xl font-bold text-gray-900">积分变动记录</h1>
              <Button
                type="primary"
                icon={<PlusOutlined />}
                onClick={handleAdd}
              >
                新增记录
              </Button>
            </div>

            <Table<PointsTransaction>
              columns={columns}
              dataSource={transactions}
              rowKey="points_txn_id"
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
              scroll={{ x: 1400 }}
            />

            <Modal
              title={editingTransaction ? "编辑积分变动记录" : "新增积分变动记录"}
              open={modalVisible}
              onOk={handleModalOk}
              onCancel={() => {
                setModalVisible(false);
                form.resetFields();
              }}
              destroyOnClose
              width={700}
            >
              <Form<PointsTransactionFormValues>
                form={form}
                layout="vertical"
                preserve={false}
              >
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
                <Form.Item label="会员卡" name="card_id">
                  <Select
                    showSearch
                    placeholder="请选择会员卡（可选）"
                    allowClear
                    optionFilterProp="children"
                    filterOption={(input, option) =>
                      (option?.label ?? "").toLowerCase().includes(input.toLowerCase())
                    }
                    options={cards.map((c) => ({
                      value: c.card_id,
                      label: `${c.card_no} (会员ID: ${c.member_id})`,
                    }))}
                  />
                </Form.Item>
                <Form.Item
                  label="变动类型"
                  name="change_type"
                  rules={[{ required: true, message: "请选择变动类型" }]}
                >
                  <Select placeholder="请选择变动类型">
                    <Select.Option value="EARN">获得</Select.Option>
                    <Select.Option value="REDEEM">兑换</Select.Option>
                    <Select.Option value="ADJUST">调整</Select.Option>
                    <Select.Option value="EXPIRE">过期</Select.Option>
                  </Select>
                </Form.Item>
                <Form.Item
                  label="变动积分"
                  name="change_points"
                  rules={[
                    { required: true, message: "请输入变动积分" },
                    { type: "number", message: "变动积分必须是数字" },
                  ]}
                  tooltip="正数表示增加积分，负数表示减少积分"
                >
                  <InputNumber
                    style={{ width: "100%" }}
                    placeholder="请输入变动积分（正数增加，负数减少）"
                  />
                </Form.Item>
                <Form.Item
                  label="变动后余额"
                  name="balance_after"
                  rules={[
                    { required: true, message: "请输入变动后余额" },
                    { type: "number", min: 0, message: "变动后余额不能小于0" },
                  ]}
                >
                  <InputNumber
                    style={{ width: "100%" }}
                    min={0}
                    placeholder="请输入变动后会员可用积分"
                  />
                </Form.Item>
                <Form.Item label="关联类型" name="related_type">
                  <Select placeholder="请选择关联类型（可选）" allowClear>
                    <Select.Option value="RECHARGE">充值</Select.Option>
                    <Select.Option value="CONSUMPTION">消费</Select.Option>
                    <Select.Option value="MANUAL">手动</Select.Option>
                    <Select.Option value="REGISTER">注册</Select.Option>
                  </Select>
                </Form.Item>
                <Form.Item label="关联ID" name="related_id">
                  <InputNumber
                    style={{ width: "100%" }}
                    placeholder="请输入关联记录ID（可选）"
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

