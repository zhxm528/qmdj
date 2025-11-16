# 奇门排盘的排盘结果 json schema
json schema
```
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "$id": "https://example.com/schemas/qmdj-chart.json",
  "title": "Qi Men Dun Jia Chart",
  "description": "奇门遁甲排盘结果 JSON 结构定义",
  "type": "object",
  "additionalProperties": false,
  "required": ["version", "id", "meta", "input", "chart", "index"],
  "properties": {
    "version": {
      "type": "string",
      "description": "当前数据结构版本号，例如 1.0"
    },
    "id": {
      "type": "string",
      "description": "本次排盘的唯一标识，例如 qmdj-2025-11-16-23-jiashen"
    },
    "meta": {
      "$ref": "#/$defs/meta"
    },
    "input": {
      "$ref": "#/$defs/input"
    },
    "chart": {
      "$ref": "#/$defs/chart"
    },
    "index": {
      "$ref": "#/$defs/index"
    }
  },
  "$defs": {
    "palaceId": {
      "type": "string",
      "description": "九宫位置标识：行-列，例如 1-1 表示第一行第一列",
      "pattern": "^[1-3]-[1-3]$"
    },
    "meta": {
      "type": "object",
      "description": "排盘元信息",
      "additionalProperties": false,
      "required": ["createdAt", "author", "location", "method"],
      "properties": {
        "createdAt": {
          "type": "string",
          "format": "date-time",
          "description": "排盘生成时间（ISO 8601）"
        },
        "author": {
          "type": "string",
          "description": "排盘创建者（系统或用户标识）"
        },
        "location": {
          "type": "object",
          "description": "排盘对应地点",
          "additionalProperties": false,
          "required": ["name"],
          "properties": {
            "name": {
              "type": "string",
              "description": "地点名称，如 北京"
            },
            "lat": {
              "type": "number",
              "description": "纬度（可选）"
            },
            "lng": {
              "type": "number",
              "description": "经度（可选）"
            },
            "timezone": {
              "type": "string",
              "description": "时区字符串，如 Asia/Shanghai"
            }
          }
        },
        "method": {
          "type": "object",
          "description": "排盘使用的规则/流派",
          "additionalProperties": false,
          "required": ["school"],
          "properties": {
            "school": {
              "type": "string",
              "description": "流派或算法名称，如 traditional / modern 等"
            },
            "juCalculation": {
              "type": "string",
              "description": "阴遁/阳遁及局数计算方法描述（可选）"
            },
            "panType": {
              "type": "string",
              "description": "飞盘 / 转盘 等类型（可选）"
            }
          }
        },
        "notes": {
          "type": "string",
          "description": "本次排盘的备注说明",
          "default": ""
        }
      }
    },
    "input": {
      "type": "object",
      "description": "用于排盘的输入信息（时间、干支等）",
      "additionalProperties": false,
      "required": ["calendar", "dun"],
      "properties": {
        "calendar": {
          "type": "object",
          "description": "日历和干支信息",
          "additionalProperties": false,
          "required": ["gregorian"],
          "properties": {
            "gregorian": {
              "type": "string",
              "description": "公历时间字符串，例如 2025-11-16 23:40:00"
            },
            "lunar": {
              "type": "string",
              "description": "农历字符串，例如 乙巳年 十月廿六 子时",
              "default": ""
            },
            "yearGanzhi": {
              "type": "string",
              "description": "年干支，例如 乙巳"
            },
            "monthGanzhi": {
              "type": "string",
              "description": "月干支"
            },
            "dayGanzhi": {
              "type": "string",
              "description": "日干支"
            },
            "hourGanzhi": {
              "type": "string",
              "description": "时干支"
            },
            "jieqi": {
              "type": "string",
              "description": "节气信息，例如 立冬后",
              "default": ""
            }
          }
        },
        "dun": {
          "type": "object",
          "description": "遁局信息",
          "additionalProperties": false,
          "required": ["yinYang", "juNumber"],
          "properties": {
            "yinYang": {
              "type": "string",
              "description": "阴遁 / 阳遁",
              "enum": ["yin", "yang"]
            },
            "juNumber": {
              "type": "integer",
              "description": "局数，例如 1~9 之类",
              "minimum": 1
            },
            "yuan": {
              "type": "string",
              "description": "上元 / 中元 / 下元（可选）",
              "enum": ["shang", "zhong", "xia"],
              "default": "shang"
            }
          }
        },
        "flags": {
          "type": "object",
          "description": "时间相关标志位",
          "additionalProperties": false,
          "properties": {
            "useSolarTime": {
              "type": "boolean",
              "description": "是否使用真太阳时",
              "default": true
            },
            "useDST": {
              "type": "boolean",
              "description": "是否使用夏令时",
              "default": false
            }
          }
        }
      }
    },
    "chart": {
      "type": "object",
      "description": "九宫盘的实际排盘结果",
      "additionalProperties": false,
      "required": ["layout", "palaces"],
      "properties": {
        "layout": {
          "type": "array",
          "description": "九宫布局（3×3），每格为 palaceId，如 1-1 表示第一行第一列",
          "minItems": 3,
          "maxItems": 3,
          "items": {
            "type": "array",
            "minItems": 3,
            "maxItems": 3,
            "items": {
              "$ref": "#/$defs/palaceId"
            }
          }
        },
        "palaces": {
          "type": "array",
          "description": "九宫中每一宫的详细信息，共 9 项",
          "minItems": 1,
          "items": {
            "$ref": "#/$defs/palace"
          }
        },
        "specialPositions": {
          "type": "object",
          "description": "值符、值使门等全局关键点位置",
          "additionalProperties": false,
          "properties": {
            "zhiFu": {
              "$ref": "#/$defs/starPosition"
            },
            "zhiShi": {
              "$ref": "#/$defs/doorPosition"
            },
            "hourStem": {
              "$ref": "#/$defs/stemPosition"
            },
            "dayStem": {
              "$ref": "#/$defs/stemPosition"
            },
            "yearPalace": {
              "$ref": "#/$defs/simplePalaceRef"
            },
            "lifePalace": {
              "$ref": "#/$defs/simplePalaceRef"
            }
          }
        }
      }
    },
    "palace": {
      "type": "object",
      "description": "单个宫位的全部信息",
      "additionalProperties": false,
      "required": [
        "palaceId",
        "row",
        "col",
        "name",
        "trigram",
        "number",
        "direction",
        "earthPlateStem",
        "heavenPlateStem",
        "star",
        "door",
        "deity"
      ],
      "properties": {
        "palaceId": {
          "$ref": "#/$defs/palaceId"
        },
        "row": {
          "type": "integer",
          "description": "行号：1、2、3",
          "minimum": 1,
          "maximum": 3
        },
        "col": {
          "type": "integer",
          "description": "列号：1、2、3",
          "minimum": 1,
          "maximum": 3
        },
        "name": {
          "type": "string",
          "description": "宫名，如 坎一宫、离九宫等"
        },
        "trigram": {
          "type": "string",
          "description": "卦名，如 乾、坎、艮、震、巽、离、坤、兑、中"
        },
        "number": {
          "type": "integer",
          "description": "洛书数等，一般为 1~9",
          "minimum": 1,
          "maximum": 9
        },
        "direction": {
          "type": "string",
          "description": "方位：N/NE/E/SE/S/SW/W/NW/C",
          "enum": ["N", "NE", "E", "SE", "S", "SW", "W", "NW", "C"]
        },
        "earthPlateStem": {
          "type": "string",
          "description": "地盘本宫天干"
        },
        "heavenPlateStem": {
          "type": "string",
          "description": "天盘飞临天干"
        },
        "hiddenStems": {
          "type": "array",
          "description": "藏干、地盘三奇六仪等（可选）",
          "items": {
            "type": "string"
          }
        },
        "star": {
          "type": "string",
          "description": "九星之一，如 天蓬星 等"
        },
        "door": {
          "type": "string",
          "description": "八门之一，如 休门、生门、伤门、杜门、景门、死门、惊门、开门"
        },
        "deity": {
          "type": "string",
          "description": "八神/九神之一，如 值符、腾蛇、太阴、六合、白虎、玄武、九天、九地 等"
        },
        "gods": {
          "type": "array",
          "description": "其他神煞或辅助神信息（可选）",
          "items": {
            "type": "string"
          }
        },
        "structures": {
          "type": "array",
          "description": "格局、合冲刑害等说明（可选）",
          "items": {
            "type": "string"
          }
        },
        "isVoid": {
          "type": "boolean",
          "description": "是否空亡",
          "default": false
        },
        "isHorse": {
          "type": "boolean",
          "description": "是否驿马",
          "default": false
        },
        "isNobleman": {
          "type": "boolean",
          "description": "是否贵人",
          "default": false
        },
        "relationships": {
          "type": "object",
          "description": "本宫内部的生克耗比关系（可选）",
          "additionalProperties": false,
          "properties": {
            "doorToPalace": {
              "type": "string",
              "description": "门与宫五行关系，如 生、克、比、泄、耗、墓 等"
            },
            "starToPalace": {
              "type": "string",
              "description": "星与宫五行关系"
            },
            "stemToStem": {
              "type": "string",
              "description": "天盘干与地盘干关系，如 比、冲、合、刑 等"
            }
          }
        },
        "extra": {
          "type": "object",
          "description": "扩展字段，可放任意附加信息",
          "additionalProperties": true
        }
      }
    },
    "starPosition": {
      "type": "object",
      "description": "特定星（如值符星）所在宫位",
      "additionalProperties": false,
      "required": ["star", "palaceId"],
      "properties": {
        "star": {
          "type": "string",
          "description": "星名，如 天任星"
        },
        "palaceId": {
          "$ref": "#/$defs/palaceId"
        }
      }
    },
    "doorPosition": {
      "type": "object",
      "description": "特定门（如值使门）所在宫位",
      "additionalProperties": false,
      "required": ["door", "palaceId"],
      "properties": {
        "door": {
          "type": "string",
          "description": "门名，如 开门"
        },
        "palaceId": {
          "$ref": "#/$defs/palaceId"
        }
      }
    },
    "stemPosition": {
      "type": "object",
      "description": "特定天干（如时干、日干）所在宫位",
      "additionalProperties": false,
      "required": ["stem", "palaceId"],
      "properties": {
        "stem": {
          "type": "string",
          "description": "天干，如 甲、乙、丙、丁 等"
        },
        "palaceId": {
          "$ref": "#/$defs/palaceId"
        }
      }
    },
    "simplePalaceRef": {
      "type": "object",
      "description": "简单宫位引用，例如 年宫、命宫",
      "additionalProperties": false,
      "required": ["palaceId"],
      "properties": {
        "palaceId": {
          "$ref": "#/$defs/palaceId"
        }
      }
    },
    "index": {
      "type": "object",
      "description": "方便程序快速查询的反向索引",
      "additionalProperties": false,
      "properties": {
        "doorToPalace": {
          "type": "object",
          "description": "门名 → 宫位映射",
          "additionalProperties": {
            "$ref": "#/$defs/palaceId"
          }
        },
        "starToPalace": {
          "type": "object",
          "description": "星名 → 宫位映射",
          "additionalProperties": {
            "$ref": "#/$defs/palaceId"
          }
        },
        "deityToPalace": {
          "type": "object",
          "description": "神名 → 宫位映射",
          "additionalProperties": {
            "$ref": "#/$defs/palaceId"
          }
        },
        "stemToPalace_heaven": {
          "type": "object",
          "description": "天盘干 → 宫位映射",
          "additionalProperties": {
            "$ref": "#/$defs/palaceId"
          }
        }
      }
    }
  }
}
```