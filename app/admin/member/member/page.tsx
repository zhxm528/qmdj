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
  Space,
  Popconfirm,
  message,
} from "antd";
import zhCN from "antd/locale/zh_CN";
import type { ColumnsType } from "antd/es/table";
import { PlusOutlined, EditOutlined, DeleteOutlined } from "@ant-design/icons";
import dayjs, { Dayjs } from "dayjs";
import utc from "dayjs/plugin/utc";

// 后端 registered_at / updated_at 为 UTC（通过 AT TIME ZONE 'UTC' 返回），使用 dayjs utc 插件按配置的时区展示
dayjs.extend(utc);

interface Member {
  member_id: number;
  member_code: string | null;
  full_name: string | null;
  mobile: string | null;
  email: string | null;
  gender: string | null;
  birth_date: string | null;
  status: number;
  level_id: number | null;
  level_name: string | null;
  total_points: number;
  available_points: number;
  remark: string | null;
  registered_at: string;
  updated_at: string;
}

interface MemberFormValues {
  member_code?: string;
  full_name?: string;
  mobile?: string;
  email?: string;
  gender?: string;
  birth_date?: Dayjs | null;
  status?: number;
  level_id?: number | null;
  remark?: string;
}

export default function MemberManagementPage() {
  const [form] = Form.useForm<MemberFormValues>();
  const [loading, setLoading] = useState(false);
  const [members, setMembers] = useState<Member[]>([]);
  const [total, setTotal] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [modalVisible, setModalVisible] = useState(false);
  const [editingMember, setEditingMember] = useState<Member | null>(null);
  const [timezoneConfig, setTimezoneConfig] = useState<{
    timezone: string;
    utcOffset: number;
  } | null>(null);
  const [levels, setLevels] = useState<
    Array<{
      level_id: number;
      level_name: string | null;
    }>
  >([]);

  const loadMembers = async (page: number, size: number) => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.set("page", String(page));
      params.set("pageSize", String(size));

      const res = await fetch(`/api/admin/member/member?${params.toString()}`);
      const data = await res.json();
      if (data.success) {
        setMembers(data.data || []);
        setTotal(data.total || 0);
        setCurrentPage(page);
        setPageSize(size);
      } else {
        message.error(data.error || "加载会员列表失败");
      }
    } catch (error) {
      console.error("加载会员列表失败:", error);
      message.error("加载会员列表失败");
    } finally {
      setLoading(false);
    }
  };

  // 加载会员等级列表（用于下拉选择）
  const loadLevels = async () => {
    try {
      const res = await fetch("/api/admin/member/membership_level?pageSize=-1");
      const data = await res.json();
      console.log("[member] 加载等级列表 API 响应:", data);
      if (data.success && data.data) {
        // 确保 data.data 是数组，并提取需要的字段
        const levelsList = Array.isArray(data.data)
          ? data.data.map((level: any) => ({
              level_id: level.level_id,
              level_name: level.level_name,
            }))
          : [];
        console.log("[member] 处理后的等级列表:", levelsList);
        setLevels(levelsList);
      } else {
        console.error("[member] API 返回失败:", data.error);
        message.error(data.error || "加载会员等级列表失败");
      }
    } catch (error) {
      console.error("[member] 加载等级列表失败:", error);
      message.error("加载会员等级列表失败");
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
        console.error("[member] 加载时区配置失败:", error);
        // 如果加载失败，使用默认值
        setTimezoneConfig({
          timezone: "Asia/Shanghai",
          utcOffset: 8,
        });
      }
    };

    loadTimezoneConfig();
    loadLevels();
    loadMembers(1, 10);
  }, []);

  // 处理 Modal 打开后的表单值设置
  const handleModalAfterOpenChange = (open: boolean) => {
    if (open) {
      console.log("[member] Modal 打开，当前等级列表:", levels);
      console.log("[member] 等级列表长度:", levels.length);
      // Modal 完全打开后，设置表单值
      // 使用 setTimeout 确保 Form 组件完全渲染和初始化
      setTimeout(() => {
        if (editingMember) {
          // 编辑模式：设置表单值
          const formValues = {
            member_code: editingMember.member_code || undefined,
            full_name: editingMember.full_name || undefined,
            mobile: editingMember.mobile || undefined,
            email: editingMember.email || undefined,
            gender: editingMember.gender || undefined,
            birth_date: editingMember.birth_date ? dayjs(editingMember.birth_date) : null,
            status: editingMember.status,
            level_id: editingMember.level_id || null,
            remark: editingMember.remark || undefined,
          };
          console.log("[member] Modal 打开后设置表单值:", formValues);
          form.setFieldsValue(formValues);
          // 验证表单值是否设置成功
          const currentValues = form.getFieldsValue();
          console.log("[member] 表单值已设置，当前表单值:", currentValues);
          console.log("[member] 表单值设置验证:", {
            full_name: currentValues.full_name === formValues.full_name,
            email: currentValues.email === formValues.email,
            gender: currentValues.gender === formValues.gender,
            status: currentValues.status === formValues.status,
          });
        } else {
          // 新增模式，重置表单
          form.resetFields();
          form.setFieldsValue({
            status: 1,
          });
        }
      }, 100);
    }
  };

  const handleAdd = () => {
    setEditingMember(null);
    form.resetFields();
    setModalVisible(true);
  };

  const handleEdit = async (record: Member) => {
    try {
      console.log("[member] 点击编辑按钮，会员ID:", record.member_id);
      // 从后端重新查询记录，确保数据最新
      const res = await fetch(`/api/admin/member/member?id=${record.member_id}`);
      const data = await res.json();
      
      // 详细打印后端返回给前端的内容
      console.log("[member] ========== 后端返回给前端的完整响应 ==========");
      console.log("[member] 响应状态码:", res.status);
      console.log("[member] 响应状态文本:", res.statusText);
      console.log("[member] 响应数据 (JSON):", JSON.stringify(data, null, 2));
      console.log("[member] 响应数据 (对象):", data);
      if (data.success) {
        console.log("[member] success:", data.success);
        if (data.data) {
          console.log("[member] data 字段内容:", data.data);
          console.log("[member] data 字段类型:", typeof data.data);
          console.log("[member] data 是否为数组:", Array.isArray(data.data));
          if (typeof data.data === "object" && !Array.isArray(data.data)) {
            console.log("[member] data 对象的所有字段:");
            Object.keys(data.data).forEach((key) => {
              console.log(`[member]   ${key}:`, data.data[key], `(类型: ${typeof data.data[key]})`);
            });
          }
        } else {
          console.log("[member] data 字段为空或未定义");
        }
      } else {
        console.log("[member] success:", data.success);
        console.log("[member] error:", data.error);
      }
      console.log("[member] ============================================");
      
      if (data.success && data.data) {
        const member = data.data;
        console.log("[member] 提取的会员数据对象:", member);
        
        // 先设置 editingMember，然后打开 Modal
        // useEffect 会在 Modal 打开后自动设置表单值
        setEditingMember(member);
        setModalVisible(true);
      } else {
        message.error(data.error || "查询会员信息失败");
      }
    } catch (error) {
      console.error("[member] 查询会员信息失败:", error);
      message.error("查询会员信息失败");
    }
  };

  const handleDelete = async (record: Member) => {
    try {
      const res = await fetch(
        `/api/admin/member/member?id=${record.member_id}`,
        {
          method: "DELETE",
        }
      );
      const data = await res.json();
      if (data.success) {
        message.success("删除成功");
        loadMembers(currentPage, pageSize);
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
        member_code: values.member_code || null,
        full_name: values.full_name || null,
        mobile: values.mobile || null,
        email: values.email || null,
        gender: values.gender || null,
        birth_date: values.birth_date
          ? values.birth_date.format("YYYY-MM-DD")
          : null,
        status: values.status ?? 1,
        level_id: values.level_id || null,
        remark: values.remark || null,
      };

      let res: Response;
      if (editingMember) {
        res = await fetch("/api/admin/member/member", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            member_id: editingMember.member_id,
            ...payload,
          }),
        });
      } else {
        res = await fetch("/api/admin/member/member", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
      }

      const data = await res.json();
      if (data.success) {
        message.success(editingMember ? "更新成功" : "创建成功");
        setModalVisible(false);
        form.resetFields();
        loadMembers(currentPage, pageSize);
      } else {
        message.error(data.error || "保存失败");
      }
    } catch (error) {
      console.error("保存失败:", error);
      // 校验错误已在表单内提示，这里只处理网络错误
    }
  };

  const handlePageChange = (page: number, size: number) => {
    loadMembers(page, size);
  };

  const columns: ColumnsType<Member> = [
    {
      title: "ID",
      dataIndex: "member_id",
      key: "member_id",
      width: 80,
      fixed: "left",
    },
    {
      title: "会员编码",
      dataIndex: "member_code",
      key: "member_code",
      width: 120,
      ellipsis: true,
    },
    {
      title: "姓名",
      dataIndex: "full_name",
      key: "full_name",
      width: 100,
      ellipsis: true,
    },
    {
      title: "手机号",
      dataIndex: "mobile",
      key: "mobile",
      width: 130,
    },
    {
      title: "邮箱",
      dataIndex: "email",
      key: "email",
      width: 200,
      ellipsis: true,
    },
    {
      title: "性别",
      dataIndex: "gender",
      key: "gender",
      width: 80,
      render: (value: string) => {
        if (value === "M") return "男性";
        if (value === "F") return "女性";
        if (value === "O") return "其他";
        return value || "-";
      },
    },
    {
      title: "状态",
      dataIndex: "status",
      key: "status",
      width: 80,
      render: (value: number) => (value === 1 ? "正常" : "停用"),
    },
    {
      title: "等级名称",
      dataIndex: "level_name",
      key: "level_name",
      width: 120,
      render: (value: string | null) => value || "-",
    },
    {
      title: "累计积分",
      dataIndex: "total_points",
      key: "total_points",
      width: 120,
      render: (value: number) => value.toLocaleString(),
    },
    {
      title: "可用积分",
      dataIndex: "available_points",
      key: "available_points",
      width: 120,
      render: (value: number) => value.toLocaleString(),
    },
    {
      title: "注册时间",
      dataIndex: "registered_at",
      key: "registered_at",
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
      title: "更新时间",
      dataIndex: "updated_at",
      key: "updated_at",
      width: 180,
      render: (value: string) => {
        if (!value) return "-";
        if (!timezoneConfig) {
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
      width: 130,
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
            title="确定要删除该会员吗？"
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
        <div className="min-h-screen bg-[var(--color-surface)] py-12 px-4">
          <div className="w-full bg-[var(--color-card-bg)] rounded-lg shadow-md p-8">
            <div className="flex items-center justify-between mb-6">
              <AdminBreadcrumb title="会员信息" />
              <Button
                type="primary"
                icon={<PlusOutlined />}
                onClick={handleAdd}
              >
                新增会员
              </Button>
            </div>

            <Table<Member>
              columns={columns}
              dataSource={members}
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
              scroll={{ x: 1600 }}
            />

            <Modal
              title={editingMember ? "编辑会员" : "新增会员"}
              open={modalVisible}
              // 禁止点击弹窗外区域关闭
              maskClosable={false}
              onCancel={() => {
                setModalVisible(false);
                form.resetFields();
              }}
              afterOpenChange={handleModalAfterOpenChange}
              destroyOnHidden
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
              <Form<MemberFormValues>
                form={form}
                layout="vertical"
              >
                <Form.Item label="会员编码" name="member_code">
                  <Input placeholder="可选，内部会员编码" />
                </Form.Item>
                <Form.Item label="姓名" name="full_name">
                  <Input />
                </Form.Item>
                <Form.Item label="手机号" name="mobile">
                  <Input />
                </Form.Item>
                <Form.Item label="邮箱" name="email">
                  <Input />
                </Form.Item>
                <Form.Item label="性别" name="gender">
                  <Select allowClear>
                    <Select.Option value="M">男性</Select.Option>
                    <Select.Option value="F">女性</Select.Option>
                    <Select.Option value="O">其他</Select.Option>
                  </Select>
                </Form.Item>
                <Form.Item label="出生日期" name="birth_date">
                  <DatePicker style={{ width: "100%" }} />
                </Form.Item>
                <Form.Item label="状态" name="status" initialValue={1}>
                  <Select>
                    <Select.Option value={1}>正常</Select.Option>
                    <Select.Option value={0}>停用</Select.Option>
                  </Select>
                </Form.Item>
                <Form.Item label="等级" name="level_id">
                  <Select
                    placeholder="请选择等级"
                    allowClear
                    showSearch
                    optionFilterProp="label"
                    filterOption={(input, option) =>
                      (option?.label ?? "").toLowerCase().includes(input.toLowerCase())
                    }
                    options={levels.map((level) => ({
                      value: level.level_id,
                      label: `${level.level_name || "未命名"} (ID: ${level.level_id})`,
                    }))}
                    notFoundContent={
                      levels.length === 0 ? "正在加载等级列表..." : "暂无数据"
                    }
                  />
                </Form.Item>
                <Form.Item label="备注" name="remark">
                  <Input.TextArea rows={3} />
                </Form.Item>
              </Form>
            </Modal>
          </div>
        </div>
      </AdminLayout>
    </ConfigProvider>
  );
}





