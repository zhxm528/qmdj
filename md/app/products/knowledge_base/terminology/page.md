# 核心功能
- 前端页面：`/app/knowledge_base/terminology/page.tsx`
- 前端页面：`/app/admin/terms/term/page.tsx`
- 前端页面：`/app/admin/terms/term_category/page.tsx`
- 前端页面：`/app/admin/terms/term_relation/page.tsx`
- 后台程序：`/app/api/admin/terms/term/route.tsx`
- 后台程序：`/app/api/admin/terms/term_category/route.tsx`
- 后台程序：`/app/api/admin/terms/term_relation/route.tsx`
- 配置文件： `/lib/config.ts`
## 需要执行的操作
- `/app/knowledge_base/terminology/page.tsx` “手工排序” 文字改为 “推荐排序”

## 已执行完毕、忽略不执行的操作


- 功能说明：（增加时间轴）
创建了 TermTimeline 组件 (components/TermTimeline.tsx)
包含三个步骤：术语分类、术语、术语关系
每个步骤可点击跳转到对应页面
点击步骤点可查看说明
在三个页面中添加了时间轴导航：
术语分类页面 (app/admin/term/term_category/page.tsx) - 设置 currentStep={0}
术语页面 (app/admin/term/term/page.tsx) - 设置 currentStep={1}
术语关系页面 (app/admin/term/term_relation/page.tsx) - 设置 currentStep={2}
时间轴导航已添加到三个页面的顶部，与参考页面 /app/admin/context/projects/page.tsx 的实现方式一致。用户可以在三个页面之间快速切换，并查看每个步骤的说明。



- 功能说明：（模糊查询）
更新主搜索 API (app/api/products/knowledge_base/terminology/route.ts)
在搜索条件中添加了 t.term_key ILIKE，支持术语Key的模糊查询
支持：术语Key、名称、别名、拼音四个属性的模糊查询
更新搜索联想 API (app/api/products/knowledge_base/terminology/suggest/route.ts)
在搜索条件中添加了 t.term_key ILIKE，搜索联想也支持术语Key
更新前端搜索框占位符 (app/products/knowledge_base/terminology/page.tsx)
更新占位符文本，提示用户可搜索术语Key、名称、别名或拼音
现在搜索框支持对"术语Key、名称、别名、拼音"四个属性的模糊查询。


- 功能说明：（后台打印日志）
在 app/api/products/knowledge_base/terminology/route.ts 中添加了 SQL 语句打印功能：
打印原始 SQL 语句（带占位符 $1, $2 等）
打印 SQL 参数值数组
打印完整 SQL


- 功能说明：（编辑页面回显）
在 app/admin/term/term/page.tsx 中，确保编辑时正确回显当前记录：
使用 handleModalAfterOpenChange 函数
在 Modal 完全打开后设置表单值
使用 setTimeout 确保 Form 组件已渲染和初始化
编辑模式：从 editingTerm 设置表单值
使用 handleEdit 函数
仅设置 editingTerm 并打开 Modal
表单值由 handleModalAfterOpenChange 在 Modal 打开后设置
使用 handleAdd 函数
简化逻辑，移除直接设置表单值的代码
表单值由 handleModalAfterOpenChange 设置
使用 Modal 组件
添加 afterOpenChange={handleModalAfterOpenChange} 属性
添加 maskClosable={false} 属性
在 onCancel 中添加 setEditingTerm(null) 确保状态重置
确保编辑时，表单会正确回显当前记录的所有字段值。