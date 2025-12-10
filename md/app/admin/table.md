# 核心功能：基于表结构的自动 CRUD 生成规则

本文件用于**通过表结构的 md 文件自动生成表的增删改查功能**。  
通过定义表结构的 md 文件，执行后可以自动生成：
- 前台展示页面（使用 Ant Design 组件）
- 后台数据库操作 API（Next.js Route Handler）

---

## 表结构定义文件格式

### 文件位置
表结构定义文件应放在 `md/database/` 目录下，命名格式：`{表名}.sql` 或 `{表名}.md`

### 文件内容格式

表结构定义文件应包含以下信息：

1. **表名**：数据库表名（英文，snake_case）
2. **表中文名**：用于页面显示的中文名称
3. **字段定义**：每个字段的详细信息
   - 字段名（英文，snake_case）
   - 字段中文名（用于表单标签和表格列标题）
   - 字段类型（数据库类型）
   - 是否必填
   - 是否主键
   - 是否自增
   - 默认值
   - 字段说明

### 示例格式

```markdown
# 表名：member
# 表中文名：会员信息

## 字段定义

| 字段名 | 中文名 | 类型 | 必填 | 主键 | 自增 | 默认值 | 说明 |
|--------|--------|------|------|------|------|--------|------|
| member_id | ID | BIGSERIAL | 是 | 是 | 是 | - | 会员ID |
| member_code | 会员编码 | VARCHAR(50) | 否 | 否 | 否 | NULL | 内部会员编码 |
| full_name | 姓名 | VARCHAR(100) | 否 | 否 | 否 | NULL | 会员姓名 |
| mobile | 手机号 | VARCHAR(20) | 否 | 否 | 否 | NULL | 手机号 |
| email | 邮箱 | VARCHAR(100) | 否 | 否 | 否 | NULL | 邮箱地址 |
| gender | 性别 | CHAR(1) | 否 | 否 | 否 | NULL | M/F |
| birth_date | 出生日期 | DATE | 否 | 否 | 否 | NULL | 出生日期 |
| status | 状态 | SMALLINT | 是 | 否 | 否 | 1 | 1=正常, 0=停用 |
| level_id | 等级ID | INTEGER | 否 | 否 | 否 | NULL | 会员等级ID |
| total_points | 累计积分 | INTEGER | 是 | 否 | 否 | 0 | 历史累计积分 |
| available_points | 可用积分 | INTEGER | 是 | 否 | 否 | 0 | 当前可用积分 |
| remark | 备注 | TEXT | 否 | 否 | 否 | NULL | 备注信息 |
| registered_at | 注册时间 | TIMESTAMP | 是 | 否 | 否 | NOW() | 注册时间 |
| updated_at | 更新时间 | TIMESTAMP | 是 | 否 | 否 | NOW() | 更新时间 |
```

---

## 字段类型到 Ant Design 组件的映射规则

### 映射表

| 数据库类型 | Ant Design 组件 | 说明 |
|-----------|----------------|------|
| VARCHAR, TEXT, CHAR | `Input` | 文本输入框 |
| TEXT (长文本) | `TextArea` | 多行文本输入框（rows=4） |
| INTEGER, BIGINT, SMALLINT, NUMERIC, DECIMAL | `InputNumber` | 数字输入框 |
| BOOLEAN, BOOL | `Switch` | 开关组件 |
| DATE | `DatePicker` | 日期选择器 |
| TIMESTAMP, TIMESTAMPTZ | `DatePicker` (showTime) | 日期时间选择器 |
| ENUM | `Select` | 下拉选择框（需要提供选项） |
| JSON, JSONB | `TextArea` (JSON格式) | JSON 文本输入框（rows=6） |

### 特殊字段处理

- **主键字段**：在新增表单中隐藏，在编辑表单中只读显示
- **自增字段**：在表单中隐藏，不显示
- **创建时间/更新时间**：在表单中隐藏，在表格中显示为格式化日期
- **布尔字段**：使用 Switch 组件，显示为"是/否"
- **枚举字段**：需要从表结构定义中提取枚举值，生成 Select 选项

---

## 前台页面生成规则

### 文件位置
`app/admin/{面板英文}/{菜单英文}/page.tsx`

### 页面结构

1. **导入依赖**
   ```typescript
   import { useState, useEffect } from "react";
   import Layout from "@/components/Layout";
   import {
     ConfigProvider,
     Form,
     Input,
     Select,
     Button,
     Table,
     Modal,
     Space,
     message,
     Popconfirm,
     DatePicker,
     Switch,
     InputNumber,
   } from "antd";
   import zhCN from "antd/locale/zh_CN";
   import type { ColumnsType } from "antd/es/table";
   import { PlusOutlined, EditOutlined, DeleteOutlined } from "@ant-design/icons";
   ```

2. **状态管理**
   - `loading`: 加载状态
   - `data`: 表格数据列表
   - `total`: 总记录数
   - `currentPage`: 当前页码
   - `pageSize`: 每页条数（支持 10、100、-1（全部））
   - `modalVisible`: 编辑/新增模态框显示状态
   - `editingRecord`: 正在编辑的记录

3. **分页配置**
   ```typescript
   const [allPageSizeOptions] = useState<number[]>([10, 100, -1]); // -1 表示全部
   ```

4. **表格列定义**
   - 根据表结构自动生成列
   - 主键列固定在最左侧
   - 操作列（编辑、删除）固定在最右侧
   - 日期字段自动格式化显示
   - 布尔字段显示为"是/否"

5. **表单字段定义**
   - 根据表结构自动生成表单字段
   - 主键和自增字段在新增时隐藏
   - 创建时间/更新时间字段隐藏
   - 根据字段类型选择对应的 Ant Design 组件

6. **CRUD 操作**
   - **查询（GET）**：支持分页、条件查询
   - **新增（POST）**：打开模态框，填写表单，提交到后台
   - **编辑（PUT）**：打开模态框，预填充数据，提交更新
   - **删除（DELETE）**：带确认提示的删除操作

### 分页实现

```typescript
<Table
  pagination={{
    current: currentPage,
    pageSize: pageSize,
    total: total,
    showSizeChanger: true,
    pageSizeOptions: ['10', '100', '全部'],
    showTotal: (total) => `共 ${total} 条`,
    onChange: (page, size) => {
      loadData(page, size || 10);
    },
    onShowSizeChange: (current, size) => {
      loadData(1, size === '全部' ? -1 : size);
    },
  }}
/>
```

**注意**：当选择"全部"时，`pageSize` 传递 `-1` 给后台，后台应返回所有数据。

---

## 后台 API 生成规则

### 文件位置
`app/api/admin/{面板英文}/{菜单英文}/route.ts`

### API 结构

1. **权限检查函数**
   ```typescript
   async function getCurrentUserId(): Promise<number | null> {
     // 检查管理员权限
     // 返回用户ID或null
   }
   ```

2. **GET 接口：查询列表**
   - 支持分页（page, pageSize）
   - 支持条件查询（根据表字段动态构建 WHERE 条件）
   - 返回格式：
     ```typescript
     {
       success: true,
       data: [...], // 数据列表
       total: 100,  // 总记录数
       page: 1,     // 当前页
       pageSize: 10 // 每页条数
     }
     ```
   - 当 `pageSize = -1` 时，返回所有数据（不分页）

3. **POST 接口：新增记录**
   - 接收表单数据
   - 验证必填字段
   - 插入数据库
   - 返回新创建的记录

4. **PUT 接口：更新记录**
   - 接收记录ID和更新数据
   - 验证必填字段
   - 更新数据库（自动更新 `updated_at`）
   - 返回更新后的记录

5. **DELETE 接口：删除记录**
   - 接收记录ID
   - 删除数据库记录
   - 返回删除的记录

### 查询条件构建规则

- **文本字段**：使用 `ILIKE` 进行模糊查询（不区分大小写）
- **数字字段**：精确匹配或范围查询
- **布尔字段**：精确匹配
- **日期字段**：范围查询（可选）

### 分页实现

```typescript
const page = parseInt(searchParams.get("page") || "1", 10);
const pageSize = parseInt(searchParams.get("pageSize") || "10", 10);

let offset = 0;
let limit: number | null = null;

if (pageSize === -1) {
  // 全部数据，不分页
  limit = null;
} else {
  offset = (page - 1) * pageSize;
  limit = pageSize;
}

// 查询总数
const countResult = await query(`SELECT COUNT(*) as total FROM ${tableName}`, []);
const total = parseInt(countResult[0]?.total || "0", 10);

// 查询数据
let dataQuery = `SELECT * FROM ${tableName} ORDER BY created_at DESC`;
if (limit !== null) {
  dataQuery += ` LIMIT $1 OFFSET $2`;
  const result = await query(dataQuery, [limit, offset]);
} else {
  dataQuery += ` OFFSET $1`;
  const result = await query(dataQuery, [offset]);
}
```

---

## 执行流程

### 1. 解析表结构定义文件
- 读取 `md/database/{表名}.sql` 或 `md/database/{表名}.md`
- 解析表名、表中文名、字段定义

### 2. 生成前台页面
- 根据字段定义生成 TypeScript 接口
- 生成表格列定义（ColumnsType）
- 生成表单字段定义（Form.Item）
- 生成 CRUD 操作函数
- 生成完整页面组件

### 3. 生成后台 API
- 生成权限检查函数
- 生成 GET 接口（查询列表，支持分页和条件查询）
- 生成 POST 接口（新增记录）
- 生成 PUT 接口（更新记录）
- 生成 DELETE 接口（删除记录）

### 4. 字段类型转换
- 数据库类型 → TypeScript 类型
- 数据库类型 → Ant Design 组件
- 处理特殊字段（主键、自增、时间戳等）

---

## 特殊规则

### 1. 主键处理
- 主键字段在新增表单中不显示
- 主键字段在编辑表单中只读显示
- 主键字段在表格中固定显示在第一列

### 2. 自增字段处理
- 自增字段在表单中完全不显示
- 自增字段在表格中正常显示

### 3. 时间字段处理
- `created_at`、`updated_at` 等时间字段在表单中隐藏
- 时间字段在表格中格式化为 `YYYY-MM-DD HH:mm:ss`
- 时间字段在查询条件中支持范围查询

### 4. 布尔字段处理
- 使用 `Switch` 组件
- 显示为"是/否"文本
- 默认值处理：`true`/`false` 或 `1`/`0`

### 5. 枚举字段处理
- 从表结构定义中提取枚举值
- 生成 `Select` 组件的选项列表
- 如果枚举值未定义，使用 `Input` 组件

### 6. JSON 字段处理
- 使用 `TextArea` 组件（rows=6）
- 在表单中显示为格式化的 JSON 字符串
- 提交时自动解析 JSON
- 如果解析失败，保持原字符串

---

## 示例：会员表（member）的完整实现

### 表结构定义
见 `md/database/{表名}.md` 中的定义

### 生成的前台页面
- 文件：`app/admin/{面板英文}/{菜单英文}/page.tsx`
- 功能：
  - 表格展示会员列表
  - 支持分页（10、100、全部）
  - 支持条件查询（姓名、手机号、邮箱等）
  - 新增会员
  - 编辑会员信息
  - 删除会员

### 生成的后台 API
- 文件：`app/api/admin/{面板英文}/{菜单英文}/route.ts`
- 接口：
  - `GET /api/admin/member/management` - 查询会员列表
  - `POST /api/admin/member/management` - 新增会员
  - `PUT /api/admin/member/management` - 更新会员
  - `DELETE /api/admin/member/management` - 删除会员

---

## 注意事项

1. **权限控制**：所有后台 API 都需要进行管理员权限检查
2. **数据验证**：前后台都需要进行数据验证
3. **错误处理**：所有操作都需要适当的错误处理和用户提示
4. **性能优化**：大量数据时，建议使用分页，避免一次性加载全部数据
5. **字段映射**：确保数据库字段名和 TypeScript 接口字段名一致（snake_case → camelCase 转换）

---

## 扩展功能（可选）

1. **批量操作**：支持批量删除、批量更新
2. **导出功能**：支持导出为 Excel、CSV
3. **导入功能**：支持从 Excel、CSV 导入数据
4. **高级查询**：支持多条件组合查询、排序
5. **字段权限**：根据用户角色控制字段的显示和编辑权限

---

## 执行输入参数

执行本 md 文件时，需要提供以下三个参数：

### 1. 表名（Table Name）

- **格式**：数据库表名（英文，snake_case）
- **示例**：`member`、`membership_level`、`member_card`
- **说明**：
  - 用于查找表结构定义文件：`md/database/{表名}.sql` 或 `md/database/{表名}.md`
  - 用于生成数据库查询语句
  - 用于生成 TypeScript 接口名称

### 2. 面板路径（Panel Path）

- **格式**：面板的英文路径标识符（直接指定，不需要翻译）
- **示例**：`member`、`system`、`prompt`、`analytics`
- **说明**：
  - 直接指定用于文件路径的英文标识符
  - 用于生成前台页面路径：`app/admin/{面板路径}/...`
  - 用于生成后台 API 路径：`app/api/admin/{面板路径}/...`
  - 用于生成规则文件路径：`md/app/admin/{面板路径}/...`
  - 面板的显示名称（中文）将从表结构定义文件或配置中获取

### 3. 菜单路径（Menu Path）

- **格式**：菜单的英文路径标识符（直接指定，不需要翻译）
- **示例**：`management`、`card_number`、`level`、`points`
- **说明**：
  - 直接指定用于文件路径的英文标识符
  - 用于生成前台页面路径：`app/admin/{面板路径}/{菜单路径}/page.tsx`
  - 用于生成后台 API 路径：`app/api/admin/{面板路径}/{菜单路径}/route.ts`
  - 用于生成规则文件路径：`md/app/admin/{面板路径}/{菜单路径}/cmd.md`
  - 菜单的显示名称（中文）将从表结构定义文件或配置中获取

### 输入示例

```markdown
## 需要执行的操作

- 表名：member
- 面板路径：member
- 菜单路径：management
```

### 生成的文件路径

根据输入参数，将生成以下文件：

1. **前台页面**
   - 文件路径：`app/admin/{面板路径}/{菜单路径}/page.tsx`
   - 示例：`app/admin/member/management/page.tsx`

2. **后台 API**
   - 文件路径：`app/api/admin/{面板路径}/{菜单路径}/route.ts`
   - 示例：`app/api/admin/member/management/route.ts`

3. **规则文件**（可选）
   - 文件路径：`md/app/admin/{面板路径}/{菜单路径}/cmd.md`
   - 示例：`md/app/admin/member/management/cmd.md`

### 路径命名规范

- **面板路径**：
  - 使用英文单词或短语
  - 多个词使用下划线 `_` 连接（如 `member_management`）
  - 保持简洁、语义清晰
  - 示例：`member`、`system`、`prompt`、`analytics`

- **菜单路径**：
  - 使用英文单词或短语
  - 多个词使用下划线 `_` 连接（如 `card_number`）
  - 保持简洁、语义清晰
  - 示例：`management`、`card_number`、`level`、`points`、`recharge`、`consume`、`users`、`context`

- **命名原则**：
  - 优先使用常见英文单词或短语
  - 多个词使用下划线 `_` 连接
  - 保持简洁、语义清晰
  - 避免使用中文拼音
  - 与文件系统路径规范保持一致

### 执行流程

1. **读取输入参数**
   - 从 md 文件的"需要执行的操作"部分读取表名、面板路径、菜单路径

2. **解析表结构**
   - 根据表名查找并解析表结构定义文件
   - 提取表中文名、字段定义等信息

3. **生成前台页面**
   - 根据表结构生成完整的 React 页面组件
   - 使用 Ant Design 组件库
   - 支持分页（10、100、全部）
   - 文件路径：`app/admin/{面板路径}/{菜单路径}/page.tsx`

4. **生成后台 API**
   - 根据表结构生成完整的 Next.js Route Handler
   - 实现 GET、POST、PUT、DELETE 接口
   - 支持分页和条件查询
   - 文件路径：`app/api/admin/{面板路径}/{菜单路径}/route.ts`

5. **更新 Admin 面板**
   - 在 `/app/admin/page.tsx` 中添加菜单入口（如果面板不存在则先创建面板）
   - 面板显示名称使用表结构定义中的表中文名或配置中的名称
   - 菜单显示名称使用表结构定义中的表中文名或配置中的名称

6. **生成规则文件**（可选）
   - 创建对应的 cmd.md 文件，用于后续扩展
   - 文件路径：`md/app/admin/{面板路径}/{菜单路径}/cmd.md`（使用英文路径）

### 完整示例

**输入**：
```markdown
## 需要执行的操作

- 表名：management
- 面板路径：member
- 菜单路径：management
```

**生成结果**：
- 前台页面：`app/admin/member/management/page.tsx`
- 后台 API：`app/api/admin/member/management/route.ts`
- 规则文件：`md/app/admin/member/management/cmd.md`
- 在 `/app/admin/page.tsx` 的"会员管理"面板中添加"会员信息"菜单（显示名称从表结构定义中获取）

## 需要执行的操作

> 在这里填写要执行的操作，格式如下：
>
> - 表名：{表名}
> - 面板路径：{面板英文路径}
> - 菜单路径：{菜单英文路径}
>
> 示例：
> - 表名：member
> - 面板路径：member
> - 菜单路径：management

## 已执行完毕、忽略不执行的操作

- 表名：membership_level
- 面板路径：member
- 菜单路径：membership_level

- 表名：member_account
- 面板路径：member
- 菜单路径：member_account

- 表名：points_transaction
- 面板路径：member
- 菜单路径：points_transaction

- 表名：consumption_transaction
- 面板路径：member
- 菜单路径：consumption_transaction

- 表名：recharge_transaction
- 面板路径：member
- 菜单路径：recharge_transaction

- 表名：projects
- 面板路径：context
- 菜单路径：projects

- 表名：prompt_templates
- 面板路径：context
- 菜单路径：prompt_templates

- 表名：prompt_template_versions
- 面板路径：context
- 菜单路径：prompt_template_versions

- 表名：prompt_templates
- 面板路径：context
- 菜单路径：prompt_templates

- 表名：prompt_template_versions
- 面板路径：context
- 菜单路径：prompt_template_versions

- 表名：prompt_template_variables
- 面板路径：context
- 菜单路径：prompt_template_variables

- 表名：prompt_tags
- 面板路径：context
- 菜单路径：prompt_tags

- 表名：prompt_template_tags
- 面板路径：context
- 菜单路径：prompt_template_tags

- 表名：environments
- 面板路径：context
- 菜单路径：environments

- 表名：prompt_env_versions
- 面板路径：context
- 菜单路径：prompt_env_versions

- 表名：prompt_flows
- 面板路径：context
- 菜单路径：prompt_flows

- 表名：prompt_flow_steps
- 面板路径：context
- 菜单路径：prompt_flow_steps

- 表名：term_category
- 面板路径：term
- 菜单路径：term_category

- 表名：term
- 面板路径：term
- 菜单路径：term

- 表名：term_relation
- 面板路径：term
- 菜单路径：term_relation