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
  DatePicker,
  Select,
  Switch,
  Space,
  Popconfirm,
  message,
  Radio,
} from "antd";
import zhCN from "antd/locale/zh_CN";
import type { ColumnsType } from "antd/es/table";
import { PlusOutlined, EditOutlined, DeleteOutlined, GiftOutlined } from "@ant-design/icons";
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
  level_id: number | null;
  level_name: string | null;
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
  const [issueCardModalVisible, setIssueCardModalVisible] = useState(false);
  const [issuingCard, setIssuingCard] = useState<MemberCard | null>(null);
  const [membershipLevels, setMembershipLevels] = useState<Array<{ level_id: number; level_name: string }>>([]);
  const [selectedLevelId, setSelectedLevelId] = useState<number | undefined>(undefined);

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

  // 加载会员等级列表（用于发卡选择）
  const loadMembershipLevels = async () => {
    try {
      const res = await fetch("/api/admin/member/membership_level?pageSize=-1");
      const data = await res.json();
      console.log("[loadMembershipLevels] API响应:", data);
      if (data.success && data.data) {
        const levels = data.data.map((level: any) => ({
          level_id: level.level_id,
          level_name: level.level_name,
        }));
        console.log("[loadMembershipLevels] 处理后的等级列表:", levels);
        setMembershipLevels(levels);
      } else {
        console.error("[loadMembershipLevels] API返回失败:", data.error);
        message.error(data.error || "加载会员等级列表失败");
      }
    } catch (error) {
      console.error("加载会员等级列表失败:", error);
      message.error("加载会员等级列表失败");
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
    loadMembershipLevels();
    loadCards(1, 10);
  }, []);

  // 当 Modal 打开且是编辑模式时，回显表单数据
  useEffect(() => {
    if (modalVisible && editingCard) {
      form.setFieldsValue({
        card_no: editingCard.card_no,
        member_id: editingCard.member_id,
        is_primary: editingCard.is_primary,
        status: editingCard.status,
        expired_at: editingCard.expired_at ? dayjs(editingCard.expired_at) : null,
        remark: editingCard.remark || undefined,
      });
    } else if (modalVisible && !editingCard) {
      // 新增模式，重置表单
      form.resetFields();
      form.setFieldsValue({
        card_no: "", // 新增时，卡号字段为空，由后端自动生成
        is_primary: true,
        status: 1,
      });
    }
  }, [modalVisible, editingCard, form]);

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
        // 新增时，卡号由后端自动生成，不传 card_no 或传空字符串
        card_no: editingCard ? (values.card_no || null) : "",
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

  const handleIssueCard = (record: MemberCard) => {
    console.log("[handleIssueCard] 打开发卡弹窗，当前会员等级列表:", membershipLevels);
    setIssuingCard(record);
    // 默认选择当前用户所属的会员等级
    setSelectedLevelId(record.level_id || undefined);
    // 确保会员等级列表已加载
    if (membershipLevels.length === 0) {
      loadMembershipLevels();
    }
    setIssueCardModalVisible(true);
  };

  const handleIssueCardOk = async () => {
    if (!issuingCard || !selectedLevelId) {
      message.error("请选择发卡类型");
      return;
    }

    try {
      const res = await fetch("/api/admin/member/member_card", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          card_id: issuingCard.card_id,
          level_id: selectedLevelId,
        }),
      });

      const data = await res.json();
      if (data.success) {
        message.success("发卡成功");
        setIssueCardModalVisible(false);
        setIssuingCard(null);
        setSelectedLevelId(undefined);
        loadCards(currentPage, pageSize);
      } else {
        message.error(data.error || "发卡失败");
      }
    } catch (error) {
      console.error("发卡失败:", error);
      message.error("发卡失败");
    }
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
      width: 180,
      ellipsis: true,
    },
    {
      title: "会员ID",
      dataIndex: "member_id",
      key: "member_id",
      width: 150,
      ellipsis: true,
      render: (value: number) => getMemberName(value),
    },
    {
      title: "会员等级",
      dataIndex: "level_name",
      key: "level_name",
      width: 140,
      ellipsis: true,
      render: (value: string | null) => value || "-",
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
      width: 120,
      render: (value: number) => (value === 1 ? "使用中" : "挂失/注销"),
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
      width: 200,
      ellipsis: true,
    },
    {
      title: "操作",
      key: "action",
      fixed: "right",
      width: 180,
      render: (_, record) => (
        <Space size="small">
          <Button
            type="link"
            icon={<GiftOutlined />}
            onClick={() => handleIssueCard(record)}
            style={{ padding: 0 }}
          >
            发卡
          </Button>
          <Button
            type="link"
            icon={<EditOutlined />}
            onClick={() => handleEdit(record)}
            style={{ padding: 0 }}
          >
            编辑
          </Button>
          <Popconfirm
            title="确定要删除该会员卡吗？"
            onConfirm={() => handleDelete(record)}
          >
            <Button type="link" danger icon={<DeleteOutlined />} style={{ padding: 0 }}>
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
        <div className="min-h-screen bg-[var(--color-surface)] py-12 px-4">
          <div className="w-full bg-[var(--color-card-bg)] rounded-lg shadow-md p-8">
            <div className="flex items-center justify-between mb-6">
              <AdminBreadcrumb title="会员卡管理" />
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
              scroll={{ x: 1530 }}
            />

            <Modal
              title={editingCard ? "编辑会员卡" : "新增会员卡"}
              open={modalVisible}
              onOk={handleModalOk}
              onCancel={() => {
                setModalVisible(false);
                form.resetFields();
                setEditingCard(null);
              }}
              destroyOnClose={false}
              width={600}
            >
              <Form<MemberCardFormValues>
                form={form}
                layout="vertical"
                preserve={true}
              >
                <Form.Item
                  label="会员卡号"
                  name="card_no"
                  rules={editingCard ? [{ required: true, message: "请输入会员卡号" }] : []}
                >
                  <Input 
                    placeholder={editingCard ? "请输入会员卡号" : "系统自动生成"} 
                    disabled={!editingCard}
                    readOnly={!editingCard}
                  />
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

            <Modal
              title="发卡"
              open={issueCardModalVisible}
              onOk={handleIssueCardOk}
              onCancel={() => {
                setIssueCardModalVisible(false);
                setIssuingCard(null);
                setSelectedLevelId(undefined);
              }}
              destroyOnClose
              width={500}
            >
              {membershipLevels.length === 0 ? (
                <div className="text-center py-4 text-[var(--color-muted)]">
                  暂无会员等级数据，请先添加会员等级
                </div>
              ) : (
                <Radio.Group
                  value={selectedLevelId}
                  onChange={(e) => setSelectedLevelId(e.target.value)}
                  style={{ width: "100%" }}
                >
                  <Space direction="vertical" style={{ width: "100%" }}>
                    {membershipLevels.map((level) => (
                      <Radio key={level.level_id} value={level.level_id}>
                        {level.level_name}
                      </Radio>
                    ))}
                  </Space>
                </Radio.Group>
              )}
            </Modal>
          </div>
        </div>
      </AdminLayout>
    </ConfigProvider>
  );
}




