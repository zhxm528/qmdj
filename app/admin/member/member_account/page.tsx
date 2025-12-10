"use client";

import { useEffect, useState } from "react";
import Layout from "@/components/Layout";
import {
  ConfigProvider,
  Table,
  Button,
  Modal,
  Form,
  InputNumber,
  Space,
  Popconfirm,
  message,
} from "antd";
import zhCN from "antd/locale/zh_CN";
import type { ColumnsType } from "antd/es/table";
import { PlusOutlined, EditOutlined, DeleteOutlined } from "@ant-design/icons";
import dayjs from "dayjs";

interface MemberAccount {
  member_id: number;
  balance: number;
  frozen_balance: number;
  updated_at: string;
}

interface MemberAccountFormValues {
  member_id?: number;
  balance?: number;
  frozen_balance?: number;
}

export default function MemberAccountPage() {
  const [form] = Form.useForm<MemberAccountFormValues>();
  const [loading, setLoading] = useState(false);
  const [accounts, setAccounts] = useState<MemberAccount[]>([]);
  const [total, setTotal] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [modalVisible, setModalVisible] = useState(false);
  const [editingAccount, setEditingAccount] = useState<MemberAccount | null>(null);
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

  const loadAccounts = async (page: number, size: number) => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.set("page", String(page));
      params.set("pageSize", String(size));

      const res = await fetch(`/api/admin/member/member_account?${params.toString()}`);
      const data = await res.json();
      if (data.success) {
        setAccounts(data.data || []);
        setTotal(data.total || 0);
        setCurrentPage(page);
        setPageSize(size);
      } else {
        message.error(data.error || "加载会员账户列表失败");
      }
    } catch (error) {
      console.error("加载会员账户列表失败:", error);
      message.error("加载会员账户列表失败");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadMembers();
    loadAccounts(1, 10);
  }, []);

  const handleAdd = () => {
    setEditingAccount(null);
    form.resetFields();
    form.setFieldsValue({
      balance: 0,
      frozen_balance: 0,
    });
    setModalVisible(true);
  };

  const handleEdit = (record: MemberAccount) => {
    setEditingAccount(record);
    form.setFieldsValue({
      member_id: record.member_id,
      balance: Number(record.balance),
      frozen_balance: Number(record.frozen_balance),
    });
    setModalVisible(true);
  };

  const handleDelete = async (record: MemberAccount) => {
    try {
      const res = await fetch(
        `/api/admin/member/member_account?member_id=${record.member_id}`,
        {
          method: "DELETE",
        }
      );
      const data = await res.json();
      if (data.success) {
        message.success("删除成功");
        loadAccounts(currentPage, pageSize);
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
        balance: values.balance ?? 0,
        frozen_balance: values.frozen_balance ?? 0,
      };

      let res: Response;
      if (editingAccount) {
        res = await fetch("/api/admin/member/member_account", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            member_id: editingAccount.member_id,
            ...payload,
          }),
        });
      } else {
        res = await fetch("/api/admin/member/member_account", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
      }

      const data = await res.json();
      if (data.success) {
        message.success(editingAccount ? "更新成功" : "创建成功");
        setModalVisible(false);
        form.resetFields();
        loadAccounts(currentPage, pageSize);
      } else {
        message.error(data.error || "保存失败");
      }
    } catch (error) {
      console.error("保存失败:", error);
      // 校验错误已在表单内提示，这里只处理网络错误
    }
  };

  const handlePageChange = (page: number, size: number) => {
    loadAccounts(page, size);
  };

  const getMemberName = (memberId: number) => {
    const member = members.find((m) => m.member_id === memberId);
    if (member) {
      return member.full_name || member.mobile || `ID: ${memberId}`;
    }
    return `ID: ${memberId}`;
  };

  const columns: ColumnsType<MemberAccount> = [
    {
      title: "会员ID",
      dataIndex: "member_id",
      key: "member_id",
      width: 120,
      fixed: "left",
      render: (value: number) => getMemberName(value),
    },
    {
      title: "可用余额",
      dataIndex: "balance",
      key: "balance",
      width: 150,
      render: (value: number) => `¥${Number(value).toFixed(2)}`,
    },
    {
      title: "冻结余额",
      dataIndex: "frozen_balance",
      key: "frozen_balance",
      width: 150,
      render: (value: number) => `¥${Number(value).toFixed(2)}`,
    },
    {
      title: "总余额",
      key: "total_balance",
      width: 150,
      render: (_, record) => {
        const total = Number(record.balance) + Number(record.frozen_balance);
        return `¥${total.toFixed(2)}`;
      },
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
            title="确定要删除该会员账户吗？删除后该会员将无法使用储值功能。"
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
              <h1 className="text-3xl font-bold text-gray-900">会员账户管理</h1>
              <Button
                type="primary"
                icon={<PlusOutlined />}
                onClick={handleAdd}
              >
                初始化账户
              </Button>
            </div>

            <Table<MemberAccount>
              columns={columns}
              dataSource={accounts}
              rowKey="member_id"
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
              title={editingAccount ? "编辑会员账户" : "初始化会员账户"}
              open={modalVisible}
              onOk={handleModalOk}
              onCancel={() => {
                setModalVisible(false);
                form.resetFields();
              }}
              destroyOnClose
              width={600}
            >
              <Form<MemberAccountFormValues>
                form={form}
                layout="vertical"
                preserve={false}
              >
                {!editingAccount && (
                  <Form.Item
                    label="会员"
                    name="member_id"
                    rules={[{ required: true, message: "请选择会员" }]}
                  >
                    <InputNumber
                      style={{ width: "100%" }}
                      placeholder="请输入会员ID"
                      min={1}
                    />
                  </Form.Item>
                )}
                <Form.Item
                  label="可用余额"
                  name="balance"
                  rules={[
                    { required: true, message: "请输入可用余额" },
                    { type: "number", min: 0, message: "可用余额不能小于0" },
                  ]}
                  initialValue={0}
                  tooltip="会员可以使用的储值余额"
                >
                  <InputNumber
                    style={{ width: "100%" }}
                    min={0}
                    precision={2}
                    prefix="¥"
                    placeholder="请输入可用余额"
                  />
                </Form.Item>
                <Form.Item
                  label="冻结余额"
                  name="frozen_balance"
                  rules={[
                    { required: true, message: "请输入冻结余额" },
                    { type: "number", min: 0, message: "冻结余额不能小于0" },
                  ]}
                  initialValue={0}
                  tooltip="冻结的余额（如退款中、待审核等）"
                >
                  <InputNumber
                    style={{ width: "100%" }}
                    min={0}
                    precision={2}
                    prefix="¥"
                    placeholder="请输入冻结余额"
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

