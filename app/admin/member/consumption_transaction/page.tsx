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

interface ConsumptionTransaction {
  consumption_id: number;
  member_id: number;
  card_id: number | null;
  original_amount: number;
  discount_amount: number;
  payable_amount: number;
  paid_amount: number;
  pay_channel: string;
  status: number;
  points_used: number;
  points_earned: number;
  external_order_no: string | null;
  remark: string | null;
  created_at: string;
}

interface ConsumptionTransactionFormValues {
  member_id?: number;
  card_id?: number | null;
  original_amount?: number;
  discount_amount?: number;
  payable_amount?: number;
  paid_amount?: number;
  pay_channel?: string;
  status?: number;
  points_used?: number;
  points_earned?: number;
  external_order_no?: string;
  remark?: string;
}

export default function ConsumptionTransactionPage() {
  const [form] = Form.useForm<ConsumptionTransactionFormValues>();
  const [loading, setLoading] = useState(false);
  const [transactions, setTransactions] = useState<ConsumptionTransaction[]>([]);
  const [total, setTotal] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [modalVisible, setModalVisible] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState<ConsumptionTransaction | null>(null);
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

      const res = await fetch(`/api/admin/member/consumption_transaction?${params.toString()}`);
      const data = await res.json();
      if (data.success) {
        setTransactions(data.data || []);
        setTotal(data.total || 0);
        setCurrentPage(page);
        setPageSize(size);
      } else {
        message.error(data.error || "加载消费记录失败");
      }
    } catch (error) {
      console.error("加载消费记录失败:", error);
      message.error("加载消费记录失败");
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
    form.setFieldsValue({
      discount_amount: 0,
      status: 1,
      points_used: 0,
      points_earned: 0,
    });
    setModalVisible(true);
  };

  const handleEdit = (record: ConsumptionTransaction) => {
    setEditingTransaction(record);
    form.setFieldsValue({
      member_id: record.member_id,
      card_id: record.card_id || null,
      original_amount: Number(record.original_amount),
      discount_amount: Number(record.discount_amount),
      payable_amount: Number(record.payable_amount),
      paid_amount: Number(record.paid_amount),
      pay_channel: record.pay_channel,
      status: record.status,
      points_used: record.points_used,
      points_earned: record.points_earned,
      external_order_no: record.external_order_no || undefined,
      remark: record.remark || undefined,
    });
    setModalVisible(true);
  };

  const handleDelete = async (record: ConsumptionTransaction) => {
    try {
      const res = await fetch(
        `/api/admin/member/consumption_transaction?id=${record.consumption_id}`,
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
        original_amount: values.original_amount || 0,
        discount_amount: values.discount_amount ?? 0,
        payable_amount: values.payable_amount || 0,
        paid_amount: values.paid_amount || 0,
        pay_channel: values.pay_channel || null,
        status: values.status ?? 1,
        points_used: values.points_used ?? 0,
        points_earned: values.points_earned ?? 0,
        external_order_no: values.external_order_no || null,
        remark: values.remark || null,
      };

      let res: Response;
      if (editingTransaction) {
        res = await fetch("/api/admin/member/consumption_transaction", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            consumption_id: editingTransaction.consumption_id,
            ...payload,
          }),
        });
      } else {
        res = await fetch("/api/admin/member/consumption_transaction", {
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

  const getPayChannelName = (channel: string) => {
    const channelMap: Record<string, string> = {
      BALANCE: "余额",
      CASH: "现金",
      WECHAT: "微信",
      ALIPAY: "支付宝",
      CARD: "银行卡",
    };
    return channelMap[channel] || channel;
  };

  const columns: ColumnsType<ConsumptionTransaction> = [
    {
      title: "ID",
      dataIndex: "consumption_id",
      key: "consumption_id",
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
      title: "原始金额",
      dataIndex: "original_amount",
      key: "original_amount",
      width: 120,
      render: (value: number) => `¥${Number(value).toFixed(2)}`,
    },
    {
      title: "优惠金额",
      dataIndex: "discount_amount",
      key: "discount_amount",
      width: 120,
      render: (value: number) => `¥${Number(value).toFixed(2)}`,
    },
    {
      title: "应付金额",
      dataIndex: "payable_amount",
      key: "payable_amount",
      width: 120,
      render: (value: number) => `¥${Number(value).toFixed(2)}`,
    },
    {
      title: "实付金额",
      dataIndex: "paid_amount",
      key: "paid_amount",
      width: 120,
      render: (value: number) => `¥${Number(value).toFixed(2)}`,
    },
    {
      title: "支付渠道",
      dataIndex: "pay_channel",
      key: "pay_channel",
      width: 100,
      render: (value: string) => getPayChannelName(value),
    },
    {
      title: "状态",
      dataIndex: "status",
      key: "status",
      width: 80,
      render: (value: number) => (value === 1 ? "成功" : "作废/撤销"),
    },
    {
      title: "使用积分",
      dataIndex: "points_used",
      key: "points_used",
      width: 100,
      render: (value: number) => value.toLocaleString(),
    },
    {
      title: "获得积分",
      dataIndex: "points_earned",
      key: "points_earned",
      width: 100,
      render: (value: number) => value.toLocaleString(),
    },
    {
      title: "外部订单号",
      dataIndex: "external_order_no",
      key: "external_order_no",
      width: 150,
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
            title="确定要删除该消费记录吗？"
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
              <h1 className="text-3xl font-bold text-gray-900">消费记录管理</h1>
              <Button
                type="primary"
                icon={<PlusOutlined />}
                onClick={handleAdd}
              >
                新增记录
              </Button>
            </div>

            <Table<ConsumptionTransaction>
              columns={columns}
              dataSource={transactions}
              rowKey="consumption_id"
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
              scroll={{ x: 1600 }}
            />

            <Modal
              title={editingTransaction ? "编辑消费记录" : "新增消费记录"}
              open={modalVisible}
              onOk={handleModalOk}
              onCancel={() => {
                setModalVisible(false);
                form.resetFields();
              }}
              destroyOnClose
              width={700}
            >
              <Form<ConsumptionTransactionFormValues>
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
                  label="原始金额"
                  name="original_amount"
                  rules={[
                    { required: true, message: "请输入原始金额" },
                    { type: "number", min: 0, message: "原始金额不能小于0" },
                  ]}
                >
                  <InputNumber
                    style={{ width: "100%" }}
                    min={0}
                    precision={2}
                    prefix="¥"
                    placeholder="请输入原始消费金额"
                  />
                </Form.Item>
                <Form.Item
                  label="优惠金额"
                  name="discount_amount"
                  rules={[
                    { required: true, message: "请输入优惠金额" },
                    { type: "number", min: 0, message: "优惠金额不能小于0" },
                  ]}
                  initialValue={0}
                >
                  <InputNumber
                    style={{ width: "100%" }}
                    min={0}
                    precision={2}
                    prefix="¥"
                    placeholder="请输入优惠金额"
                  />
                </Form.Item>
                <Form.Item
                  label="应付金额"
                  name="payable_amount"
                  rules={[
                    { required: true, message: "请输入应付金额" },
                    { type: "number", min: 0, message: "应付金额不能小于0" },
                  ]}
                >
                  <InputNumber
                    style={{ width: "100%" }}
                    min={0}
                    precision={2}
                    prefix="¥"
                    placeholder="请输入实际应付金额"
                  />
                </Form.Item>
                <Form.Item
                  label="实付金额"
                  name="paid_amount"
                  rules={[
                    { required: true, message: "请输入实付金额" },
                    { type: "number", min: 0, message: "实付金额不能小于0" },
                  ]}
                >
                  <InputNumber
                    style={{ width: "100%" }}
                    min={0}
                    precision={2}
                    prefix="¥"
                    placeholder="请输入实际支付金额"
                  />
                </Form.Item>
                <Form.Item
                  label="支付渠道"
                  name="pay_channel"
                  rules={[{ required: true, message: "请选择支付渠道" }]}
                >
                  <Select placeholder="请选择支付渠道">
                    <Select.Option value="BALANCE">余额</Select.Option>
                    <Select.Option value="CASH">现金</Select.Option>
                    <Select.Option value="WECHAT">微信</Select.Option>
                    <Select.Option value="ALIPAY">支付宝</Select.Option>
                    <Select.Option value="CARD">银行卡</Select.Option>
                  </Select>
                </Form.Item>
                <Form.Item
                  label="状态"
                  name="status"
                  initialValue={1}
                  rules={[{ required: true, message: "请选择状态" }]}
                >
                  <Select>
                    <Select.Option value={1}>成功</Select.Option>
                    <Select.Option value={0}>作废/撤销</Select.Option>
                  </Select>
                </Form.Item>
                <Form.Item
                  label="使用积分"
                  name="points_used"
                  rules={[
                    { required: true, message: "请输入使用积分" },
                    { type: "number", min: 0, message: "使用积分不能小于0" },
                  ]}
                  initialValue={0}
                >
                  <InputNumber
                    style={{ width: "100%" }}
                    min={0}
                    placeholder="请输入本次消费使用的积分"
                  />
                </Form.Item>
                <Form.Item
                  label="获得积分"
                  name="points_earned"
                  rules={[
                    { required: true, message: "请输入获得积分" },
                    { type: "number", min: 0, message: "获得积分不能小于0" },
                  ]}
                  initialValue={0}
                >
                  <InputNumber
                    style={{ width: "100%" }}
                    min={0}
                    placeholder="请输入本次消费获得的积分"
                  />
                </Form.Item>
                <Form.Item label="外部订单号" name="external_order_no">
                  <Input placeholder="请输入外部订单号（可选）" />
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

