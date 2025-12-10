# 问事的json格式
json
```
{
    "category_code": "一级类目的 code，如 career_academic",
    "subcategory_code": "二级细分的 code，如 career_academic_job_change；如果不确定，用 null",
    "reason": "你为什么这样分类的简短说明（1-3句）",
    "short_prompt_zh": "提炼后的最简练中文问句，适合作为下一次问奇门盘的问题",
    "extra": {
      "who": "问题主要是为谁而问，如：本人、配偶、子女、朋友；若不明则写 '本人'",
      "time_scope": "你从原文中推断出的时间范围，如：未来三个月、今年内、近期、不明确",
      "key_objects": "涉及的关键人物或事物简要列出，例如：A公司offer、某项目名称等"
   }
  }
```