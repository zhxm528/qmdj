# 核心功能
 - **前端页面** `/app/page.tsx`
 - **后台程序** `/app/api/kanpan/route.ts`
 - **后台程序** `/app/api/prompt_context/route.ts`
 - 执行该md文件后，把“需要执行的操作”至“已执行操作，请忽略以下内容，不执行操作”之间区域的内容，追加到“已执行操作，请忽略以下内容，不执行操作”的区域中
## 需要执行的操作


## 已执行操作，请忽略以下内容，不执行操作
- 在 `/app/api/prompt_context/route.ts` 中打印日志，输出对外的入参和出参
- `/app/api/prompt_context/route.ts`的职责负责输出提示词的message[]
- message[]生成的逻辑是，根据入参 `projectCode` 和 `flow` 先获取项目下的“流程”，用 `prompt_templates` 中的 `role` 赋予message的角色，再获取“流程”下的“流程步骤” `flowStep`, 再获取“流程步骤”对应的模板以及模板下的“模板版本”，然后获取模板版本中的 `template_text` 组成message的内容
- 以上逻辑表明一个流程对应一个prompt，多个流程步骤组成message[],最终对外输出一个prompt的json用于在"调用 AI 看盘 API"调用
- 在"调用 AI 看盘 API"之前，先调用**后台程序**，获取提示次模板
- 用返回的提示词模板再调用 AI 看盘 API
- 获取提示词模板的后台程序入参为：
  ```json
  {
    "envCode": "dev",
    "logicalKey": "qmdj.master.analyze_chart",
    "scope": "scene",
    "projectCode": "qmdj",
    "sceneCode": "analyze_chart",
    "role": "system",
    "language": "zh-CN",
    "variables": {
        "chart_json": "{...}",
        "question": "这次官司能赢吗？"
    }
  }
  ```
