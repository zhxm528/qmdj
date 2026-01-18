"use client";

import { useState, useEffect } from "react";
import AdminLayout from "@/components/admin/AdminLayout";
import AdminBreadcrumb from "@/components/admin/AdminBreadcrumb";
import {
  ConfigProvider,
  Tabs,
  Table,
  Button,
  Modal,
  Form,
  Input,
  Select,
  Switch,
  InputNumber,
  message,
  Space,
  Popconfirm,
  Card,
} from "antd";
import zhCN from "antd/locale/zh_CN";
import type { ColumnsType } from "antd/es/table";
import { PlusOutlined, EditOutlined, DeleteOutlined } from "@ant-design/icons";

const { TextArea } = Input;
const { TabPane } = Tabs;

// 表名列表
const TABLE_NAMES = [
  { key: "projects", label: "项目" },
  { key: "prompt_templates", label: "提示词模板" },
  { key: "prompt_template_versions", label: "模板版本" },
  { key: "prompt_template_variables", label: "模板变量" },
  { key: "prompt_tags", label: "标签" },
  { key: "prompt_template_tags", label: "模板标签关联" },
  { key: "environments", label: "环境" },
  { key: "prompt_env_versions", label: "环境版本映射" },
  { key: "prompt_flows", label: "流程" },
  { key: "prompt_flow_steps", label: "流程步骤" },
];

interface TableData {
  [key: string]: any;
}

export default function PromptContextManagement() {
  const [activeTab, setActiveTab] = useState("projects");
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<TableData[]>([]);
  const [total, setTotal] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [modalVisible, setModalVisible] = useState(false);
  const [editingRecord, setEditingRecord] = useState<TableData | null>(null);
  const [form] = Form.useForm();

  // 加载数据
  const loadData = async (table: string, page: number = 1, size: number = 10) => {
    setLoading(true);
    try {
      const response = await fetch(
        `/api/admin/system/prompt/context?table=${table}&page=${page}&pageSize=${size}`
      );
      const result = await response.json();

      if (result.success) {
        setData(result.data || []);
        setTotal(result.total || 0);
        setCurrentPage(page);
        setPageSize(size);
      } else {
        message.error(result.error || "加载数据失败");
      }
    } catch (error) {
      console.error("加载数据失败:", error);
      message.error("加载数据失败");
    } finally {
      setLoading(false);
    }
  };

  // 删除数据
  const handleDelete = async (table: string, id: string) => {
    try {
      const response = await fetch(
        `/api/admin/system/prompt/context?table=${table}&id=${id}`,
        { method: "DELETE" }
      );
      const result = await response.json();

      if (result.success) {
        message.success("删除成功");
        loadData(table, currentPage, pageSize);
      } else {
        message.error(result.error || "删除失败");
      }
    } catch (error) {
      console.error("删除失败:", error);
      message.error("删除失败");
    }
  };

  // 打开编辑/新增模态框
  const handleEdit = (record?: TableData) => {
    setEditingRecord(record || null);
    setModalVisible(true);
    if (record) {
      form.setFieldsValue(record);
    } else {
      form.resetFields();
    }
  };

  // 保存数据
  const handleSave = async (values: any) => {
    try {
      const table = activeTab;
      
      // 处理 JSON 字段
      const processedValues = { ...values };
      if (processedValues.metadata && typeof processedValues.metadata === "string") {
        try {
          processedValues.metadata = JSON.parse(processedValues.metadata);
        } catch {
          // 如果解析失败，保持原值
        }
      }
      if (processedValues.config && typeof processedValues.config === "string") {
        try {
          processedValues.config = JSON.parse(processedValues.config);
        } catch {
          // 如果解析失败，保持原值
        }
      }

      let response;

      if (editingRecord) {
        // 更新
        response = await fetch("/api/admin/system/prompt/context", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            table,
            id: editingRecord.id,
            data: processedValues,
          }),
        });
      } else {
        // 新增
        response = await fetch("/api/admin/system/prompt/context", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            table,
            data: processedValues,
          }),
        });
      }

      const result = await response.json();

      if (result.success) {
        message.success(editingRecord ? "更新成功" : "创建成功");
        setModalVisible(false);
        form.resetFields();
        loadData(table, currentPage, pageSize);
      } else {
        message.error(result.error || "保存失败");
      }
    } catch (error) {
      console.error("保存失败:", error);
      message.error("保存失败");
    }
  };

  // 获取表格列定义
  const getColumns = (table: string): ColumnsType<TableData> => {
    const baseColumns: ColumnsType<TableData> = [
      {
        title: "操作",
        key: "action",
        width: 150,
        fixed: "right",
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
              title="确定要删除这条记录吗？"
              onConfirm={() => handleDelete(table, record.id)}
              okText="确定"
              cancelText="取消"
            >
              <Button type="link" danger icon={<DeleteOutlined />}>
                删除
              </Button>
            </Popconfirm>
          </Space>
        ),
      },
    ];

    // 根据表名返回不同的列定义
    if (data.length > 0) {
      const firstRecord = data[0];
      const dataColumns: ColumnsType<TableData> = Object.keys(firstRecord)
        .filter((key) => key !== "id" || table === "prompt_template_tags")
        .map((key) => {
          // 对于 JSONB 字段，显示为可读格式
          if (key === "metadata" || key === "config") {
            return {
              title: key,
              dataIndex: key,
              key,
              render: (value: any) =>
                value ? (
                  <pre style={{ margin: 0, maxWidth: 200, overflow: "auto" }}>
                    {JSON.stringify(value, null, 2)}
                  </pre>
                ) : (
                  "-"
                ),
            };
          }
          // 对于布尔值，显示为开关样式
          if (typeof firstRecord[key] === "boolean") {
            return {
              title: key,
              dataIndex: key,
              key,
              render: (value: boolean) => (value ? "是" : "否"),
            };
          }
          // 对于日期时间，格式化显示
          if (key.includes("_at") || key.includes("time")) {
            return {
              title: key,
              dataIndex: key,
              key,
              render: (value: string) =>
                value ? new Date(value).toLocaleString("zh-CN") : "-",
            };
          }
          // 默认显示
          return {
            title: key,
            dataIndex: key,
            key,
            ellipsis: true,
          };
        });

      return [...dataColumns, ...baseColumns];
    }

    return baseColumns;
  };

  // 获取表单字段定义
  const getFormFields = (table: string) => {
    if (data.length === 0) {
      return null;
    }

    const firstRecord = data[0];
    const fields = Object.keys(firstRecord)
      .filter((key) => {
        // 排除自动生成的字段
        if (key === "id" && table !== "prompt_template_tags") return false;
        if (key === "created_at" || key === "updated_at") return false;
        return true;
      })
      .map((key) => {
        const value = firstRecord[key];
        const field: any = {
          name: key,
          label: key,
        };

        // 根据字段类型和名称设置不同的输入组件
        if (key.includes("description") || key === "template_text" || key === "changelog") {
          field.component = <TextArea rows={4} />;
        } else if (typeof value === "boolean") {
          field.component = <Switch />;
          field.valuePropName = "checked";
        } else if (typeof value === "number") {
          field.component = <InputNumber style={{ width: "100%" }} />;
        } else if (key === "scope") {
          field.component = (
            <Select>
              <Select.Option value="global">global</Select.Option>
              <Select.Option value="project">project</Select.Option>
              <Select.Option value="scene">scene</Select.Option>
            </Select>
          );
        } else if (key === "role") {
          field.component = (
            <Select>
              <Select.Option value="system">system</Select.Option>
              <Select.Option value="user">user</Select.Option>
              <Select.Option value="assistant">assistant</Select.Option>
              <Select.Option value="tool">tool</Select.Option>
              <Select.Option value="fewshot">fewshot</Select.Option>
            </Select>
          );
        } else if (key === "status") {
          field.component = (
            <Select>
              <Select.Option value="active">active</Select.Option>
              <Select.Option value="testing">testing</Select.Option>
              <Select.Option value="deprecated">deprecated</Select.Option>
            </Select>
          );
        } else if (key === "var_type") {
          field.component = (
            <Select>
              <Select.Option value="string">string</Select.Option>
              <Select.Option value="number">number</Select.Option>
              <Select.Option value="boolean">boolean</Select.Option>
              <Select.Option value="json">json</Select.Option>
              <Select.Option value="datetime">datetime</Select.Option>
            </Select>
          );
        } else if (key === "code" && table === "environments") {
          field.component = (
            <Select>
              <Select.Option value="dev">dev</Select.Option>
              <Select.Option value="staging">staging</Select.Option>
              <Select.Option value="prod">prod</Select.Option>
            </Select>
          );
        } else if (key === "version_strategy") {
          field.component = (
            <Select>
              <Select.Option value="latest">latest</Select.Option>
              <Select.Option value="pinned">pinned</Select.Option>
            </Select>
          );
        } else if (key === "metadata" || key === "config") {
          field.component = <TextArea rows={6} />;
        } else {
          field.component = <Input />;
        }

        return field;
      });

    return fields;
  };

  // 切换页签时加载数据
  useEffect(() => {
    loadData(activeTab, 1, 10);
  }, [activeTab]);

  return (
    <ConfigProvider locale={zhCN}>
      <AdminLayout>
        <div className="min-h-screen bg-[var(--color-surface)] py-8 px-4">
          <div className="w-full">
            <Card>
              <div className="mb-4">
                <AdminBreadcrumb title="Prompt 上下文管理" />
                <p className="text-[var(--color-text)] mt-2">
                  管理提示词模板、版本、变量等相关数据
                </p>
              </div>

              <Tabs
                activeKey={activeTab}
                onChange={setActiveTab}
                type="card"
                size="large"
              >
                {TABLE_NAMES.map((table) => (
                  <TabPane tab={table.label} key={table.key}>
                    <div className="mb-4">
                      <Button
                        type="primary"
                        icon={<PlusOutlined />}
                        onClick={() => handleEdit()}
                      >
                        新增
                      </Button>
                    </div>

                    <Table
                      columns={getColumns(table.key)}
                      dataSource={data}
                      rowKey="id"
                      loading={loading}
                      pagination={{
                        current: currentPage,
                        pageSize: pageSize,
                        total: total,
                        showSizeChanger: true,
                        showTotal: (total) => `共 ${total} 条`,
                        onChange: (page, size) => {
                          loadData(table.key, page, size || 10);
                        },
                        onShowSizeChange: (current, size) => {
                          loadData(table.key, 1, size);
                        },
                      }}
                      scroll={{ x: "max-content" }}
                    />
                  </TabPane>
                ))}
              </Tabs>
            </Card>

            {/* 编辑/新增模态框 */}
            <Modal
              title={editingRecord ? "编辑" : "新增"}
              open={modalVisible}
              onCancel={() => {
                setModalVisible(false);
                form.resetFields();
              }}
              footer={null}
              width={800}
            >
              <Form
                form={form}
                layout="vertical"
                onFinish={handleSave}
                initialValues={editingRecord || {}}
              >
                {getFormFields(activeTab)?.map((field: any) => {
                  // 对于 JSON 字段，在显示时转换为字符串
                  let initialValue = editingRecord?.[field.name];
                  if ((field.name === "metadata" || field.name === "config") && initialValue) {
                    if (typeof initialValue === "object") {
                      initialValue = JSON.stringify(initialValue, null, 2);
                    }
                  }

                  return (
                    <Form.Item
                      key={field.name}
                      name={field.name}
                      label={field.label}
                      valuePropName={field.valuePropName}
                      initialValue={initialValue}
                    >
                      {field.component}
                    </Form.Item>
                  );
                })}

                <Form.Item className="mt-6">
                  <Space>
                    <Button type="primary" htmlType="submit">
                      {editingRecord ? "更新" : "创建"}
                    </Button>
                    <Button
                      onClick={() => {
                        setModalVisible(false);
                        form.resetFields();
                      }}
                    >
                      取消
                    </Button>
                  </Space>
                </Form.Item>
              </Form>
            </Modal>
          </div>
        </div>
      </AdminLayout>
    </ConfigProvider>
  );
}





