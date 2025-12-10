# 核心功能
 - **前端页面** `/app/page.tsx`
 - **后台程序** `/app/api/prompt_context/route.ts`
 - 执行该md文件后，把“需要执行的操作”至“已执行操作，请忽略以下内容，不执行操作”之间区域的内容，追加到“已执行操作，请忽略以下内容，不执行操作”的区域中
## 需要执行的操作
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


## 已执行操作，请忽略以下内容，不执行操作
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
