# 提示词的硬编码转为基于数据库的动态管理

## 背景

`app/api/kanpan/route.ts` 文件中的硬编码提示词（第 170-226 行）需要参考规则文件 `md/prompt/context.md` 中的说明，将提示词改为基于数据库表的动态管理方式。

> **注意**：先不要修改任何代码，先明确理解和准备执行的步骤。

---

## 第一步：确定模板参数

需要为数据库模板记录确定以下参数：

- **logicalKey**: `qmdj.master.analyze_chart`（奇门遁甲分析场景）
- **scope**: `scene`（场景级）
- **projectCode**: `qmdj`（需要在数据库中创建对应项目）
- **sceneCode**: `analyze_chart`
- **role**: `system`
- **language**: `zh-CN`

---

## 第二步：准备数据库数据

### 2.1 创建项目记录（如果不存在）

**表名**: `projects`

- **code**: `qmdj`
- **name**: `奇门遁甲问事助手`

### 2.2 创建模板记录

**表名**: `prompt_templates`

- **logical_key**: `qmdj.master.analyze_chart`
- 其他必要字段需要根据表结构填写

### 2.3 创建版本记录

**表名**: `prompt_template_versions`

- 将当前硬编码的提示词作为 **v1.0.0** 版本存入
- `template_text` 字段存储完整的提示词内容

### 2.4 创建环境记录（如果不存在）

**表名**: `environments`

- 创建 `dev`、`staging`、`prod` 三个环境记录

### 2.5 （可选）定义变量

**表名**: `prompt_template_variables`

- 如果提示词需要动态部分，在此表中定义变量
- 变量在模板中使用 `{{变量名}}` 格式

### 2.6 创建相应的插入数据的 SQL 语句

需要编写完整的 SQL 插入语句，确保数据完整性和关联关系正确。

---

## 第三步：修改代码逻辑

### 3.1 在 `kanpan/route.ts` 中进行的修改

1. **导入 PromptService**
   ```typescript
   import { PromptService } from '@/app/api/prompt_context/route';
   ```

2. **替换硬编码的 `defaultSystemPrompt` 获取逻辑**

3. **使用 `PromptService.renderToMessages()` 获取 system message**

4. **处理异常和回退**（数据库不可用时的降级方案）

### 3.2 代码结构示例

```typescript
   // 伪代码示例
   const service = new PromptService();
   let systemMessage;

   try {
     const messages = await service.renderToMessages({
       envCode: process.env.ENV || 'dev',
       logicalKey: 'qmdj.master.analyze_chart',
       scope: 'scene',
       projectCode: 'qmdj',
       sceneCode: 'analyze_chart',
       role: 'system',
       language: 'zh-CN',
       variables: {} // 如果有变量
     });
     systemMessage = messages[0].content;
   } catch (error) {
     // 回退到硬编码的默认提示词
  console.error('Failed to load prompt from database:', error);
     systemMessage = defaultSystemPrompt;
   }
```

---

## 第四步：考虑变量化（可选）

当前提示词是静态的。如需动态化，可以考虑以下方案：

### 4.1 将盘面数据作为变量传入

在模板中使用变量占位符，例如：

```typescript
variables: {
  paipan_description: paipanDescription, // 已构建好的盘面描述文本
  // 或其他盘面相关的结构化数据
}
```

模板中可以使用：
```
{{paipan_description}}
```

### 4.2 将问事详情作为变量传入

将问事相关的信息作为变量传递：

```typescript
variables: {
  question_text: questionText,
  question_data: questionData, // 结构化的问事数据
  category_code: questionData?.category_code,
  // 其他问事相关信息
}
```

模板中可以使用：
```
问事：{{question_text}}
问题分类：{{category_code}}
```

### 4.3 变量定义示例

如果采用变量化方案，需要在 `prompt_template_variables` 表中定义变量：

- **name**: `paipan_description`
  - **var_type**: `string`
  - **required**: `true`
  - **description**: `奇门遁甲盘面描述文本`

- **name**: `question_text`
  - **var_type**: `string`
  - **required**: `false`
  - **description**: `用户问事文本`

> **注意**：变量化会增加系统复杂度，建议先实现基础版本（静态提示词），后续根据实际需求再考虑是否引入变量化。

---

## 第五步：测试和验证

### 5.1 单元测试

测试 `PromptService` 的调用：

```typescript
// 测试 PromptService 能否正确获取提示词
const service = new PromptService();
const messages = await service.renderToMessages({
  envCode: 'dev',
  logicalKey: 'qmdj.master.analyze_chart',
  scope: 'scene',
  projectCode: 'qmdj',
  sceneCode: 'analyze_chart',
  role: 'system',
  language: 'zh-CN',
  variables: {}
});

expect(messages[0].role).toBe('system');
expect(messages[0].content).toBeDefined();
```

### 5.2 集成测试

测试完整流程：

1. **正常流程测试**
   - 数据库正常，能正确获取提示词
   - 提示词内容符合预期
   - 变量替换正确（如果使用变量）

2. **异常流程测试**
   - 数据库连接失败时的回退机制
   - 模板不存在时的错误处理
   - 版本不存在时的回退逻辑

### 5.3 回退测试

测试数据库不可用时的降级方案：

```typescript
// 模拟数据库故障场景
// 确保能回退到硬编码的默认提示词
try {
  // 尝试从数据库获取
  systemMessage = await getPromptFromDatabase();
} catch (error) {
  // 验证回退逻辑正常工作
  systemMessage = defaultSystemPrompt;
  expect(systemMessage).toBeDefined();
}
```

---

## 执行顺序建议

建议按照以下顺序执行：

1. ✅ **准备数据库数据**（项目、环境、模板、版本）
   - 创建项目记录
   - 创建环境记录
   - 创建模板记录
   - 创建版本记录（包含当前硬编码的提示词）

2. ✅ **编写 SQL 插入语句**
   - 确保数据完整性和关联关系正确
   - 验证 SQL 语句可以正常执行

3. ✅ **修改代码**，加入回退机制
   - 导入 `PromptService`
   - 替换硬编码获取逻辑
   - 实现异常处理和回退

4. ✅ **测试正常流程和异常流程**
   - 单元测试
   - 集成测试
   - 回退测试

5. ✅ **确认无误后**，可选择移除硬编码（或保留作为回退）
   - 建议先保留硬编码作为回退方案
   - 在稳定运行一段时间后再考虑移除

---

## 注意事项

### 向后兼容

- 保留硬编码作为回退，避免数据库故障导致服务不可用
- 确保在数据库异常时，系统仍能正常工作

### 环境变量

- 使用 `process.env.ENV` 或类似方式确定环境（`dev` / `staging` / `prod`）
- 确保各环境的数据库配置正确

### 性能考虑

- 考虑缓存机制，避免每次请求都查询数据库
- 可以使用内存缓存或 Redis 缓存提示词内容
- 设置合理的缓存过期时间

### 变量设计

- 评估是否需要将提示词变量化，避免过度设计
- 如果当前静态提示词已满足需求，可以不引入变量化
- 变量化会增加系统复杂度和维护成本

### 数据管理

- 确保数据库表结构已正确创建（参考 `md/database/5_context.sql`）
- 建议通过管理后台维护提示词内容，避免直接操作数据库
- 记录提示词变更历史，便于问题排查和回滚

---

## 下一步行动

### 需要确认的问题

1. **是否先准备数据库初始化 SQL？**
   - 可以创建完整的 SQL 插入语句，包括项目、环境、模板、版本等

2. **还是先修改代码？**
   - 可以先实现代码逻辑，使用硬编码作为占位符，后续再切换

### 建议方案

**推荐顺序**：
1. 先准备数据库初始化 SQL（确保数据结构正确）
2. 执行 SQL 插入数据（验证数据完整性）
3. 修改代码逻辑（引入 PromptService）
4. 进行测试验证（确保功能正常）
5. 逐步完善（根据实际需求优化）
