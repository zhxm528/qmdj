# Groq API 故障排除指南

## 问题：403 Forbidden 错误

当您看到 `PermissionDeniedError: 403 Forbidden` 错误时，通常是因为 API 密钥有问题。

## 解决方法

### 1. 检查并更新 Groq API 密钥

访问 [Groq Console](https://console.groq.com/)，创建一个新的 API Key 或验证现有密钥是否仍然有效。

### 2. 创建环境变量文件

在项目根目录创建 `.env.local` 文件（如果还没有的话）：

```bash
# .env.local
GROQ_API_KEY=你的新API密钥
GROQ_MODEL=llama-3.3-70b-versatile
```

### 3. 重启开发服务器

更新配置后，重启 Next.js 开发服务器：

```bash
# 停止当前服务器（Ctrl+C）
# 然后重新启动
npm run dev
```

## 常见 Groq 模型列表

- `llama-3.3-70b-versatile` - 推荐用于一般对话
- `mixtral-8x7b-32768` - Mixtral 模型
- `gemma2-9b-it` - Gemma 模型

## 其他可能的原因

1. **API 配额用尽**：检查 Groq Console 中的使用情况
2. **IP 限制**：某些地区可能需要 VPN
3. **模型不可用**：验证模型名称是否正确
4. **网络问题**：检查网络连接

## 验证 API 密钥

可以通过以下命令测试 API 密钥（需要在项目目录下运行）：

```bash
curl -X POST https://api.groq.com/openai/v1/chat/completions \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "model": "llama-3.3-70b-versatile",
    "messages": [{"role": "user", "content": "Hello"}]
  }'
```

将 `YOUR_API_KEY` 替换为你的实际 API 密钥。

## 需要帮助？

如果问题仍然存在：
1. 检查 Groq 控制台是否有任何错误或通知
2. 验证 API 密钥是否在 Groq Console 中仍然有效
3. 查看 [Groq 文档](https://console.groq.com/docs) 获取最新信息

