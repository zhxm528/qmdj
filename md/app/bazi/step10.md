# 排大运（规则引擎 + 落库设计）
用途：基于出生信息 + 性别 + 起运规则 + 月柱，计算连续 10 年一运的大运序列，输出可计算、可追溯、可落库的时间轴。

## 程序调用流程
`/app/bazi/page.tsx` -> `/app/api/bazi/step10.ts` -> `/app/api/bazi/dayun.ts`

## 1) 必要输入（最小 & 完整集）
### A. 基础出生信息（必须）
| 信息 | 说明 |
| --- | --- |
| 公历出生日期时间 | 年/月/日/时（精确到分钟优先） |
| 时区 | 一般中国 +8 |
| 是否夏令时 | 影响时辰、起运天数 |
| 性别 | 决定顺逆行 |

注意：起运天数对分钟级敏感，出生时间必须尽量精确。

### B. 已校验的四柱八字（必须）
| 信息 | 用途 |
| --- | --- |
| 年柱（干支） | 顺逆规则判断 |
| 月柱（干支） | 大运起点 |
| 日柱（干支） | 不直接参与排运 |
| 时柱（干支） | 不参与排运 |

结论：排大运只用月柱 + 年干阴阳 + 性别。

### C. 节气信息（必须）
需要每年 24 节气的精确时间（带时区）。

## 2) 规则字典（固定配置）
### 2.1 顺逆判定
```
阳年男、阴年女 -> 顺行
阴年男、阳年女 -> 逆行
```

年干阴阳：甲丙戊庚壬为阳；乙丁己辛癸为阴。

### 2.2 起运时间规则
- 顺行：出生后 -> 下一个节气  
- 逆行：出生前 -> 上一个节气  

### 2.3 天数 -> 岁数换算
```
起运年龄（岁） = 起运天数 / 3
```
建议保存 1~2 位小数。

## 3) 计算拆解（3 模块）
### 模块 1：顺逆判定（纯规则）
输入：性别、年干阴阳  
输出：`direction = forward | backward`

### 模块 2：起运时间计算（时间 + 节气）
1) 找目标节气  
   - forward：出生后最近的节气  
   - backward：出生前最近的节气  
2) 计算时间差  
```
diff_days = abs(target_jieqi_time - birth_time) / 86400
start_age = diff_days / 3
```
3) 起运时间与年份  
```
start_datetime = birth_time + (direction == forward ? +diff_days : -diff_days)
start_year = year(start_datetime)
```

### 模块 3：干支推运（六十甲子轮转）
1) 以月柱干支为起点  
2) 每运 10 年，干支按 60 甲子顺/逆推  
3) 通常生成 8~10 运  

```
for i in 1..N:
  pillar = rotate_jiazi(month_pillar, direction, i)
  start_age_i = start_age + (i-1)*10
  start_year_i = year(start_datetime + (i-1)*10 years)
  end_year_i = start_year_i + 9
```

## 4) 输出结构（单条大运记录）
| 字段 | 说明 |
| --- | --- |
| seq | 运序（1,2,3…） |
| dayun_gan | 大运天干 |
| dayun_zhi | 大运地支 |
| dayun_pillar | 干支，如“丙寅” |
| start_age | 起运年龄（岁，小数） |
| start_year | 起运年份（公历） |
| start_month | 起运月份（公历，1-12） |
| end_year | 结束年份（公历） |
| end_month | 结束月份（公历，1-12） |
| direction | 顺/逆 |
| source_month_pillar | 来源月柱（校验用） |

## 5) 是否要落库
强烈建议必须落库：  
- 大运是基础时间轴，流年/流月都要挂靠  
- 节气计算成本高，预计算可复用  
- 支持多派别规则版本

## 6) 数据库设计（建议两表）
### 6.1 起运与规则元信息表
表：`public.bazi_dayun_meta_tbl`
- `chart_id`
- `direction`
- `start_age`
- `start_datetime`
- `start_year`
- `start_month`
- `year_stem_yinyang`
- `gender`
- `rule_version`
- `diff_days`
- `target_jieqi_name`
- `target_jieqi_datetime`
- `created_at`

### 6.2 大运明细表
表：`public.bazi_dayun_result_tbl`
- `chart_id`
- `seq`
- `dayun_gan`
- `dayun_zhi`
- `dayun_pillar`
- `start_age`
- `start_year`
- `start_month`
- `end_year`
- `end_month`
- `direction`
- `source_month_pillar`
- `evidence_json`
- `created_at`

## 7) 推荐计算流程（落库顺序）
1) 读取四柱与出生信息  
2) 计算 direction + diff_days + start_age + start_datetime  
3) 写入 `bazi_dayun_meta_tbl`  
4) 生成 8~10 运列表  
5) 写入 `bazi_dayun_result_tbl`

## 8) 输出示例（JSON）
```json
{
  "meta": {
    "direction": "forward",
    "start_age": 6.3,
    "start_year": 2002,
    "diff_days": 18.9,
    "target_jieqi_name": "立春"
  },
  "dayun": [
    {
      "seq": 1,
      "dayun_pillar": "丙寅",
      "start_age": 6.3,
      "start_year": 2002,
      "end_year": 2011
    }
  ]
}
```
