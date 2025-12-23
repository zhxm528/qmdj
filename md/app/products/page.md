# 核心功能
- 前端页面：`/app/products/page.tsx`
- 后台程序：`/app/api/products/route.ts`
- 配置文件： `/lib/config.ts`
## 需要执行的操作
- “生辰八字”板块中的长按钮“即将推出”改为“进入四柱八字”，置灰改为可点击，点击进入页面“/app/bazi/page.tsx”

## 已执行完毕、忽略不执行的操作



-修改布局
“知识库”板块的布局为：
标题（知识库）
状态标签（白银会员）
文字介绍（features）
长按钮（"进入知识库"）
与“奇门遁甲”板块的布局一致。



- 功能说明
更新“生辰八字”板块的按钮。
在 app/products/page.tsx 中，将“生辰八字”面板配置从：
comingSoon: true
buttonText: "即将推出"
修改为：
path: "/bazi"
buttonText: "进入四柱八字"

移除 comingSoon，按钮不再置灰。
现在产品页“生辰八字”板块的长按钮为可点击的“进入四柱八字”，点击会跳转到 /bazi 页面。