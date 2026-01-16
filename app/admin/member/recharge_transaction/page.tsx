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
import dayjs from "dayjs";

interface RechargeTransaction {
  recharge_id: number;
  member_id: number;
  card_id: number | null;
  amount: number;
  bonus_points: number;
  payment_method: string;
  status: number;
  external_order_no: string | null;
  operator_id: string | null;
  remark: string | null;
  created_at: string;
}

interface RechargeTransactionFormValues {
  member_id?: number;
  card_id?: number | null;
  amount?: number;
  bonus_points?: number;
  payment_method?: string;
  status?: number;
  external_order_no?: string;
  operator_id?: string;
  remark?: string;
}

interface QueryFormValues {
  member_id?: number;
  card_no?: string;
  payment_method?: string[];
  status?: number[];
}

export default function RechargeTransactionPage() {
  const [form] = Form.useForm<RechargeTransactionFormValues>();
  const [queryForm] = Form.useForm<QueryFormValues>();
  const [loading, setLoading] = useState(false);
  const [transactions, setTransactions] = useState<RechargeTransaction[]>([]);
  const [total, setTotal] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [modalVisible, setModalVisible] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState<RechargeTransaction | null>(null);
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

  const loadTransactions = async (page: number, size: number, filters?: QueryFormValues) => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.set("page", String(page));
      params.set("pageSize", String(size));

      // 添加查询条件
      if (filters) {
        if (filters.member_id) {
          params.set("member_id", String(filters.member_id));
        }
        if (filters.card_no) {
          params.set("card_no", filters.card_no);
        }
        if (filters.payment_method && filters.payment_method.length > 0) {
          params.set("payment_method", filters.payment_method.join(","));
        }
        if (filters.status && filters.status.length > 0) {
          params.set("status", filters.status.join(","));
        }
      }

      const res = await fetch(`/api/admin/member/recharge_transaction?${params.toString()}`);
      const data = await res.json();
      if (data.success) {
        setTransactions(data.data || []);
        setTotal(data.total || 0);
        setCurrentPage(page);
        setPageSize(size);
      } else {
        message.error(data.error || "加载充值记录失败");
      }
    } catch (error) {
      console.error("加载充值记录失败:", error);
      message.error("加载充值记录失败");
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
      bonus_points: 0,
      status: 1,
    });
    setModalVisible(true);
  };

  const handleEdit = (record: RechargeTransaction) => {
    setEditingTransaction(record);
    form.setFieldsValue({
      member_id: record.member_id,
      card_id: record.card_id || null,
      amount: Number(record.amount),
      bonus_points: record.bonus_points,
      payment_method: record.payment_method,
      status: record.status,
      external_order_no: record.external_order_no || undefined,
      operator_id: record.operator_id || undefined,
      remark: record.remark || undefined,
    });
    setModalVisible(true);
  };

  const handleDelete = async (record: RechargeTransaction) => {
    try {
      const res = await fetch(
        `/api/admin/member/recharge_transaction?id=${record.recharge_id}`,
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
        amount: values.amount || 0,
        bonus_points: values.bonus_points ?? 0,
        payment_method: values.payment_method || null,
        status: values.status ?? 1,
        external_order_no: values.external_order_no || null,
        operator_id: values.operator_id || null,
        remark: values.remark || null,
      };

      let res: Response;
      if (editingTransaction) {
        res = await fetch("/api/admin/member/recharge_transaction", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            recharge_id: editingTransaction.recharge_id,
            ...payload,
          }),
        });
      } else {
        res = await fetch("/api/admin/member/recharge_transaction", {
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
    const filters = queryForm.getFieldsValue();
    loadTransactions(page, size, filters);
  };

  const handleSearch = () => {
    const filters = queryForm.getFieldsValue();
    loadTransactions(1, pageSize, filters);
  };

  const handleReset = () => {
    queryForm.resetFields();
    loadTransactions(1, pageSize);
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

  const getPaymentMethodName = (method: string) => {
    const methodMap: Record<string, string> = {
      CASH: "现金",
      WECHAT: "微信",
      ALIPAY: "支付宝",
      CARD: "银行卡",
      SYSTEM_GIFT: "系统赠送",
    };
    return methodMap[method] || method;
  };

  const getStatusName = (status: number) => {
    const statusMap: Record<number, string> = {
      1: "成功",
      0: "失败",
      2: "待支付",
      3: "已退款",
    };
    return statusMap[status] || `状态${status}`;
  };

  const columns: ColumnsType<RechargeTransaction> = [
    {
      title: "ID",
      dataIndex: "recharge_id",
      key: "recharge_id",
      width: 80,
      fixed: "left",
      align: "center",
    },
    {
      title: "会员",
      dataIndex: "member_id",
      key: "member_id",
      width: 180,
      render: (value: number) => getMemberName(value),
    },
    {
      title: "会员卡号",
      dataIndex: "card_id",
      key: "card_id",
      width: 220,
      render: (value: number | null) => getCardNo(value),
    },
    {
      title: "充值金额",
      dataIndex: "amount",
      key: "amount",
      width: 130,
      align: "right",
      render: (value: number) => `¥${Number(value).toFixed(2)}`,
    },
    {
      title: "赠送积分",
      dataIndex: "bonus_points",
      key: "bonus_points",
      width: 120,
      align: "right",
      render: (value: number) => value.toLocaleString(),
    },
    {
      title: "支付方式",
      dataIndex: "payment_method",
      key: "payment_method",
      width: 120,
      align: "center",
      render: (value: string) => getPaymentMethodName(value),
    },
    {
      title: "状态",
      dataIndex: "status",
      key: "status",
      width: 100,
      align: "center",
      render: (value: number) => getStatusName(value),
    },
    {
      title: "外部订单号",
      dataIndex: "external_order_no",
      key: "external_order_no",
      width: 180,
      ellipsis: true,
      render: (value: string | null) => value || "-",
    },
    {
      title: "操作员",
      dataIndex: "operator_id",
      key: "operator_id",
      width: 120,
      align: "center",
      render: (value: string | null) => value || "-",
    },
    {
      title: "创建时间",
      dataIndex: "created_at",
      key: "created_at",
      width: 180,
      align: "center",
      render: (value: string) =>
        value ? dayjs(value).format("YYYY-MM-DD HH:mm:ss") : "-",
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
            title="确定要删除该充值记录吗？"
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
              <AdminBreadcrumb title="充值记录管理" />
              <Button
                type="primary"
                icon={<PlusOutlined />}
                onClick={handleAdd}
              >
                新增记录
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
                    <Form.Item name="member_id" label="会员" style={{ marginBottom: '10px' }}>
                      <Select
                        showSearch
                        placeholder="请选择会员"
                        allowClear
                        optionFilterProp="label"
                        filterOption={(input, option) =>
                          (option?.label ?? "").toLowerCase().includes(input.toLowerCase())
                        }
                        options={members.map((m) => ({
                          value: m.member_id,
                          label: `${m.full_name || ""} ${m.mobile || ""} (ID: ${m.member_id})`.trim(),
                        }))}
                      />
                    </Form.Item>
                  </Col>
                  <Col xs={24} sm={12} md={6}>
                    <Form.Item name="card_no" label="会员卡号" style={{ marginBottom: '10px' }}>
                      <Input placeholder="请输入会员卡号" />
                    </Form.Item>
                  </Col>
                  <Col xs={24} sm={12} md={6}>
                    <Form.Item name="payment_method" label="支付方式" style={{ marginBottom: '10px' }}>
                      <Select
                        mode="multiple"
                        placeholder="请选择支付方式"
                        allowClear
                      >
                        <Select.Option value="CASH">现金</Select.Option>
                        <Select.Option value="WECHAT">微信</Select.Option>
                        <Select.Option value="ALIPAY">支付宝</Select.Option>
                        <Select.Option value="CARD">银行卡</Select.Option>
                        <Select.Option value="SYSTEM_GIFT">系统赠送</Select.Option>
                      </Select>
                    </Form.Item>
                  </Col>
                  <Col xs={24} sm={12} md={6}>
                    <Form.Item name="status" label="状态" style={{ marginBottom: '10px' }}>
                      <Select
                        mode="multiple"
                        placeholder="请选择状态"
                        allowClear
                      >
                        <Select.Option value={1}>成功</Select.Option>
                        <Select.Option value={0}>失败</Select.Option>
                        <Select.Option value={2}>待支付</Select.Option>
                        <Select.Option value={3}>已退款</Select.Option>
                      </Select>
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

            <Table<RechargeTransaction>
              columns={columns}
              dataSource={transactions}
              rowKey="recharge_id"
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
              scroll={{ x: 1650 }}
            />

            <Modal
              title={editingTransaction ? "编辑充值记录" : "新增充值记录"}
              open={modalVisible}
              onOk={handleModalOk}
              onCancel={() => {
                setModalVisible(false);
                form.resetFields();
              }}
              destroyOnClose
              width={700}
            >
              <Form<RechargeTransactionFormValues>
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
                  label="充值金额"
                  name="amount"
                  rules={[
                    { required: true, message: "请输入充值金额" },
                    { type: "number", min: 0.01, message: "充值金额必须大于0" },
                  ]}
                >
                  <InputNumber
                    style={{ width: "100%" }}
                    min={0.01}
                    precision={2}
                    prefix="¥"
                    placeholder="请输入充值金额"
                  />
                </Form.Item>
                <Form.Item
                  label="赠送积分"
                  name="bonus_points"
                  rules={[
                    { required: true, message: "请输入赠送积分" },
                    { type: "number", min: 0, message: "赠送积分不能小于0" },
                  ]}
                  initialValue={0}
                >
                  <InputNumber
                    style={{ width: "100%" }}
                    min={0}
                    placeholder="请输入赠送积分"
                  />
                </Form.Item>
                <Form.Item
                  label="支付方式"
                  name="payment_method"
                  rules={[{ required: true, message: "请选择支付方式" }]}
                >
                  <Select placeholder="请选择支付方式">
                    <Select.Option value="CASH">现金</Select.Option>
                    <Select.Option value="WECHAT">微信</Select.Option>
                    <Select.Option value="ALIPAY">支付宝</Select.Option>
                    <Select.Option value="CARD">银行卡</Select.Option>
                    <Select.Option value="SYSTEM_GIFT">系统赠送</Select.Option>
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
                    <Select.Option value={0}>失败</Select.Option>
                    <Select.Option value={2}>待支付</Select.Option>
                    <Select.Option value={3}>已退款</Select.Option>
                  </Select>
                </Form.Item>
                <Form.Item label="外部订单号" name="external_order_no">
                  <Input placeholder="请输入第三方支付单号（可选）" />
                </Form.Item>
                <Form.Item label="操作员" name="operator_id">
                  <Input placeholder="请输入操作员/收银员编号（可选）" />
                </Form.Item>
                <Form.Item label="备注" name="remark">
                  <Input.TextArea rows={3} placeholder="请输入备注" />
                </Form.Item>
              </Form>
            </Modal>
          </div>
        </div>
      </AdminLayout>
    </ConfigProvider>
  );
}





