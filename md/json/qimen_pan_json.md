# 奇门排盘的排盘结果 json 示例
json
```
{
  "version": "1.0",
  "id": "qmdj-2025-11-16-23-jiashen",
  "meta": {
    "createdAt": "2025-11-16T23:45:00+08:00",
    "author": "system",
    "location": {
      "name": "北京",
      "lat": 39.9,
      "lng": 116.4,
      "timezone": "Asia/Shanghai"
    },
    "method": {
      "school": "traditional",
      "juCalculation": "yang-dun",
      "panType": "feipan"
    },
    "notes": ""
  },
  "input": {
    "calendar": {
      "gregorian": "2025-11-16 23:40:00",
      "lunar": "乙巳年 十月廿六 子时",
      "yearGanzhi": "乙巳",
      "monthGanzhi": "辛亥",
      "dayGanzhi": "庚子",
      "hourGanzhi": "甲子",
      "jieqi": "立冬后"
    },
    "dun": {
      "yinYang": "yang",
      "juNumber": 3,
      "yuan": "shang"
    },
    "flags": {
      "useSolarTime": true,
      "useDST": false
    }
  },
  "chart": {
    "layout": [
      ["1-1", "1-2", "1-3"],
      ["2-1", "2-2", "2-3"],
      ["3-1", "3-2", "3-3"]
    ],
    "palaces": [
      {
        "palaceId": "1-1",
        "row": 1,
        "col": 1,
        "name": "乾宫",
        "trigram": "乾",
        "number": 6,
        "direction": "NW",
        "earthPlateStem": "戊",
        "heavenPlateStem": "丙",
        "hiddenStems": ["戊", "壬"],
        "star": "天蓬星",
        "door": "休门",
        "deity": "太阴",
        "gods": ["太阴"],
        "structures": [],
        "isVoid": false,
        "isHorse": false,
        "isNobleman": false,
        "relationships": {
          "doorToPalace": "生",
          "starToPalace": "比",
          "stemToStem": "比"
        },
        "extra": {
          "notes": ""
        }
      },
      {
        "palaceId": "1-2",
        "row": 1,
        "col": 2,
        "name": "坎宫",
        "trigram": "坎",
        "number": 1,
        "direction": "N",
        "earthPlateStem": "壬",
        "heavenPlateStem": "戊",
        "hiddenStems": ["壬", "癸"],
        "star": "天任星",
        "door": "生门",
        "deity": "六合",
        "gods": ["六合"],
        "structures": [],
        "isVoid": false,
        "isHorse": false,
        "isNobleman": true,
        "relationships": {
          "doorToPalace": "比",
          "starToPalace": "生",
          "stemToStem": "合"
        },
        "extra": {
          "notes": ""
        }
      },
      {
        "palaceId": "1-3",
        "row": 1,
        "col": 3,
        "name": "艮宫",
        "trigram": "艮",
        "number": 8,
        "direction": "NE",
        "earthPlateStem": "艮",
        "heavenPlateStem": "庚",
        "hiddenStems": ["丙", "丁"],
        "star": "天冲星",
        "door": "伤门",
        "deity": "白虎",
        "gods": ["白虎"],
        "structures": [],
        "isVoid": false,
        "isHorse": false,
        "isNobleman": false,
        "relationships": {
          "doorToPalace": "克",
          "starToPalace": "比",
          "stemToStem": "冲"
        },
        "extra": {
          "notes": ""
        }
      },
      {
        "palaceId": "2-1",
        "row": 2,
        "col": 1,
        "name": "兑宫",
        "trigram": "兑",
        "number": 7,
        "direction": "W",
        "earthPlateStem": "辛",
        "heavenPlateStem": "辛",
        "hiddenStems": ["辛"],
        "star": "天辅星",
        "door": "杜门",
        "deity": "腾蛇",
        "gods": ["腾蛇"],
        "structures": [],
        "isVoid": false,
        "isHorse": false,
        "isNobleman": false,
        "relationships": {
          "doorToPalace": "泄",
          "starToPalace": "比",
          "stemToStem": "比"
        },
        "extra": {
          "notes": ""
        }
      },
      {
        "palaceId": "2-2",
        "row": 2,
        "col": 2,
        "name": "中宫",
        "trigram": "中",
        "number": 5,
        "direction": "C",
        "earthPlateStem": "戊",
        "heavenPlateStem": "戊",
        "hiddenStems": ["戊"],
        "star": "天英星",
        "door": "景门",
        "deity": "值符",
        "gods": ["值符"],
        "structures": ["中宫"],
        "isVoid": false,
        "isHorse": false,
        "isNobleman": false,
        "relationships": {
          "doorToPalace": "生",
          "starToPalace": "比",
          "stemToStem": "比"
        },
        "extra": {
          "notes": "本局值符在中宫"
        }
      },
      {
        "palaceId": "2-3",
        "row": 2,
        "col": 3,
        "name": "震宫",
        "trigram": "震",
        "number": 3,
        "direction": "E",
        "earthPlateStem": "乙",
        "heavenPlateStem": "乙",
        "hiddenStems": ["乙"],
        "star": "天芮星",
        "door": "死门",
        "deity": "白虎",
        "gods": ["白虎"],
        "structures": [],
        "isVoid": false,
        "isHorse": true,
        "isNobleman": false,
        "relationships": {
          "doorToPalace": "克",
          "starToPalace": "泄",
          "stemToStem": "刑"
        },
        "extra": {
          "notes": ""
        }
      },
      {
        "palaceId": "3-1",
        "row": 3,
        "col": 1,
        "name": "坤宫",
        "trigram": "坤",
        "number": 2,
        "direction": "SW",
        "earthPlateStem": "己",
        "heavenPlateStem": "丁",
        "hiddenStems": ["己"],
        "star": "天柱星",
        "door": "惊门",
        "deity": "玄武",
        "gods": ["玄武"],
        "structures": [],
        "isVoid": false,
        "isHorse": false,
        "isNobleman": false,
        "relationships": {
          "doorToPalace": "克",
          "starToPalace": "生",
          "stemToStem": "冲"
        },
        "extra": {
          "notes": ""
        }
      },
      {
        "palaceId": "3-2",
        "row": 3,
        "col": 2,
        "name": "离宫",
        "trigram": "离",
        "number": 9,
        "direction": "S",
        "earthPlateStem": "丙",
        "heavenPlateStem": "壬",
        "hiddenStems": ["丙", "戊"],
        "star": "天心星",
        "door": "开门",
        "deity": "九天",
        "gods": ["九天"],
        "structures": [],
        "isVoid": false,
        "isHorse": false,
        "isNobleman": false,
        "relationships": {
          "doorToPalace": "生",
          "starToPalace": "比",
          "stemToStem": "合"
        },
        "extra": {
          "notes": "本局值使门在此宫"
        }
      },
      {
        "palaceId": "3-3",
        "row": 3,
        "col": 3,
        "name": "巽宫",
        "trigram": "巽",
        "number": 4,
        "direction": "SE",
        "earthPlateStem": "辛",
        "heavenPlateStem": "癸",
        "hiddenStems": ["辛"],
        "star": "天禽星",
        "door": "伤门",
        "deity": "九地",
        "gods": ["九地"],
        "structures": [],
        "isVoid": false,
        "isHorse": false,
        "isNobleman": false,
        "relationships": {
          "doorToPalace": "泄",
          "starToPalace": "比",
          "stemToStem": "合"
        },
        "extra": {
          "notes": ""
        }
      }
    ],
    "specialPositions": {
      "zhiFu": {
        "star": "天英星",
        "palaceId": "2-2"
      },
      "zhiShi": {
        "door": "开门",
        "palaceId": "3-2"
      },
      "hourStem": {
        "stem": "甲",
        "palaceId": "1-2"
      },
      "dayStem": {
        "stem": "庚",
        "palaceId": "2-2"
      },
      "yearPalace": {
        "palaceId": "3-1"
      },
      "lifePalace": {
        "palaceId": "1-3"
      }
    }
  },
  "index": {
    "doorToPalace": {
      "休门": "1-1",
      "生门": "1-2",
      "伤门": "1-3",
      "杜门": "2-1",
      "景门": "2-2",
      "死门": "2-3",
      "惊门": "3-1",
      "开门": "3-2"
    },
    "starToPalace": {
      "天蓬星": "1-1",
      "天任星": "1-2",
      "天冲星": "1-3",
      "天辅星": "2-1",
      "天英星": "2-2",
      "天芮星": "2-3",
      "天柱星": "3-1",
      "天心星": "3-2",
      "天禽星": "3-3"
    },
    "deityToPalace": {
      "太阴": "1-1",
      "六合": "1-2",
      "白虎": "1-3",
      "腾蛇": "2-1",
      "值符": "2-2",
      "玄武": "3-1",
      "九天": "3-2",
      "九地": "3-3"
    },
    "stemToPalace_heaven": {
      "甲": "1-2",
      "乙": "2-3",
      "丙": "1-1",
      "丁": "3-1",
      "戊": "2-2",
      "己": "3-1",
      "庚": "1-3",
      "辛": "2-1",
      "壬": "1-2",
      "癸": "3-3"
    }
  }
}
```