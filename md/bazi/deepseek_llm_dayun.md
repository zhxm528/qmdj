# DeepSeek LLM 调用规范（八字-大运）

## 目标
在八字盘中生成“大运”板块的自然语言描述。
`app/bazi/page.tsx` 中对应 case 的 `let text` 变量应来自 LLM 返回内容。

## 大运
## 输入
使用“大运”板块的 JSON 作为 LLM 输入，该 JSON 来自 `app/api/bazi/step10.ts` 的 `Step10Result`。

输入示例（结构示意）：
```json
{
  "dayun": {
    "meta": {
      "direction": "FORWARD",
      "start_age": 6,
      "start_year": 2001,
      "target_jieqi_name": "立春",
      "target_jieqi_datetime": "2001-02-04 12:00:00",
      "diff_days": 18
    },
    "list": [
      {
        "seq": 1,
        "dayun_pillar": "辛卯",
        "start_age": 6,
        "start_year": 2001,
        "start_month": 2,
        "end_year": 2010,
        "end_month": 1,
        "direction": "FORWARD"
      }
    ]
  }
}
```

## Prompt 结构

User（包含 JSON）：
```
以下是“大运”板块 JSON，请生成描述：
<JSON>
```

## Prompt messages 组成逻辑
先通过 PromptService（flow 模板）获取 system messages，再追加 1 条 user message：
```
以下是“大运”板块 JSON，请生成描述：
<JSON>
```

PromptService 入参规范：
- envCode：通常取 process.env.ENV（dev/staging/prod）
- projectCode：bazi
- flow：flow code（如 flow.bazi.kanpan.dayun）

## API 调用
使用 DeepSeek Chat Completions 接口：
- URL: `${DEEPSEEK_BASE_URL}/v1/chat/completions`
- Headers: `Authorization: Bearer ${DEEPSEEK_API_KEY}`，`Content-Type: application/json`
- Model: `deepseek-chat`

请求体示例：
```json
{
  "model": "deepseek-chat",
  "messages": [
    
    { "role": "user", "content": "以下是“大运”板块 JSON，请生成描述：\n<JSON>" }
  ],
  "temperature": 0.4,
  "max_tokens": 200
}
```

## 输出
LLM 输出为纯文本（不含 JSON、不含 markdown），例如：
```
大运顺行起运较早，运序平稳推进，各步运势以金木转换为主。
```

该文本直接赋值给 `app/bazi/page.tsx` 中 `case 10` 的 `let text` 变量并显示。

## 交互与触发时机
- 在“大运”板块中增加按钮“解盘”。
- 默认展示板块时，不调用 LLM 接口，仅展示本地文案或既有结果。
- 点击“解盘”按钮后，调用后台独立程序执行 LLM 请求。
- LLM 调用逻辑需从原流程中独立到该后台程序中。
- 后台程序返回的 LLM 文本再显示在页面上（赋值 `let text`）。

## 失败处理
- LLM 请求失败时，回退为本地拼接文案（保持原有逻辑）。
- 记录错误日志，便于排查 `DEEPSEEK_BASE_URL` 与 `DEEPSEEK_API_KEY` 配置问题。
