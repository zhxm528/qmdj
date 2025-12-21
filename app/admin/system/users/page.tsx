"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import Layout from "@/components/Layout";
import {
  ConfigProvider,
  Form,
  Input,
  Select,
  Button,
  Table,
  Tag,
  Pagination,
  Card,
  Space,
  message,
  Row,
  Col,
} from "antd";
import zhCN from "antd/locale/zh_CN";
import type { ColumnsType } from "antd/es/table";
import { CloseOutlined, UpOutlined, DownOutlined } from "@ant-design/icons";

interface User {
  id: number;
  name: string;
  email: string;
  role: string;
  status: string;
  is_email_verified: boolean;
  is_paid: boolean;
  created_at: string;
  membership_level?: string;
}

interface QueryParams {
  name?: string;
  email?: string;
  role?: string;
  status?: string;
  isEmailVerified?: boolean;
  isPaid?: boolean;
}

interface ActiveFilter {
  key: keyof QueryParams;
  label: string;
  value: string;
}

export default function UsersManagement() {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [users, setUsers] = useState<User[]>([]);
  const [total, setTotal] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [activeFilters, setActiveFilters] = useState<ActiveFilter[]>([]);
  const [queryParams, setQueryParams] = useState<QueryParams>({});
  const [allPageSizeOptions] = useState<number[]>([10, 100, -1]); // -1 表示全部
  const [isQueryExpanded, setIsQueryExpanded] = useState(true); // 默认展开

  // 使用 useMemo 稳定化 queryParams 的引用，避免无限循环
  const stableQueryParams = useMemo(() => queryParams, [
    queryParams.name,
    queryParams.email,
    queryParams.role,
    queryParams.status,
    queryParams.isEmailVerified,
    queryParams.isPaid,
  ]);

  // 加载用户列表 - 使用 useCallback 稳定化函数引用
  const loadUsers = useCallback(async (params: QueryParams, page: number, size: number) => {
    setLoading(true);
    try {
      const searchParams = new URLSearchParams();
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== "") {
          searchParams.append(key, String(value));
        }
      });
      searchParams.append("page", String(page));
      searchParams.append("pageSize", String(size === -1 ? -1 : size));

      const response = await fetch(
        `/api/admin/system/users?${searchParams.toString()}`
      );
      const result = await response.json();

      if (result.success) {
        setUsers(result.data || []);
        setTotal(result.total || 0);
        setCurrentPage(page);
        setPageSize(size);
      } else {
        message.error(result.error || "加载用户列表失败");
      }
    } catch (error) {
      console.error("加载用户列表失败:", error);
      message.error("加载用户列表失败");
    } finally {
      setLoading(false);
    }
  }, []);

  // 更新活动过滤器
  const updateActiveFilters = (params: QueryParams) => {
    const filters: ActiveFilter[] = [];
    const filterLabels: Record<keyof QueryParams, string> = {
      name: "姓名",
      email: "邮箱",
      role: "角色",
      status: "状态",
      isEmailVerified: "邮箱验证",
      isPaid: "付费状态",
    };

    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== "") {
        let displayValue = String(value);
        if (key === "isEmailVerified") {
          displayValue = value ? "已验证" : "未验证";
        } else if (key === "isPaid") {
          displayValue = value ? "已付费" : "未付费";
        }
        filters.push({
          key: key as keyof QueryParams,
          label: filterLabels[key as keyof QueryParams],
          value: displayValue,
        });
      }
    });
    setActiveFilters(filters);
  };

  // 删除单个过滤器
  const removeFilter = (filterKey: keyof QueryParams) => {
    const newParams = { ...queryParams };
    delete newParams[filterKey];
    setQueryParams(newParams);
    form.setFieldsValue({ [filterKey]: undefined });
    updateActiveFilters(newParams);
    loadUsers(newParams, 1, pageSize);
  };

  // 查询
  const handleSearch = (values: QueryParams) => {
    setQueryParams(values);
    updateActiveFilters(values);
    loadUsers(values, 1, pageSize);
  };

  // 重置查询
  const handleReset = () => {
    form.resetFields();
    const emptyParams: QueryParams = {};
    setQueryParams(emptyParams);
    setActiveFilters([]);
    loadUsers(emptyParams, 1, pageSize);
  };

  // 分页变化
  const handlePageChange = (page: number, size?: number) => {
    const newPageSize = size !== undefined ? size : pageSize;
    loadUsers(stableQueryParams, page, newPageSize);
  };

  // 页面大小变化
  const handlePageSizeChange = (current: number, size: number) => {
    // 如果选择的大小是 10 或 100，直接使用
    // 如果选择的大小是 9999 或等于 total（且 total > 100），认为是选择了"全部"
    let newPageSize = size;
    if (size === 10 || size === 100) {
      newPageSize = size;
    } else if (size === 9999 || (size === total && total > 100)) {
      newPageSize = -1; // "全部"
    } else if (size > 100) {
      newPageSize = -1; // 大于 100 的其他值也认为是"全部"
    }
    setPageSize(newPageSize);
    loadUsers(stableQueryParams, 1, newPageSize); // 切换每页条数时回到第一页
  };

  // 初始加载 - 使用稳定化的 queryParams 和完整的依赖数组
  useEffect(() => {
    loadUsers(stableQueryParams, 1, pageSize);
  }, [stableQueryParams, pageSize, loadUsers]);

  // 表格列定义
  const columns: ColumnsType<User> = [
    {
      title: "ID",
      dataIndex: "id",
      key: "id",
      width: 80,
    },
    {
      title: "姓名",
      dataIndex: "name",
      key: "name",
      width: 120,
    },
    {
      title: "邮箱",
      dataIndex: "email",
      key: "email",
      width: 200,
    },
    {
      title: "角色",
      dataIndex: "role",
      key: "role",
      width: 100,
      render: (role: string) => (
        <Tag color={role === "qmdj" ? "red" : "blue"}>{role}</Tag>
      ),
    },
    {
      title: "状态",
      dataIndex: "status",
      key: "status",
      width: 100,
      render: (status: string) => (
        <Tag color={status === "active" ? "green" : "orange"}>{status}</Tag>
      ),
    },
    {
      title: "邮箱验证",
      dataIndex: "is_email_verified",
      key: "is_email_verified",
      width: 100,
      render: (verified: boolean) => (
        <Tag color={verified ? "green" : "default"}>
          {verified ? "已验证" : "未验证"}
        </Tag>
      ),
    },
    {
      title: "付费状态",
      dataIndex: "is_paid",
      key: "is_paid",
      width: 100,
      render: (paid: boolean) => (
        <Tag color={paid ? "green" : "default"}>
          {paid ? "已付费" : "未付费"}
        </Tag>
      ),
    },
    {
      title: "创建时间",
      dataIndex: "created_at",
      key: "created_at",
      width: 180,
      render: (date: string) =>
        date ? new Date(date).toLocaleString("zh-CN") : "-",
    },
  ];

  return (
    <ConfigProvider locale={zhCN}>
      <Layout>
        <div className="min-h-screen bg-gradient-to-b from-amber-50 to-white py-8 px-4">
          <div className="max-w-7xl mx-auto">
            <h1 className="text-4xl font-bold text-gray-900 mb-6">用户管理</h1>

            {/* 查询条件 */}
            <Card
              title="查询条件"
              className="mb-6"
              extra={
                <Button
                  type="text"
                  icon={isQueryExpanded ? <UpOutlined /> : <DownOutlined />}
                  onClick={() => setIsQueryExpanded(!isQueryExpanded)}
                >
                  {isQueryExpanded ? "收起" : "展开"}
                </Button>
              }
            >
              {isQueryExpanded && (
                <>
                  <Form
                    form={form}
                    onFinish={handleSearch}
                    className="mb-4"
                    layout="vertical"
                  >
                    <Row gutter={[16, 0]}>
                      <Col xs={24} sm={12} md={6}>
                        <Form.Item name="name" label="姓名" style={{ marginBottom: '10px' }}>
                          <Input placeholder="请输入姓名" />
                        </Form.Item>
                      </Col>
                      <Col xs={24} sm={12} md={6}>
                        <Form.Item name="email" label="邮箱" style={{ marginBottom: '10px' }}>
                          <Input placeholder="请输入邮箱" />
                        </Form.Item>
                      </Col>
                      <Col xs={24} sm={12} md={6}>
                        <Form.Item name="role" label="角色" style={{ marginBottom: '10px' }}>
                          <Select placeholder="请选择角色" allowClear>
                            <Select.Option value="user">用户</Select.Option>
                            <Select.Option value="qmdj">管理员</Select.Option>
                          </Select>
                        </Form.Item>
                      </Col>
                      <Col xs={24} sm={12} md={6}>
                        <Form.Item name="status" label="状态" style={{ marginBottom: '10px' }}>
                          <Select placeholder="请选择状态" allowClear>
                            <Select.Option value="pending">待验证</Select.Option>
                            <Select.Option value="active">已激活</Select.Option>
                          </Select>
                        </Form.Item>
                      </Col>
                      <Col xs={24} sm={12} md={6}>
                        <Form.Item name="isEmailVerified" label="邮箱验证" style={{ marginBottom: '10px' }}>
                          <Select placeholder="请选择" allowClear>
                            <Select.Option value={true}>已验证</Select.Option>
                            <Select.Option value={false}>未验证</Select.Option>
                          </Select>
                        </Form.Item>
                      </Col>
                      <Col xs={24} sm={12} md={6}>
                        <Form.Item name="isPaid" label="付费状态" style={{ marginBottom: '10px' }}>
                          <Select placeholder="请选择" allowClear>
                            <Select.Option value={true}>已付费</Select.Option>
                            <Select.Option value={false}>未付费</Select.Option>
                          </Select>
                        </Form.Item>
                      </Col>
                      <Col xs={24} sm={24} md={24}>
                        <Form.Item style={{ marginTop: '10px' }}>
                          <Space>
                            <Button type="primary" htmlType="submit">
                              查询
                            </Button>
                            <Button onClick={handleReset}>重置</Button>
                          </Space>
                        </Form.Item>
                      </Col>
                    </Row>
                  </Form>

                  {/* 已选择的查询条件 */}
                  {activeFilters.length > 0 && (
                    <div className="mt-4">
                      <span className="text-gray-600 mr-2">已选择的条件：</span>
                      <Space wrap>
                        {activeFilters.map((filter) => (
                          <Tag
                            key={filter.key}
                            closable
                            onClose={() => removeFilter(filter.key)}
                            closeIcon={<CloseOutlined />}
                            color="blue"
                          >
                            {filter.label}: {filter.value}
                          </Tag>
                        ))}
                      </Space>
                    </div>
                  )}
                </>
              )}
            </Card>

            {/* 表格 */}
            <Card>
              <Table
                columns={columns}
                dataSource={users}
                rowKey="id"
                loading={loading}
                pagination={false}
                scroll={{ x: 1200 }}
              />
              <div className="mt-4 flex justify-between items-center">
                <div className="text-gray-600">
                  共 {total} 条记录
                </div>
                <Pagination
                  current={currentPage}
                  total={total}
                  pageSize={pageSize === -1 ? total : pageSize}
                  showSizeChanger
                  showTotal={(total, range) => {
                    if (pageSize === -1) {
                      return `共 ${total} 条，显示全部`;
                    }
                    return `共 ${total} 条，第 ${range[0]}-${range[1]} 条`;
                  }}
                  pageSizeOptions={[
                    "10",
                    "100",
                    total > 100 ? total.toString() : "9999", // 9999 代表"全部"
                  ]}
                  onChange={handlePageChange}
                  onShowSizeChange={handlePageSizeChange}
                  showQuickJumper
                />
              </div>
            </Card>
          </div>
        </div>
      </Layout>
    </ConfigProvider>
  );
}
