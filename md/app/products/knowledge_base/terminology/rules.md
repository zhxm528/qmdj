# 知识库术语系统规则（前后端一体）

## 目标
- 提供术语检索、分类浏览、关联跳转的统一体验。
- 前端主站与后台管理共享同一套数据与接口规范。

## 渲染策略
- 要求：SSG（Static Generation）
- 构建时生成静态 HTML
- SEO 很强、速度很好
- 适合：知识库、文章、教程、词条、FAQ

## 关键数据结构
- `term_category`：分类（名称、说明、排序、编码）
- `term`：术语（key、名称、别名、拼音、简述、详述、状态、排序）
- `term_relation`：术语关系（related/parent/child）

## 前端页面
- 术语中心页面：`/app/knowledge_base/terminology/page.tsx`
- 后台管理页面：
  - 术语：`/app/admin/terms/term/page.tsx`
  - 术语分类：`/app/admin/terms/term_category/page.tsx`
  - 术语关系：`/app/admin/terms/term_relation/page.tsx`

## 后台接口
- 术语：`/app/api/admin/terms/term/route.tsx`
- 术语分类：`/app/api/admin/terms/term_category/route.tsx`
- 术语关系：`/app/api/admin/terms/term_relation/route.tsx`
- 配置：`/lib/config.ts`

## 前端交互规范
### 搜索
- 搜索框支持：`term_key`、`name`、`alias`、`pinyin` 的模糊查询。
- 搜索联想（可选）：展示 `term.name` + `term.short_desc`。
- 无结果提示：明确告知并引导更换关键词。

### 详情区
- 展示：名称、分类标签、术语 key、别名、拼音、简述、详述。
- 展示关联术语：related/parent/child 分区。
- 显示更新时间（可选）。

### 嵌入场景
- Tooltip：快速解释 + “查看详情”入口。
- 抽屉/弹层：完整详情展示，不打断当前页面流程。

### 移动端
- 布局从左右改为上下结构。
- 详情可在当前页面折叠切换或独立详情页。

## 页面展示约束
- 页面仅显示搜索框与详情区，不展示左侧分类/列表板块。
- 详情区作为主要内容区域，搜索结果直接驱动详情展示。

## 既有实现说明与要求
- 时间轴导航：
  - 组件：`components/TermTimeline.tsx`
  - 术语分类/术语/术语关系页面设置 `currentStep` 为 0/1/2。
- 搜索逻辑：
  - 主搜索与联想接口支持 `term_key` 模糊查询。
  - 搜索框提示文案需体现四类字段可搜索。
- 后台日志：
  - 搜索接口打印 SQL 模板、参数与完整 SQL。
- 编辑回显：
  - 编辑弹窗完全打开后再设置表单值（`afterOpenChange`）。
  - 编辑与新增流程分离，保证回显稳定。
- 文案规范：
  - 排序选项“手工排序”改为“推荐排序”。
