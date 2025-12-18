# 核心功能
- 前端页面：`/app/admin/member/recharge_transaction/page.tsx`
- 后台程序：`/app/api/admin/member/recharge_transaction/route.ts`
- 数据库表结构：`/md/database/6_member.sql`
- 配置文件： `/lib/config.ts`
## 需要执行的操作
- 增加查询条件：“会员”，使用ant design的select组件，会员下拉框，下拉框中的会员支持会员名称`full_name`模糊查询，会员下拉框的数据从`member`表中获取
- 增加查询条件：“会员卡号”，文本框输入，支持`member_card`会员卡表中的会员卡号`card_no`模糊查询
- 增加查询条件：“支付方式”，支持多选，使用ant design的select组件
- 增加查询条件：“状态”，支持多选，使用ant design的select组件
- 前端页面表格中，调整表格宽度，内容文字尽量不要换行，尤其是“会员卡号”一列
- 前端页面表格中，表头“操作”一列的宽度需要和表中的内容宽度保持一致

## 已执行完毕、忽略不执行的操作
