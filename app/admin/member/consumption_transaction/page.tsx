"use client";

import { useEffect, useState, useMemo } from "react";
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
import utc from "dayjs/plugin/utc";

// 后端 created_at 为 UTC（TIMESTAMPTZ），使用 dayjs utc 插件按配置的时区展示
dayjs.extend(utc);

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
  const [members, setMembers] = useState<
    Array<{
      member_id: number;
      full_name: string | null;
      mobile: string | null;
      level_id?: number | null;
      level_name?: string | null;
      sale_price?: number | null;
      cost_price?: number | null;
    }>
  >([]);
  const [cards, setCards] = useState<
    Array<{
      card_id: number;
      card_no: string;
      member_id: number;
      expired_at?: string | null;
    }>
  >([]);
  const selectedMemberId = Form.useWatch("member_id", form);
  const selectedCardId = Form.useWatch("card_id", form);
  const [previewDaysToAdd, setPreviewDaysToAdd] = useState<number | null>(null);
  const [previewExpiredDate, setPreviewExpiredDate] = useState<string | null>(null);
  const [timezoneConfig, setTimezoneConfig] = useState<{
    timezone: string;
    utcOffset: number;
  } | null>(null);

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
    // 加载时区配置
    const loadTimezoneConfig = async () => {
      try {
        const res = await fetch("/api/config/timezone");
        const data = await res.json();
        if (data.success) {
          setTimezoneConfig({
            timezone: data.timezone,
            utcOffset: data.utcOffset,
          });
        }
      } catch (error) {
        console.error("加载时区配置失败:", error);
        // 如果加载失败，使用默认值
        setTimezoneConfig({
          timezone: "Asia/Shanghai",
          utcOffset: 8,
        });
      }
    };

    // 上报浏览器时区信息到后台，便于排查时间显示问题
    try {
      const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
      const offsetMinutes = new Date().getTimezoneOffset(); // 相对于 UTC 的分钟数（通常东八区为 -480）
      // 前端控制台也打印一次
      console.log("[consumption_transaction] 浏览器时区:", {
        timezone: tz,
        offsetMinutes,
      });
      // 上报给后端，在日志中记录
      fetch(
        `/api/admin/member/consumption_transaction?clientTimezone=${encodeURIComponent(
          tz || ""
        )}&clientOffsetMinutes=${offsetMinutes}`
      ).catch((err) => {
        console.error("上报浏览器时区失败:", err);
      });
    } catch (e) {
      console.error("获取浏览器时区失败:", e);
    }

    loadTimezoneConfig();
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
    setPreviewDaysToAdd(null);
    setPreviewExpiredDate(null);
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
        setPreviewDaysToAdd(null);
        setPreviewExpiredDate(null);
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
    if (member && member.full_name) {
      return member.full_name;
    }
    return "-";
  };

  const getCardNo = (cardId: number | null) => {
    if (!cardId) return "-";
    const card = cards.find((c) => c.card_id === cardId);
    return card ? `${card.card_no}` : `ID: ${cardId}`;
  };

  // 根据选中的会员过滤可选会员卡
  const filteredCards = selectedMemberId
    ? cards.filter((c) => c.member_id === selectedMemberId)
    : cards;

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

  // 当前选中的会员详情（用于展示等级及售价/成本价信息）
  const selectedMember = selectedMemberId
    ? members.find((m) => m.member_id === selectedMemberId)
    : undefined;

  // 当前选中的会员卡
  const selectedCard = selectedCardId
    ? cards.find((c) => c.card_id === selectedCardId)
    : undefined;

  // 在“实付金额”输入框失去焦点时，根据当前值和会员等级售价，预估增加的有效期天数和新的到期日期
  const updatePreviewExpireInfo = () => {
    if (!selectedMember || !selectedMember.sale_price) {
      setPreviewDaysToAdd(null);
      setPreviewExpiredDate(null);
      return;
    }

    const salePrice = Number(selectedMember.sale_price);
    const paid = Number(form.getFieldValue("paid_amount") || 0);

    if (!salePrice || salePrice <= 0 || !paid || paid <= 0) {
      setPreviewDaysToAdd(null);
      setPreviewExpiredDate(null);
      return;
    }

    const dailyPrice = salePrice / 31;
    if (!dailyPrice || dailyPrice <= 0) {
      setPreviewDaysToAdd(null);
      setPreviewExpiredDate(null);
      return;
    }

    const rawDays = paid / dailyPrice;
    const daysToAdd = Math.ceil(rawDays);
    setPreviewDaysToAdd(daysToAdd);

    const baseDate = selectedCard?.expired_at
      ? dayjs(selectedCard.expired_at)
      : dayjs();
    setPreviewExpiredDate(baseDate.add(daysToAdd, "day").format("YYYY-MM-DD"));
  };

  // 使用 useMemo 确保 timezoneConfig 更新时 columns 重新创建
  const columns: ColumnsType<ConsumptionTransaction> = useMemo(() => [
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
      // 后端返回的 created_at 为 UTC 时间字符串，这里按照配置的时区展示
      render: (value: string) => {
        if (!value) return "-";
        if (!timezoneConfig) {
          // 如果时区配置还未加载，先显示 UTC 时间
          console.log("[consumption_transaction] 时区配置未加载，显示 UTC 时间:", value);
          return dayjs.utc(value).format("YYYY-MM-DD HH:mm:ss") + " (UTC)";
        }
        // 使用配置的时区偏移量
        // dayjs.utc() 创建 UTC 时间对象，然后使用 add() 方法添加时区偏移量
        const utcTime = dayjs.utc(value);
        const localTime = utcTime.add(timezoneConfig.utcOffset, "hour");
        console.log("[consumption_transaction] 时间转换:", {
          original: value,
          utc: utcTime.format("YYYY-MM-DD HH:mm:ss"),
          timezone: timezoneConfig.timezone,
          utcOffset: timezoneConfig.utcOffset,
          converted: localTime.format("YYYY-MM-DD HH:mm:ss"),
        });
        return localTime.format("YYYY-MM-DD HH:mm:ss");
      },
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
  // eslint-disable-next-line react-hooks/exhaustive-deps
  ], [timezoneConfig]);

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
              // 禁止点击弹窗外区域关闭
              maskClosable={false}
              onCancel={() => {
                setModalVisible(false);
                form.resetFields();
                setPreviewDaysToAdd(null);
                setPreviewExpiredDate(null);
              }}
              destroyOnHidden
              width={700}
              footer={[
                <Button
                  key="close"
                  onClick={() => {
                    setModalVisible(false);
                    form.resetFields();
                    setPreviewDaysToAdd(null);
                    setPreviewExpiredDate(null);
                  }}
                >
                  关闭
                </Button>,
                <Button key="submit" type="primary" onClick={handleModalOk}>
                  保存
                </Button>,
              ]}
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
                    onChange={(value) => {
                      // 当会员变更时，如果当前选中的会员卡不属于该会员，则清空会员卡选择
                      const currentCardId = form.getFieldValue("card_id");
                      if (currentCardId) {
                        const card = cards.find((c) => c.card_id === currentCardId);
                        if (!card || card.member_id !== value) {
                          form.setFieldsValue({ card_id: undefined });
                        }
                      }
                    }}
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
                {selectedMember && (
                  <div className="mb-4 text-xs text-gray-600 bg-gray-50 rounded px-2 py-1">
                    <div>
                      会员等级：
                      <span className="font-medium">
                        {selectedMember.level_name || "未设置等级"}
                      </span>
                    </div>
                    {selectedMember.sale_price != null && selectedMember.sale_price > 0 && (
                      <div>
                        销售单价（31天周期）：
                        <span className="font-medium">
                          ¥{Number(selectedMember.sale_price).toFixed(2)}
                          {" / 31天，约 ¥"}
                          {(Number(selectedMember.sale_price) / 31).toFixed(2)}
                          {" / 天"}
                        </span>
                      </div>
                    )}
                    {selectedMember.cost_price != null && selectedMember.cost_price > 0 && (
                      <div>
                        成本单价（31天周期）：
                        <span className="font-medium">
                          ¥{Number(selectedMember.cost_price).toFixed(2)}
                          {" / 31天，约 ¥"}
                          {(Number(selectedMember.cost_price) / 31).toFixed(2)}
                          {" / 天"}
                        </span>
                      </div>
                    )}
                  </div>
                )}
                <Form.Item label="会员卡" name="card_id">
                  <Select
                    showSearch
                    placeholder="请选择会员卡（可选）"
                    allowClear
                    optionFilterProp="children"
                    filterOption={(input, option) =>
                      (option?.label ?? "").toLowerCase().includes(input.toLowerCase())
                    }
                    options={filteredCards.map((c) => ({
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
                    onBlur={updatePreviewExpireInfo}
                  />
                </Form.Item>
                {previewDaysToAdd !== null && previewExpiredDate && (
                  <div className="mt-2 mb-2 text-xs text-gray-600 bg-blue-50 rounded px-2 py-1">
                    <div>
                      预计本次将增加有效期：
                      <span className="font-medium">{previewDaysToAdd} 天</span>
                    </div>
                    <div>
                      预计新的到期日期：
                      <span className="font-medium">{previewExpiredDate}</span>
                    </div>
                  </div>
                )}
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

