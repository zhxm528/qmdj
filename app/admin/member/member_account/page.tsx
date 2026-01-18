"use client";

import { useEffect, useState, useMemo, useCallback } from "react";
import AdminLayout from "@/components/admin/AdminLayout";
import AdminBreadcrumb from "@/components/admin/AdminBreadcrumb";
import {
  ConfigProvider,
  Table,
  Button,
  Modal,
  Form,
  InputNumber,
  Input,
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

// 后端 updated_at 为 UTC（通过 AT TIME ZONE 'UTC' 返回），使用 dayjs utc 插件按配置的时区展示
dayjs.extend(utc);

interface MemberAccount {
  member_id: number;
  balance: number;
  frozen_balance: number;
  updated_at: string;
  full_name?: string | null;
  mobile?: string | null;
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
  const [timezoneConfig, setTimezoneConfig] = useState<{
    timezone: string;
    utcOffset: number;
  } | null>(null);

  // 加载会员列表（用于下拉选择）
  const loadMembers = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/member/member?pageSize=-1");
      const data = await res.json();
      if (data.success && data.data) {
        setMembers(data.data);
      }
    } catch (error) {
      console.error("加载会员列表失败:", error);
    }
  }, []);

  const loadAccounts = useCallback(async (page: number, size: number) => {
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
  }, []);

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
        console.error("[member_account] 加载时区配置失败:", error);
        // 如果加载失败，使用默认值
        setTimezoneConfig({
          timezone: "Asia/Shanghai",
          utcOffset: 8,
        });
      }
    };

    loadTimezoneConfig();
    loadMembers();
    loadAccounts(1, 10);
  }, [loadMembers, loadAccounts]);

  // 处理 Modal 打开后的表单值设置
  const handleModalAfterOpenChange = (open: boolean) => {
    if (open) {
      // Modal 完全打开后，设置表单值
      // 使用 setTimeout 确保 Form 组件完全渲染和初始化
      setTimeout(() => {
        if (editingAccount) {
          // 编辑模式：设置表单值
          const formValues = {
            member_id: editingAccount.member_id,
            balance: Number(editingAccount.balance),
            frozen_balance: Number(editingAccount.frozen_balance),
          };
          console.log("[member_account] Modal 打开后设置表单值:", formValues);
          form.setFieldsValue(formValues);
          // 验证表单值是否设置成功
          const currentValues = form.getFieldsValue();
          console.log("[member_account] 表单值已设置，当前表单值:", currentValues);
          console.log("[member_account] 表单值设置验证:", {
            member_id: currentValues.member_id === formValues.member_id,
            balance: currentValues.balance === formValues.balance,
            frozen_balance: currentValues.frozen_balance === formValues.frozen_balance,
          });
        } else {
          // 新增模式，重置表单
          form.resetFields();
          form.setFieldsValue({
            balance: 0,
            frozen_balance: 0,
          });
        }
      }, 100);
    }
  };

  const handleAdd = () => {
    setEditingAccount(null);
    form.resetFields();
    form.setFieldsValue({
      balance: 0,
      frozen_balance: 0,
    });
    setModalVisible(true);
  };

  const handleEdit = useCallback(async (record: MemberAccount) => {
    try {
      console.log("[member_account] 点击编辑按钮，会员ID:", record.member_id);
      // 从后端重新查询记录，确保数据最新
      const res = await fetch(`/api/admin/member/member_account?member_id=${record.member_id}`);
      const data = await res.json();
      
      // 详细打印后端返回给前端的内容
      console.log("[member_account] ========== 后端返回给前端的完整响应 ==========");
      console.log("[member_account] 响应状态码:", res.status);
      console.log("[member_account] 响应状态文本:", res.statusText);
      console.log("[member_account] 响应数据 (JSON):", JSON.stringify(data, null, 2));
      console.log("[member_account] 响应数据 (对象):", data);
      if (data.success) {
        console.log("[member_account] success:", data.success);
        if (data.data) {
          console.log("[member_account] data 字段内容:", data.data);
          console.log("[member_account] data 字段类型:", typeof data.data);
          console.log("[member_account] data 是否为数组:", Array.isArray(data.data));
          if (typeof data.data === "object" && !Array.isArray(data.data)) {
            console.log("[member_account] data 对象的所有字段:");
            Object.keys(data.data).forEach((key) => {
              console.log(`[member_account]   ${key}:`, data.data[key], `(类型: ${typeof data.data[key]})`);
            });
          }
        } else {
          console.log("[member_account] data 字段为空或未定义");
        }
      } else {
        console.log("[member_account] success:", data.success);
        console.log("[member_account] error:", data.error);
      }
      console.log("[member_account] ============================================");
      
      if (data.success && data.data) {
        const account = data.data;
        console.log("[member_account] 提取的账户数据对象:", account);
        console.log("[member_account] 账户中的会员信息:", {
          member_id: account.member_id,
          full_name: account.full_name,
          mobile: account.mobile,
        });
        
        // 先设置 editingAccount，然后打开 Modal
        // useEffect 会在 Modal 打开后自动设置表单值
        setEditingAccount(account);
        setModalVisible(true);
      } else {
        message.error(data.error || "查询会员账户信息失败");
      }
    } catch (error) {
      console.error("[member_account] 查询会员账户信息失败:", error);
      message.error("查询会员账户信息失败");
    }
  }, []);

  const handleDelete = useCallback(async (record: MemberAccount) => {
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
  }, [currentPage, pageSize, loadAccounts]);

  const handleModalOk = async () => {
    try {
      const values = await form.validateFields();
      const payload: any = {
        member_id: values.member_id || null,
        balance: values.balance ?? 0,
        frozen_balance: values.frozen_balance ?? 0,
      };

      // 新增模式下，校验会员的唯一性
      if (!editingAccount && payload.member_id) {
        // 先检查当前列表中是否已存在
        const existingAccount = accounts.find((acc) => acc.member_id === payload.member_id);
        if (existingAccount) {
          const memberName = getMemberName(payload.member_id);
          message.error(`该会员（${memberName}）已存在账户，请使用编辑功能`);
          return;
        }
        
        // 如果列表中没有，调用后端 API 再次确认（因为列表可能分页，不包含所有数据）
        try {
          const checkRes = await fetch(`/api/admin/member/member_account?member_id=${payload.member_id}`);
          const checkData = await checkRes.json();
          if (checkData.success && checkData.data) {
            const memberName = getMemberName(payload.member_id);
            message.error(`该会员（${memberName}）已存在账户，请使用编辑功能`);
            return;
          }
        } catch (checkError) {
          console.error("[member_account] 检查会员账户唯一性失败:", checkError);
          // 如果检查失败，继续保存流程，让后端校验
        }
      }

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

  const getMemberName = useCallback((memberId: number, account?: MemberAccount) => {
    // 优先使用账户数据中的会员信息（如果从后端查询时已包含）
    if (account) {
      if (account.full_name) {
        return account.full_name;
      }
      if (account.mobile) {
        return account.mobile;
      }
    }
    // 否则从 members 数组中查找
    const member = members.find((m) => m.member_id === memberId);
    if (member) {
      if (member.full_name) {
        return member.full_name;
      }
      if (member.mobile) {
        return member.mobile;
      }
    }
    return `ID: ${memberId}`;
  }, [members]);

  const columns: ColumnsType<MemberAccount> = useMemo(() => [
    {
      title: "会员",
      dataIndex: "member_id",
      key: "member_id",
      width: 120,
      fixed: "left",
      render: (value: number, record: MemberAccount) => getMemberName(value, record),
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
      render: (value: string) => {
        if (!value) return "-";
        if (!timezoneConfig) {
          // 如果时区配置还未加载，先按 UTC 展示
          return dayjs.utc(value).format("YYYY-MM-DD HH:mm:ss") + " (UTC)";
        }
        const utcTime = dayjs.utc(value);
        const localTime = utcTime.add(timezoneConfig.utcOffset, "hour");
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
  ], [timezoneConfig, getMemberName, handleEdit, handleDelete]);

  return (
    <ConfigProvider locale={zhCN}>
      <AdminLayout>
        <div className="min-h-screen bg-[var(--color-surface)] py-12 px-4">
          <div className="w-full bg-[var(--color-card-bg)] rounded-lg shadow-md p-8">
            <div className="flex items-center justify-between mb-6">
              <AdminBreadcrumb title="会员账户管理" />
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
              // 禁止点击弹窗外区域关闭
              maskClosable={false}
              onCancel={() => {
                setModalVisible(false);
                form.resetFields();
              }}
              afterOpenChange={handleModalAfterOpenChange}
              destroyOnClose
              width={600}
              footer={[
                <Button
                  key="close"
                  onClick={() => {
                    setModalVisible(false);
                    form.resetFields();
                  }}
                >
                  关闭
                </Button>,
                <Button key="submit" type="primary" onClick={handleModalOk}>
                  保存
                </Button>,
              ]}
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
                    <Select
                      placeholder="请选择会员"
                      showSearch
                      optionFilterProp="label"
                      filterOption={(input, option) =>
                        (option?.label ?? "").toLowerCase().includes(input.toLowerCase())
                      }
                      options={members.map((m) => ({
                        value: m.member_id,
                        label: m.full_name || m.mobile || `ID: ${m.member_id}`,
                      }))}
                    />
                  </Form.Item>
                )}
                {editingAccount && (
                  <Form.Item label="会员">
                    <Input
                      value={getMemberName(editingAccount.member_id, editingAccount) || `ID: ${editingAccount.member_id}`}
                      disabled
                      readOnly
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
      </AdminLayout>
    </ConfigProvider>
  );
}





