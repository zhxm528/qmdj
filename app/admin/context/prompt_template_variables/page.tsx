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
  Select,
  Switch,
  Space,
  Popconfirm,
  message,
} from "antd";
import zhCN from "antd/locale/zh_CN";
import type { ColumnsType } from "antd/es/table";
import { PlusOutlined, EditOutlined, DeleteOutlined } from "@ant-design/icons";
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

export default function PromptTemplateVariablesPage() {
  const [form] = Form.useForm<PromptTemplateVariableFormValues>();
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

  const loadVariables = async (page: number, size: number) => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.set("page", String(page));
      params.set("pageSize", String(size));

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

  const handleAdd = () => {
    setEditingVariable(null);
    form.resetFields();
    form.setFieldsValue({ required: true, var_type: "string" });
    setModalVisible(true);
  };

  const handleEdit = (record: PromptTemplateVariable) => {
    setEditingVariable(record);
    form.setFieldsValue({
      version_id: record.version_id,
      name: record.name,
      var_type: record.var_type,
      required: record.required,
      default_value: record.default_value || undefined,
      description: record.description || undefined,
    });
    setModalVisible(true);
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
        loadVariables(currentPage, pageSize);
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
        loadVariables(currentPage, pageSize);
      } else {
        message.error(data.error || "保存失败");
      }
    } catch (error) {
      console.error("保存失败:", error);
    }
  };

  const handlePageChange = (page: number, size: number) => {
    loadVariables(page, size);
  };

  const columns: ColumnsType<PromptTemplateVariable> = [
    {
      title: "ID",
      dataIndex: "id",
      key: "id",
      width: 300,
      fixed: "left",
      ellipsis: true,
    },
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
      width: 150,
    },
    {
      title: "变量类型",
      dataIndex: "var_type",
      key: "var_type",
      width: 120,
    },
    {
      title: "是否必填",
      dataIndex: "required",
      key: "required",
      width: 100,
      render: (value: boolean) => (value ? "是" : "否"),
    },
    {
      title: "默认值",
      dataIndex: "default_value",
      key: "default_value",
      width: 200,
      ellipsis: true,
      render: (value: string | null) => value || "-",
    },
    {
      title: "描述",
      dataIndex: "description",
      key: "description",
      width: 300,
      ellipsis: true,
      render: (value: string | null) => value || "-",
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
            title="确定要删除该模板变量吗？"
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
              <h1 className="text-3xl font-bold text-gray-900">模板变量</h1>
              <Button
                type="primary"
                icon={<PlusOutlined />}
                onClick={handleAdd}
              >
                新增变量
              </Button>
            </div>

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
              scroll={{ x: 1500 }}
            />

            <Modal
              title={editingVariable ? "编辑模板变量" : "新增模板变量"}
              open={modalVisible}
              onOk={handleModalOk}
              onCancel={() => {
                setModalVisible(false);
                form.resetFields();
              }}
              destroyOnClose
              width={700}
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
      </Layout>
    </ConfigProvider>
  );
}

