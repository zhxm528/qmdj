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
  Select,
  Switch,
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

const { TextArea } = Input;

interface PromptTemplateVariable {
  id: string;
  version_id: string;
  name: string;
  var_type: string;
  required: boolean;
  default_value: string | null;
  description: string | null;
  created_at: string;
}

interface PromptTemplateVariableFormValues {
  version_id?: string;
  name?: string;
  var_type?: string;
  required?: boolean;
  default_value?: string;
  description?: string;
}

interface QueryFormValues {
  name?: string;
  var_type?: string[];
}

export default function PromptTemplateVariablesPage() {
  const [form] = Form.useForm<PromptTemplateVariableFormValues>();
  const [queryForm] = Form.useForm<QueryFormValues>();
  const [loading, setLoading] = useState(false);
  const [variables, setVariables] = useState<PromptTemplateVariable[]>([]);
  const [total, setTotal] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [modalVisible, setModalVisible] = useState(false);
  const [editingVariable, setEditingVariable] = useState<PromptTemplateVariable | null>(null);
  const [versions, setVersions] = useState<Array<{ id: string; version: string; template_id: string }>>([]);

  const loadVersions = async () => {
    try {
      const res = await fetch("/api/admin/context/prompt_template_versions?pageSize=-1");
      const data = await res.json();
      if (data.success && data.data) {
        setVersions(data.data);
      }
    } catch (error) {
      console.error("加载版本列表失败:", error);
    }
  };

  const loadVariables = async (page: number, size: number, filters?: QueryFormValues) => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.set("page", String(page));
      params.set("pageSize", String(size));

      // 添加查询条件
      if (filters) {
        if (filters.name) {
          params.set("name", filters.name);
        }
        if (filters.var_type && filters.var_type.length > 0) {
          params.set("var_type", filters.var_type.join(","));
        }
      }

      const res = await fetch(`/api/admin/context/prompt_template_variables?${params.toString()}`);
      const data = await res.json();
      if (data.success) {
        setVariables(data.data || []);
        setTotal(data.total || 0);
        setCurrentPage(page);
        setPageSize(size);
      } else {
        message.error(data.error || "加载模板变量列表失败");
      }
    } catch (error) {
      console.error("加载模板变量列表失败:", error);
      message.error("加载模板变量列表失败");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadVariables(1, 10);
    loadVersions();
  }, []);

  // 处理 Modal 打开后的表单值设置
  const handleModalAfterOpenChange = (open: boolean) => {
    if (open) {
      console.log("[prompt_template_variables] Modal 打开，当前变量:", editingVariable);
      // Modal 完全打开后，设置表单值
      // 使用 setTimeout 确保 Form 组件完全渲染和初始化
      setTimeout(() => {
        if (editingVariable) {
          // 编辑模式：设置表单值
          const formValues = {
            version_id: editingVariable.version_id || undefined,
            name: editingVariable.name || undefined,
            var_type: editingVariable.var_type || undefined,
            required: editingVariable.required !== undefined ? editingVariable.required : true,
            default_value: editingVariable.default_value || undefined,
            description: editingVariable.description || undefined,
          };
          console.log("[prompt_template_variables] Modal 打开后设置表单值:", formValues);
          form.setFieldsValue(formValues);
          // 验证表单值是否设置成功
          const currentValues = form.getFieldsValue();
          console.log("[prompt_template_variables] 表单值已设置，当前表单值:", currentValues);
          console.log("[prompt_template_variables] 表单值设置验证:", {
            name: currentValues.name === formValues.name,
            var_type: currentValues.var_type === formValues.var_type,
            required: currentValues.required === formValues.required,
          });
        } else {
          // 新增模式，重置表单
          form.resetFields();
          form.setFieldsValue({ required: true, var_type: "string" });
        }
      }, 100);
    }
  };

  const handleAdd = () => {
    setEditingVariable(null);
    form.resetFields();
    form.setFieldsValue({ required: true, var_type: "string" });
    setModalVisible(true);
  };

  const handleEdit = async (record: PromptTemplateVariable) => {
    try {
      // 从后端重新查询记录，确保数据最新
      const res = await fetch(`/api/admin/context/prompt_template_variables?id=${record.id}`);
      const data = await res.json();
      
      // 详细打印后端返回给前端的完整内容
      console.log("[prompt_template_variables] ========== 后端返回给前端的完整响应 ==========");
      console.log("[prompt_template_variables] 响应状态码:", res.status);
      console.log("[prompt_template_variables] 响应状态文本:", res.statusText);
      console.log("[prompt_template_variables] 响应数据 (JSON):", JSON.stringify(data, null, 2));
      console.log("[prompt_template_variables] 响应数据 (对象):", data);
      if (data.success) {
        console.log("[prompt_template_variables] success:", data.success);
        if (data.data) {
          console.log("[prompt_template_variables] data 字段内容:", data.data);
          console.log("[prompt_template_variables] data 字段类型:", typeof data.data);
          console.log("[prompt_template_variables] data 是否为数组:", Array.isArray(data.data));
          if (typeof data.data === "object" && !Array.isArray(data.data)) {
            console.log("[prompt_template_variables] data 对象的所有字段:");
            Object.keys(data.data).forEach((key) => {
              console.log(`[prompt_template_variables]   ${key}:`, data.data[key], `(类型: ${typeof data.data[key]})`);
            });
          }
        } else {
          console.log("[prompt_template_variables] data 字段为空或未定义");
        }
      } else {
        console.log("[prompt_template_variables] success:", data.success);
        console.log("[prompt_template_variables] error:", data.error);
      }
      console.log("[prompt_template_variables] ============================================");
      
      if (data.success && data.data) {
        const variable = data.data;
        console.log("[prompt_template_variables] 提取的变量数据对象:", variable);
        
        // 先设置 editingVariable，然后打开 Modal
        // useEffect 会在 Modal 打开后自动设置表单值
        setEditingVariable(variable);
        setModalVisible(true);
      } else {
        message.error(data.error || "查询模板变量信息失败");
      }
    } catch (error) {
      console.error("[prompt_template_variables] 查询模板变量信息失败:", error);
      message.error("查询模板变量信息失败");
    }
  };

  const handleDelete = async (record: PromptTemplateVariable) => {
    try {
      const res = await fetch(
        `/api/admin/context/prompt_template_variables?id=${record.id}`,
        {
          method: "DELETE",
        }
      );
      const data = await res.json();
      if (data.success) {
        message.success("删除成功");
        const filters = queryForm.getFieldsValue();
        loadVariables(currentPage, pageSize, filters);
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
        version_id: values.version_id || null,
        name: values.name || null,
        var_type: values.var_type || "string",
        required: values.required !== undefined ? values.required : true,
        default_value: values.default_value || null,
        description: values.description || null,
      };

      let res: Response;
      if (editingVariable) {
        res = await fetch("/api/admin/context/prompt_template_variables", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            id: editingVariable.id,
            ...payload,
          }),
        });
      } else {
        res = await fetch("/api/admin/context/prompt_template_variables", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
      }

      const data = await res.json();
      if (data.success) {
        message.success(editingVariable ? "更新成功" : "创建成功");
        setModalVisible(false);
        form.resetFields();
        const filters = queryForm.getFieldsValue();
        loadVariables(currentPage, pageSize, filters);
      } else {
        message.error(data.error || "保存失败");
      }
    } catch (error) {
      console.error("保存失败:", error);
    }
  };

  const handlePageChange = (page: number, size: number) => {
    const filters = queryForm.getFieldsValue();
    loadVariables(page, size, filters);
  };

  const handleSearch = () => {
    const filters = queryForm.getFieldsValue();
    loadVariables(1, pageSize, filters);
  };

  const handleReset = () => {
    queryForm.resetFields();
    loadVariables(1, pageSize);
  };

  const columns: ColumnsType<PromptTemplateVariable> = [
    {
      title: "版本ID",
      dataIndex: "version_id",
      key: "version_id",
      width: 300,
      ellipsis: true,
    },
    {
      title: "变量名称",
      dataIndex: "name",
      key: "name",
      width: 200,
    },
    {
      title: "变量类型",
      dataIndex: "var_type",
      key: "var_type",
      width: 150,
      align: "center",
    },
    {
      title: "是否必填",
      dataIndex: "required",
      key: "required",
      width: 100,
      align: "center",
      render: (value: boolean) => (value ? "是" : "否"),
    },
    {
      title: "默认值",
      dataIndex: "default_value",
      key: "default_value",
      width: 250,
      render: (value: string | null) => value || "-",
    },
    {
      title: "描述",
      dataIndex: "description",
      key: "description",
      width: 400,
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
            title="确定要删除该模板变量吗？"
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
              <AdminBreadcrumb title="模板变量" />
              <Button
                type="primary"
                icon={<PlusOutlined />}
                onClick={handleAdd}
              >
                新增变量
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
                    <Form.Item name="name" label="变量名称" style={{ marginBottom: '10px' }}>
                      <Input placeholder="请输入变量名称" />
                    </Form.Item>
                  </Col>
                  <Col xs={24} sm={12} md={6}>
                    <Form.Item name="var_type" label="变量类型" style={{ marginBottom: '10px' }}>
                      <Select
                        mode="multiple"
                        placeholder="请选择变量类型"
                        allowClear
                      >
                        <Select.Option value="string">字符串 (string)</Select.Option>
                        <Select.Option value="number">数字 (number)</Select.Option>
                        <Select.Option value="boolean">布尔值 (boolean)</Select.Option>
                        <Select.Option value="json">JSON (json)</Select.Option>
                        <Select.Option value="datetime">日期时间 (datetime)</Select.Option>
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

            <Table<PromptTemplateVariable>
              columns={columns}
              dataSource={variables}
              rowKey="id"
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
              scroll={{ x: 1580 }}
            />

            <Modal
              title={editingVariable ? "编辑模板变量" : "新增模板变量"}
              open={modalVisible}
              onOk={handleModalOk}
              onCancel={() => {
                setModalVisible(false);
                form.resetFields();
                setEditingVariable(null);
              }}
              afterOpenChange={handleModalAfterOpenChange}
              maskClosable={false}
              destroyOnHidden
              width={700}
              footer={[
                <Button key="close" onClick={() => {
                  setModalVisible(false);
                  form.resetFields();
                  setEditingVariable(null);
                }}>
                  关闭
                </Button>,
                <Button key="submit" type="primary" onClick={handleModalOk}>
                  {editingVariable ? "更新" : "创建"}
                </Button>,
              ]}
            >
              <Form<PromptTemplateVariableFormValues>
                form={form}
                layout="vertical"
                preserve={false}
              >
                <Form.Item
                  label="版本ID"
                  name="version_id"
                  rules={[{ required: true, message: "请选择版本" }]}
                >
                  <Select
                    placeholder="请选择版本"
                    showSearch
                    optionFilterProp="label"
                    options={versions.map((v) => ({
                      value: v.id,
                      label: `版本 ${v.version} (${v.id.slice(0, 8)}...)`,
                    }))}
                  />
                </Form.Item>
                <Form.Item
                  label="变量名称"
                  name="name"
                  rules={[
                    { required: true, message: "请输入变量名称" },
                    { max: 100, message: "变量名称不能超过100个字符" },
                  ]}
                >
                  <Input placeholder="请输入变量名称（如：chart_json, question）" />
                </Form.Item>
                <Form.Item
                  label="变量类型"
                  name="var_type"
                  rules={[{ required: true, message: "请选择变量类型" }]}
                >
                  <Select
                    options={[
                      { value: "string", label: "字符串 (string)" },
                      { value: "number", label: "数字 (number)" },
                      { value: "boolean", label: "布尔值 (boolean)" },
                      { value: "json", label: "JSON (json)" },
                      { value: "datetime", label: "日期时间 (datetime)" },
                    ]}
                  />
                </Form.Item>
                <Form.Item
                  label="是否必填"
                  name="required"
                  valuePropName="checked"
                >
                  <Switch checkedChildren="是" unCheckedChildren="否" />
                </Form.Item>
                <Form.Item label="默认值" name="default_value">
                  <TextArea
                    rows={3}
                    placeholder="请输入默认值（当 required=false 且调用方未提供该变量时使用）"
                  />
                </Form.Item>
                <Form.Item label="描述" name="description">
                  <TextArea
                    rows={3}
                    placeholder="请输入描述（说明该变量的含义和用法）"
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





