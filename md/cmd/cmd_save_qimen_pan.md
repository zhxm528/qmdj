# 排盘后把排盘结果存入数据库
## 数据库信息
- 表名： qimen_pan
- 表结构： 参考文件 md/database/qimen_pan.sql
## 核心功能
- 修改文件 app/api/qimen_pan/route.ts 实现以下功能
- 前端页面中 app/page.tsx 在完成所有排盘操作后，最后执行排盘结果保存入数据库
- 排盘结果按照文件 md/json/qimen_pan_schema.md  生成json格式的字符串存入"pan_json"字段，json示例参考文件 md/json/qimen_pan_json.md
- 参考文件 md/database/qimen_pan.sql 获取对应的信息存入相应字段