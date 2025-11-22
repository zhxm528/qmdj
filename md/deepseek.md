
# 根据页面输入参数调用deepseek的API
## API key: sk-4cfb428f4047486a8bab85b796745658
## base_url: https://api.deepseek.com
## 核心功能
- 前端页面 app/page.tsx
- 后端程序 app/api/kanpan/route.ts 实现调用deepseek API接口
- 后端程序实现获取页面上排盘结果的信息和"问事"输入框中的内容，以json格式作为参数给到API接口
- 后台日志打印输入参数
- 在"排盘"按钮下方增加一个面板，标题为"AI看盘",内容为API接口返回的结果




