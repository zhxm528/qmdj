# 天干五行阴阳表（固定字典）
## 核心功能说明
- 后台程序： /app/api/bazi/wuxingyinyang/route.ts  (如果不存在则创建)
- 前台程序： /app/bazi/pages.ts

- 创建天干五行阴阳 API。该 API 支持：
GET 请求：返回完整的地支藏干映射表
POST 请求：
不传参数：返回完整映射表
传 branches 数组：返回指定地支的天干五行阴阳信息
主要功能
查询功能：可查询特定天干五行阴阳
JSON 格式：返回标准的 JSON 数据结构

- 实现的功能：
1. API 路由
文件：/app/api/bazi/wuxingyinyang/route.ts
2. GET 请求
返回完整的天干五行阴阳映射表
格式：{ success: true, mapping: { ... } }
3. POST 请求
不传参数：返回完整映射表
传 gans 数组：返回指定天干的五行阴阳信息
格式：{ success: true, mapping: { ... }, result: { ... } }
4. 数据结构
包含十个天干的完整映射：
甲、乙（木）
丙、丁（火）
戊、己（土）
庚、辛（金）
壬、癸（水）
每个天干包含：yin_yang（阴阳）和 wu_xing（五行）


## 天干 → 五行 / 阴阳（固定表）

| 天干 | 阴阳 | 五行 |
| -- | -- | -- |
| 甲  | 阳  | 木  |
| 乙  | 阴  | 木  |
| 丙  | 阳  | 火  |
| 丁  | 阴  | 火  |
| 戊  | 阳  | 土  |
| 己  | 阴  | 土  |
| 庚  | 阳  | 金  |
| 辛  | 阴  | 金  |
| 壬  | 阳  | 水  |
| 癸  | 阴  | 水  |

## 常用“固定字典”写法（示例）

### Python

```python
GAN_META = {
  "甲": {"yin_yang": "阳", "wu_xing": "木"},
  "乙": {"yin_yang": "阴", "wu_xing": "木"},
  "丙": {"yin_yang": "阳", "wu_xing": "火"},
  "丁": {"yin_yang": "阴", "wu_xing": "火"},
  "戊": {"yin_yang": "阳", "wu_xing": "土"},
  "己": {"yin_yang": "阴", "wu_xing": "土"},
  "庚": {"yin_yang": "阳", "wu_xing": "金"},
  "辛": {"yin_yang": "阴", "wu_xing": "金"},
  "壬": {"yin_yang": "阳", "wu_xing": "水"},
  "癸": {"yin_yang": "阴", "wu_xing": "水"},
}
```

### JSON

```json
{
  "甲": {"yin_yang": "阳", "wu_xing": "木"},
  "乙": {"yin_yang": "阴", "wu_xing": "木"},
  "丙": {"yin_yang": "阳", "wu_xing": "火"},
  "丁": {"yin_yang": "阴", "wu_xing": "火"},
  "戊": {"yin_yang": "阳", "wu_xing": "土"},
  "己": {"yin_yang": "阴", "wu_xing": "土"},
  "庚": {"yin_yang": "阳", "wu_xing": "金"},
  "辛": {"yin_yang": "阴", "wu_xing": "金"},
  "壬": {"yin_yang": "阳", "wu_xing": "水"},
  "癸": {"yin_yang": "阴", "wu_xing": "水"}
}
```


