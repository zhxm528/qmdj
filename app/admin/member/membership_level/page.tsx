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
  Space,
  Popconfirm,
  message,
} from "antd";
import zhCN from "antd/locale/zh_CN";
import type { ColumnsType } from "antd/es/table";
import { PlusOutlined, EditOutlined, DeleteOutlined } from "@ant-design/icons";
import dayjs from "dayjs";

interface MembershipLevel {
  level_id: number;
  level_code: string;
  level_name: string;
  min_points: number;
  max_points: number | null;
  discount_rate: number;
  created_at: string;
  updated_at: string;
}

interface MembershipLevelFormValues {
  level_code?: string;
  level_name?: string;
  min_points?: number;
  max_points?: number | null;
  discount_rate?: number;
}

export default function MembershipLevelPage() {
  const [form] = Form.useForm<MembershipLevelFormValues>();
  const [loading, setLoading] = useState(false);
  const [levels, setLevels] = useState<MembershipLevel[]>([]);
  const [total, setTotal] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [modalVisible, setModalVisible] = useState(false);
  const [editingLevel, setEditingLevel] = useState<MembershipLevel | null>(null);

  const loadLevels = async (page: number, size: number) => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.set("page", String(page));
      params.set("pageSize", String(size));

      const res = await fetch(`/api/admin/member/membership_level?${params.toString()}`);
      const data = await res.json();
      if (data.success) {
        setLevels(data.data || []);
        setTotal(data.total || 0);
        setCurrentPage(page);
        setPageSize(size);
      } else {
        message.error(data.error || "加载会员等级列表失败");
      }
    } catch (error) {
      console.error("加载会员等级列表失败:", error);
      message.error("加载会员等级列表失败");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadLevels(1, 10);
  }, []);

  const handleAdd = () => {
    setEditingLevel(null);
    form.resetFields();
    form.setFieldsValue({
      min_points: 0,
      discount_rate: 1.0,
    });
    setModalVisible(true);
  };

  const handleEdit = (record: MembershipLevel) => {
    setEditingLevel(record);
    form.setFieldsValue({
      level_code: record.level_code,
      level_name: record.level_name,
      min_points: record.min_points,
      max_points: record.max_points,
      discount_rate: record.discount_rate,
    });
    setModalVisible(true);
  };

  const handleDelete = async (record: MembershipLevel) => {
    try {
      const res = await fetch(
        `/api/admin/member/membership_level?id=${record.level_id}`,
        {
          method: "DELETE",
        }
      );
      const data = await res.json();
      if (data.success) {
        message.success("删除成功");
        loadLevels(currentPage, pageSize);
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
        level_code: values.level_code || null,
        level_name: values.level_name || null,
        min_points: values.min_points ?? 0,
        max_points: values.max_points ?? null,
        discount_rate: values.discount_rate ?? 1.0,
      };

      let res: Response;
      if (editingLevel) {
        res = await fetch("/api/admin/member/membership_level", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            level_id: editingLevel.level_id,
            ...payload,
          }),
        });
      } else {
        res = await fetch("/api/admin/member/membership_level", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
      }

      const data = await res.json();
      if (data.success) {
        message.success(editingLevel ? "更新成功" : "创建成功");
        setModalVisible(false);
        form.resetFields();
        loadLevels(currentPage, pageSize);
      } else {
        message.error(data.error || "保存失败");
      }
    } catch (error) {
      console.error("保存失败:", error);
      // 校验错误已在表单内提示，这里只处理网络错误
    }
  };

  const handlePageChange = (page: number, size: number) => {
    loadLevels(page, size);
  };

  const columns: ColumnsType<MembershipLevel> = [
    {
      title: "ID",
      dataIndex: "level_id",
      key: "level_id",
      width: 80,
      fixed: "left",
    },
    {
      title: "等级代码",
      dataIndex: "level_code",
      key: "level_code",
      width: 120,
    },
    {
      title: "等级名称",
      dataIndex: "level_name",
      key: "level_name",
      width: 120,
    },
    {
      title: "最低积分",
      dataIndex: "min_points",
      key: "min_points",
      width: 120,
      render: (value: number) => value.toLocaleString(),
    },
    {
      title: "最高积分",
      dataIndex: "max_points",
      key: "max_points",
      width: 120,
      render: (value: number | null) => (value !== null ? value.toLocaleString() : "无上限"),
    },
    {
      title: "折扣率",
      dataIndex: "discount_rate",
      key: "discount_rate",
      width: 100,
      render: (value: number) => `${(value * 100).toFixed(0)}%`,
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
            title="确定要删除该会员等级吗？"
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
              <h1 className="text-3xl font-bold text-gray-900">会员等级</h1>
              <Button
                type="primary"
                icon={<PlusOutlined />}
                onClick={handleAdd}
              >
                新增等级
              </Button>
            </div>

            <Table<MembershipLevel>
              columns={columns}
              dataSource={levels}
              rowKey="level_id"
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
              title={editingLevel ? "编辑会员等级" : "新增会员等级"}
              open={modalVisible}
              onOk={handleModalOk}
              onCancel={() => {
                setModalVisible(false);
                form.resetFields();
              }}
              destroyOnClose
              width={600}
            >
              <Form<MembershipLevelFormValues>
                form={form}
                layout="vertical"
                preserve={false}
              >
                <Form.Item
                  label="等级代码"
                  name="level_code"
                  rules={[
                    { required: true, message: "请输入等级代码" },
                    { pattern: /^[A-Z_]+$/, message: "等级代码只能包含大写字母和下划线" },
                  ]}
                >
                  <Input placeholder="如: SILVER, GOLD, DIAMOND" />
                </Form.Item>
                <Form.Item
                  label="等级名称"
                  name="level_name"
                  rules={[{ required: true, message: "请输入等级名称" }]}
                >
                  <Input placeholder="如: 银卡, 金卡, 钻石卡" />
                </Form.Item>
                <Form.Item
                  label="最低积分"
                  name="min_points"
                  rules={[
                    { required: true, message: "请输入最低积分" },
                    { type: "number", min: 0, message: "最低积分不能小于0" },
                  ]}
                  initialValue={0}
                >
                  <InputNumber
                    style={{ width: "100%" }}
                    min={0}
                    placeholder="达到该等级所需的最低积分"
                  />
                </Form.Item>
                <Form.Item
                  label="最高积分"
                  name="max_points"
                  rules={[
                    { type: "number", min: 0, message: "最高积分不能小于0" },
                  ]}
                >
                  <InputNumber
                    style={{ width: "100%" }}
                    min={0}
                    placeholder="该等级上限积分（留空表示无上限）"
                  />
                </Form.Item>
                <Form.Item
                  label="折扣率"
                  name="discount_rate"
                  rules={[
                    { required: true, message: "请输入折扣率" },
                    { type: "number", min: 0, max: 1, message: "折扣率必须在0-1之间" },
                  ]}
                  initialValue={1.0}
                  tooltip="1.00表示不打折，0.95表示95折，0.90表示9折"
                >
                  <InputNumber
                    style={{ width: "100%" }}
                    min={0}
                    max={1}
                    step={0.01}
                    precision={2}
                    placeholder="1.00表示不打折"
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

