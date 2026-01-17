# DeepSeek LLM 调用规范（八字-定命主）

## 目标
在八字盘中生成“定命主”板块的自然语言描述。
`app/bazi/page.tsx` 中对应 case 的 `let text` 变量应来自 LLM 返回内容。

---

## 定命主
## 输入
使用“定命主【我】”板块的 JSON 作为 LLM 输入，该 JSON 来自 `app/api/bazi/step1.ts` 的 `Step1Result`。

输入示例（结构示意）：
```json
{
  "day_master": {
    "stem": "庚",
    "element": "金",
    "yin_yang": "阳"
  },
  "day_pillar": {
    "stem": "庚",
    "branch": "寅"
  },
  "five_elements": {
    "stems": {
      "year_stem": { "stem": "戊", "element": "土" },
      "month_stem": { "stem": "庚", "element": "金" },
      "day_stem": { "stem": "庚", "element": "金" },
      "hour_stem": { "stem": "壬", "element": "水" }
    },
    "branches": {
      "year_branch": { "branch": "寅", "element": "木" },
      "month_branch": { "branch": "申", "element": "金" },
      "day_branch": { "branch": "寅", "element": "木" },
      "hour_branch": { "branch": "子", "element": "水" }
    },
    "optional_summary": {
      "count_by_element": { "木": 2, "火": 0, "土": 1, "金": 3, "水": 2 },
      "notes": ""
    }
  }
}
```

## Prompt 结构


User（包含 JSON）：
```
以下是“定命主”板块 JSON，请生成描述：
<JSON>
```

## Prompt messages 组成逻辑
先通过 PromptService（flow 模板）获取 system messages，再追加 1 条 user message：
```
以下是“定命主”板块 JSON，请生成描述：
<JSON>
```

PromptService 入参规范：
- envCode：通常取 process.env.ENV（dev/staging/prod）
- projectCode：bazi
- flow：flow code（如 flow.bazi.kanpan.mingzhu）

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
    
    { "role": "user", "content": "以下是“定命主”板块 JSON，请生成描述：\n<JSON>" }
  ],
  "temperature": 0.4,
  "max_tokens": 200
}
```

## 输出
LLM 输出为纯文本（不含 JSON、不含 markdown），例如：
```
日主为庚（金，阳），日柱为庚寅。
```

该文本直接赋值给 `app/bazi/page.tsx` 中 `case 1` 的 `let text` 变量并显示。

## 交互与触发时机
- 在“定命主”板块中增加按钮“解盘”。
- 默认展示板块时，不调用 LLM 接口，仅展示本地文案或既有结果。
- 点击“解盘”按钮后，调用后台独立程序执行 LLM 请求。
- LLM 调用逻辑需从原流程中独立到该后台程序中。
- 后台程序返回的 LLM 文本再显示在页面上（赋值 `let text`）。

## 失败处理
- LLM 请求失败时，回退为本地拼接文案（保持原有逻辑）。
- 记录错误日志，便于排查 `DEEPSEEK_BASE_URL` 与 `DEEPSEEK_API_KEY` 配置问题。
