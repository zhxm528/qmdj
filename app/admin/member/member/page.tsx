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
  Space,
  Popconfirm,
  message,
} from "antd";
import zhCN from "antd/locale/zh_CN";
import type { ColumnsType } from "antd/es/table";
import { PlusOutlined, EditOutlined, DeleteOutlined } from "@ant-design/icons";
import dayjs, { Dayjs } from "dayjs";

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

  useEffect(() => {
    loadMembers(1, 10);
  }, []);

  const handleAdd = () => {
    setEditingMember(null);
    form.resetFields();
    setModalVisible(true);
  };

  const handleEdit = (record: Member) => {
    setEditingMember(record);
    form.setFieldsValue({
      member_code: record.member_code || undefined,
      full_name: record.full_name || undefined,
      mobile: record.mobile || undefined,
      email: record.email || undefined,
      gender: record.gender || undefined,
      birth_date: record.birth_date ? dayjs(record.birth_date) : null,
      status: record.status,
      level_id: record.level_id || null,
      remark: record.remark || undefined,
    });
    setModalVisible(true);
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
    },
    {
      title: "姓名",
      dataIndex: "full_name",
      key: "full_name",
    },
    {
      title: "手机号",
      dataIndex: "mobile",
      key: "mobile",
    },
    {
      title: "邮箱",
      dataIndex: "email",
      key: "email",
    },
    {
      title: "性别",
      dataIndex: "gender",
      key: "gender",
    },
    {
      title: "状态",
      dataIndex: "status",
      key: "status",
      render: (value: number) => (value === 1 ? "正常" : "停用"),
    },
    {
      title: "等级ID",
      dataIndex: "level_id",
      key: "level_id",
    },
    {
      title: "累计积分",
      dataIndex: "total_points",
      key: "total_points",
    },
    {
      title: "可用积分",
      dataIndex: "available_points",
      key: "available_points",
    },
    {
      title: "注册时间",
      dataIndex: "registered_at",
      key: "registered_at",
      render: (value: string) =>
        value ? dayjs(value).format("YYYY-MM-DD HH:mm:ss") : "-",
    },
    {
      title: "更新时间",
      dataIndex: "updated_at",
      key: "updated_at",
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
            title="确定要删除该会员吗？"
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
              <h1 className="text-3xl font-bold text-gray-900">会员管理</h1>
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
              scroll={{ x: 1200 }}
            />

            <Modal
              title={editingMember ? "编辑会员" : "新增会员"}
              open={modalVisible}
              onOk={handleModalOk}
              onCancel={() => {
                setModalVisible(false);
                form.resetFields();
              }}
              destroyOnClose
            >
              <Form<MemberFormValues>
                form={form}
                layout="vertical"
                preserve={false}
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
                    <Select.Option value="M">男</Select.Option>
                    <Select.Option value="F">女</Select.Option>
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
                <Form.Item label="等级ID" name="level_id">
                  <InputNumber style={{ width: "100%" }} />
                </Form.Item>
                <Form.Item label="备注" name="remark">
                  <Input.TextArea rows={3} />
                </Form.Item>
              </Form>
            </Modal>
          </div>
        </div>
      </Layout>
    </ConfigProvider>
  );
}

