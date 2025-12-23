import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { query } from "@/lib/db";

// 宫位编号到行列的映射（DISPLAY_ORDER = [4, 9, 2, 3, 5, 7, 8, 1, 6]）
// 对应九宫格布局：第一行 [4, 9, 2]，第二行 [3, 5, 7]，第三行 [8, 1, 6]
const PALACE_TO_ROW_COL: Record<number, { row: number; col: number }> = {
  4: { row: 1, col: 1 }, // 巽宫
  9: { row: 1, col: 2 }, // 离宫
  2: { row: 1, col: 3 }, // 坤宫
  3: { row: 2, col: 1 }, // 震宫
  5: { row: 2, col: 2 }, // 中宫
  7: { row: 2, col: 3 }, // 兑宫
  8: { row: 3, col: 1 }, // 艮宫
  1: { row: 3, col: 2 }, // 坎宫
  6: { row: 3, col: 3 }, // 乾宫
};

// 宫位编号到宫名、卦名、洛书数、方位的映射
const PALACE_INFO: Record<
  number,
  { name: string; trigram: string; number: number; direction: string }
> = {
  1: { name: "坎一宫", trigram: "坎", number: 1, direction: "N" },
  2: { name: "坤二宫", trigram: "坤", number: 2, direction: "SW" },
  3: { name: "震三宫", trigram: "震", number: 3, direction: "E" },
  4: { name: "巽四宫", trigram: "巽", number: 4, direction: "SE" },
  5: { name: "中五宫", trigram: "中", number: 5, direction: "C" },
  6: { name: "乾六宫", trigram: "乾", number: 6, direction: "NW" },
  7: { name: "兑七宫", trigram: "兑", number: 7, direction: "W" },
  8: { name: "艮八宫", trigram: "艮", number: 8, direction: "NE" },
  9: { name: "离九宫", trigram: "离", number: 9, direction: "S" },
};

// 门名映射（去掉"门"字）
const DOOR_NAME_MAP: Record<string, string> = {
  休: "休门",
  生: "生门",
  伤: "伤门",
  杜: "杜门",
  景: "景门",
  死: "死门",
  惊: "惊门",
  开: "开门",
};

// 星名映射（确保有"星"字）
const STAR_NAME_MAP: Record<string, string> = {
  天蓬: "天蓬星",
  天任: "天任星",
  天冲: "天冲星",
  天辅: "天辅星",
  天英: "天英星",
  天芮: "天芮星",
  天柱: "天柱星",
  天心: "天心星",
  天禽: "天禽星",
};

/**
 * 将宫位编号转换为 palaceId (row-col 格式)
 */
function palaceToId(palaceNo: number): string {
  const pos = PALACE_TO_ROW_COL[palaceNo];
  if (!pos) {
    throw new Error(`无效的宫位编号: ${palaceNo}`);
  }
  return `${pos.row}-${pos.col}`;
}

/**
 * 获取当前用户ID（从session cookie）
 */
async function getCurrentUserId(): Promise<number | null> {
  try {
    const cookieStore = await cookies();
    const session = cookieStore.get("session");
    if (!session?.value) {
      return null;
    }

    const token = session.value.trim();
    // 尝试按邮箱查询
    const userRows = await query(
      `SELECT id FROM users WHERE email = $1 LIMIT 1`,
      [token.toLowerCase()]
    );

    if (userRows && userRows.length > 0) {
      return (userRows[0] as { id: number }).id;
    }

    // 若未命中且token是数字，按ID查询
    if (/^\d+$/.test(token)) {
      const userRowsById = await query(
        `SELECT id FROM users WHERE id = $1 LIMIT 1`,
        [parseInt(token, 10)]
      );
      if (userRowsById && userRowsById.length > 0) {
        return (userRowsById[0] as { id: number }).id;
      }
    }

    return null;
  } catch (error) {
    console.error("[qimen_pan] 获取用户ID失败:", error);
    return null;
  }
}

/**
 * 生成逻辑盘key
 * 格式：时辰槽|timezone|dun_type|ju_number|bureau_type|method
 */
function generateLogicKey(
  hourPillar: string,
  timezone: string,
  dunType: number,
  juNumber: number,
  bureauType: string,
  method: string
): string {
  return `${hourPillar}|${timezone}|${dunType}|${juNumber}|${bureauType}|${method}`;
}

/**
 * 生成排盘ID
 */
function generatePanId(
  date: string,
  hour: string,
  hourPillar: string
): string {
  const dateStr = date.replace(/-/g, "");
  const hourStr = hour.padStart(2, "0");
  return `qmdj-${dateStr}-${hourStr}-${hourPillar.toLowerCase()}`;
}

/**
 * 构建符合schema的JSON数据
 */
function buildPanJson(data: {
  date: string;
  hour: string;
  minute: string;
  dateInfo: any;
  dipangan: Record<number, string>;
  tianpangan: Record<number, string>;
  dibashen: Record<number, string>;
  tianbashen: Record<number, string>;
  jiuxing: Record<number, string>;
  bamen: Record<number, string>;
  kongwang: Record<number, boolean>;
  yima: Record<number, boolean>;
  jigong: Record<number, { diGan?: string; tianGan?: string }>;
  zhiShiDoor: string;
  zhiFuPalace: number | null;
}): any {
  const { date, hour, minute, dateInfo } = data;
  const hourPillar = dateInfo.fourPillars.hour;
  const panId = generatePanId(date, hour, hourPillar);

  // 构建layout（3x3数组）
  const layout = [
    ["1-1", "1-2", "1-3"],
    ["2-1", "2-2", "2-3"],
    ["3-1", "3-2", "3-3"],
  ];

  // 构建palaces数组（按DISPLAY_ORDER顺序）
  const DISPLAY_ORDER = [4, 9, 2, 3, 5, 7, 8, 1, 6];
  const palaces = DISPLAY_ORDER.map((palaceNo) => {
    const pos = PALACE_TO_ROW_COL[palaceNo];
    const info = PALACE_INFO[palaceNo];
    const diGan = data.dipangan[palaceNo] || "";
    const tianGan = data.tianpangan[palaceNo] || "";
    const diShen = data.dibashen[palaceNo] || "";
    const tianShen = data.tianbashen[palaceNo] || "";
    const starRaw = data.jiuxing[palaceNo] || "";
    const doorRaw = data.bamen[palaceNo] || "";
    const kongWang = data.kongwang[palaceNo] || false;
    const yiMa = data.yima[palaceNo] || false;
    const jiGongInfo = data.jigong[palaceNo] || null;

    // 处理星名（确保有"星"字）
    let star = starRaw;
    if (star && !star.includes("星")) {
      star = STAR_NAME_MAP[star] || `${star}星`;
    }

    // 处理门名（确保有"门"字）
    let door = doorRaw;
    if (door && !door.includes("门")) {
      door = DOOR_NAME_MAP[door] || `${door}门`;
    }

    // 处理神名（确保格式正确）
    let deity = tianShen || diShen || "";
    if (deity && !deity.includes("神") && !["值符", "腾蛇", "太阴", "六合", "白虎", "玄武", "九天", "九地"].includes(deity)) {
      // 保持原样
    }

    // 构建hiddenStems（寄宫信息）
    const hiddenStems: string[] = [];
    if (jiGongInfo?.diGan) {
      hiddenStems.push(jiGongInfo.diGan);
    }
    if (jiGongInfo?.tianGan) {
      hiddenStems.push(jiGongInfo.tianGan);
    }

    return {
      palaceId: palaceToId(palaceNo),
      row: pos.row,
      col: pos.col,
      name: info.name,
      trigram: info.trigram,
      number: info.number,
      direction: info.direction,
      earthPlateStem: diGan,
      heavenPlateStem: tianGan,
      ...(hiddenStems.length > 0 ? { hiddenStems } : {}),
      ...(star ? { star } : {}),
      ...(door ? { door } : {}),
      ...(deity ? { deity, gods: [deity] } : {}),
      structures: [],
      isVoid: kongWang,
      isHorse: yiMa,
      isNobleman: false,
      relationships: {},
      extra: {
        notes: jiGongInfo ? "寄宫" : "",
      },
    };
  });

  // 构建specialPositions
  const specialPositions: any = {};

  // 值符位置（从地八神中找到值符所在的宫位）
  if (data.zhiFuPalace !== null) {
    const zhiFuStar = data.jiuxing[data.zhiFuPalace] || "";
    const starName = zhiFuStar && !zhiFuStar.includes("星") 
      ? STAR_NAME_MAP[zhiFuStar] || `${zhiFuStar}星`
      : zhiFuStar;
    specialPositions.zhiFu = {
      star: starName,
      palaceId: palaceToId(data.zhiFuPalace),
    };
  }

  // 值使门位置
  if (data.zhiShiDoor) {
    // 找到值使门所在的宫位
    // zhiShiDoor 可能是"休"、"生"、"休门"等格式
    const zhiShiDoorNormalized = data.zhiShiDoor.replace("门", "");
    let zhiShiPalace: number | null = null;
    for (const [key, value] of Object.entries(data.bamen)) {
      const palace = Number(key);
      const doorName = value || "";
      const doorNameNormalized = doorName.replace("门", "");
      // 匹配值使门（去掉"门"字后比较）
      if (doorNameNormalized === zhiShiDoorNormalized || doorName === data.zhiShiDoor) {
        zhiShiPalace = palace;
        break;
      }
    }
    if (zhiShiPalace !== null) {
      const doorName = data.bamen[zhiShiPalace] || "";
      const fullDoorName = doorName && !doorName.includes("门")
        ? DOOR_NAME_MAP[doorName] || `${doorName}门`
        : doorName;
      specialPositions.zhiShi = {
        door: fullDoorName,
        palaceId: palaceToId(zhiShiPalace),
      };
    }
  }

  // 时干位置
  const hourGan = hourPillar.substring(0, 1);
  for (const [key, value] of Object.entries(data.tianpangan)) {
    if (value === hourGan) {
      specialPositions.hourStem = {
        stem: hourGan,
        palaceId: palaceToId(Number(key)),
      };
      break;
    }
  }

  // 日干位置
  const dayGan = dateInfo.fourPillars.day.substring(0, 1);
  for (const [key, value] of Object.entries(data.tianpangan)) {
    if (value === dayGan) {
      specialPositions.dayStem = {
        stem: dayGan,
        palaceId: palaceToId(Number(key)),
      };
      break;
    }
  }

  // 构建index（反向索引）
  const index: any = {
    doorToPalace: {},
    starToPalace: {},
    deityToPalace: {},
    stemToPalace_heaven: {},
  };

  DISPLAY_ORDER.forEach((palaceNo) => {
    const door = data.bamen[palaceNo];
    if (door) {
      const fullDoorName = door && !door.includes("门")
        ? DOOR_NAME_MAP[door] || `${door}门`
        : door;
      index.doorToPalace[fullDoorName] = palaceToId(palaceNo);
    }

    const star = data.jiuxing[palaceNo];
    if (star) {
      const fullStarName = star && !star.includes("星")
        ? STAR_NAME_MAP[star] || `${star}星`
        : star;
      index.starToPalace[fullStarName] = palaceToId(palaceNo);
    }

    const deity = data.tianbashen[palaceNo] || data.dibashen[palaceNo];
    if (deity) {
      index.deityToPalace[deity] = palaceToId(palaceNo);
    }

    const tianGan = data.tianpangan[palaceNo];
    if (tianGan) {
      index.stemToPalace_heaven[tianGan] = palaceToId(palaceNo);
    }
  });

  // 构建完整的JSON
  const gregorianTime = `${date} ${hour.padStart(2, "0")}:${minute.padStart(2, "0")}:00`;
  const now = new Date();
  const createdAt = now.toISOString();

  return {
    version: "1.0",
    id: panId,
    meta: {
      createdAt: createdAt,
      author: "system",
      location: {
        name: "北京",
        timezone: "Asia/Shanghai",
      },
      method: {
        school: "traditional",
        juCalculation: dateInfo.dunType === "阳遁" ? "yang-dun" : "yin-dun",
        panType: "feipan",
      },
      notes: "",
    },
    input: {
      calendar: {
        gregorian: gregorianTime,
        lunar: dateInfo.lunar || "",
        yearGanzhi: dateInfo.fourPillars.year,
        monthGanzhi: dateInfo.fourPillars.month,
        dayGanzhi: dateInfo.fourPillars.day,
        hourGanzhi: hourPillar,
        jieqi: dateInfo.startShijie || dateInfo.season || "",
      },
      dun: {
        yinYang: dateInfo.dunType === "阳遁" ? "yang" : "yin",
        juNumber: dateInfo.ju,
        yuan: "shang", // 默认上元，可根据实际需求调整
      },
      flags: {
        useSolarTime: true,
        useDST: false,
      },
    },
    chart: {
      layout,
      palaces,
      specialPositions: Object.keys(specialPositions).length > 0 ? specialPositions : undefined,
    },
    index,
  };
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      date,
      hour,
      minute,
      dateInfo,
      dipangan,
      tianpangan,
      dibashen,
      tianbashen,
      jiuxing,
      bamen,
      kongwang,
      yima,
      jigong,
      zhiShiDoor,
      zhiFuPalace,
      bazi_json, // 八字排盘JSON数据
    } = body;

    // 判断是八字排盘还是奇门排盘
    const isBazi = !!bazi_json;

    if (isBazi) {
      // 八字排盘保存逻辑
      if (!date || !hour || !bazi_json) {
        return NextResponse.json(
          { error: "缺少必填字段" },
          { status: 400 }
        );
      }

      // 获取当前用户ID（可选）
      const clientId = await getCurrentUserId();

      // 从bazi_json中提取四柱信息
      const fourPillarsData = bazi_json.input?.four_pillars;
      if (!fourPillarsData) {
        return NextResponse.json(
          { error: "八字排盘数据格式不正确" },
          { status: 400 }
        );
      }

      // 计算逻辑盘key（使用四柱格式："年柱 月柱 日柱 时柱"）
      const yearPillar = `${fourPillarsData.year?.stem || ""}${fourPillarsData.year?.branch || ""}`;
      const monthPillar = `${fourPillarsData.month?.stem || ""}${fourPillarsData.month?.branch || ""}`;
      const dayPillar = `${fourPillarsData.day?.stem || ""}${fourPillarsData.day?.branch || ""}`;
      const hourPillar = `${fourPillarsData.hour?.stem || ""}${fourPillarsData.hour?.branch || ""}`;
      const logicKey = `${yearPillar} ${monthPillar} ${dayPillar} ${hourPillar}`;

      // 构建cast_time（起局时间）
      const castTime = new Date(`${date}T${hour.padStart(2, "0")}:${minute || "00"}:00`);

      // 数据库插入所需的其他字段（八字排盘不需要dun_type和ju_number，设为默认值）
      const timezone = "Asia/Shanghai";
      const dunType = 0; // 八字排盘不使用
      const juNumber = 0; // 八字排盘不使用
      const bureauType = "bazi"; // 八字排盘
      const method = "bazi_reading_flow_v1"; // 八字排盘方法

      // 插入数据库
      const result = await query(
        `INSERT INTO qimen_pan (
          cast_time, timezone, dun_type, ju_number, bureau_type, method,
          client_id, operator, question, category,
          pan_json, meta_json, schema_version, logic_key, status, remark
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)
        RETURNING id, uid`,
        [
          castTime,
          timezone,
          dunType,
          juNumber,
          bureauType,
          method,
          clientId,
          null, // operator
          null, // question
          "bazi", // category: 八字排盘
          JSON.stringify(bazi_json), // pan_json: 直接保存八字排盘JSON
          null, // meta_json
          1, // schema_version
          logicKey,
          1, // status: 正常
          null, // remark
        ]
      );

      if (!result || result.length === 0) {
        throw new Error("保存失败");
      }

      const saved = result[0] as { id: number; uid: string };

      console.log(`[qimen_pan] 八字排盘结果已保存: id=${saved.id}, uid=${saved.uid}`);

      return NextResponse.json({
        success: true,
        id: saved.id,
        uid: saved.uid,
        message: "八字排盘结果已保存",
      });
    } else {
      // 奇门排盘保存逻辑（原有逻辑）
      // 验证必填字段
      if (!date || !hour || !dateInfo || !dipangan || !tianpangan) {
        return NextResponse.json(
          { error: "缺少必填字段" },
          { status: 400 }
        );
      }

      // 获取当前用户ID（可选）
      const clientId = await getCurrentUserId();

      // 构建pan_json
      const panJson = buildPanJson({
        date,
        hour,
        minute: minute || "00",
        dateInfo,
        dipangan,
        tianpangan,
        dibashen: dibashen || {},
        tianbashen: tianbashen || {},
        jiuxing: jiuxing || {},
        bamen: bamen || {},
        kongwang: kongwang || {},
        yima: yima || {},
        jigong: jigong || {},
        zhiShiDoor: zhiShiDoor || "",
        zhiFuPalace: zhiFuPalace || null,
      });

      // 计算逻辑盘key（使用四柱）
      const fourPillars = dateInfo.fourPillars;
      const logicKey = `${fourPillars.year} ${fourPillars.month} ${fourPillars.day} ${fourPillars.hour}`;

      // 构建cast_time（起局时间）
      const castTime = new Date(`${date}T${hour.padStart(2, "0")}:${minute || "00"}:00`);

      // 数据库插入所需的其他字段
      const timezone = "Asia/Shanghai";
      const dunType = dateInfo.dunType === "阳遁" ? 1 : 2;
      const juNumber = dateInfo.ju;
      const bureauType = "san_yuan"; // 默认三元
      const method = "zirun_v1"; // 默认自润算法v1

      // 插入数据库
      const result = await query(
        `INSERT INTO qimen_pan (
          cast_time, timezone, dun_type, ju_number, bureau_type, method,
          client_id, operator, question, category,
          pan_json, meta_json, schema_version, logic_key, status, remark
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)
        RETURNING id, uid`,
        [
          castTime,
          timezone,
          dunType,
          juNumber,
          bureauType,
          method,
          clientId,
          null, // operator
          null, // question
          "qimendunjia", // category
          JSON.stringify(panJson),
          null, // meta_json
          1, // schema_version
          logicKey,
          1, // status: 正常
          null, // remark
        ]
      );

      if (!result || result.length === 0) {
        throw new Error("保存失败");
      }

      const saved = result[0] as { id: number; uid: string };

      console.log(`[qimen_pan] 排盘结果已保存: id=${saved.id}, uid=${saved.uid}`);

      return NextResponse.json({
        success: true,
        id: saved.id,
        uid: saved.uid,
        message: "排盘结果已保存",
      });
    }
  } catch (error: any) {
    console.error("[qimen_pan] 保存排盘结果失败:", error);
    return NextResponse.json(
      { error: error.message || "保存排盘结果失败" },
      { status: 500 }
    );
  }
}

/**
 * GET /api/qimen_pan
 * 根据 pan_id 或 pan_uid 获取排盘数据
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const panId = searchParams.get("pan_id");
    const panUid = searchParams.get("pan_uid");

    if (!panId && !panUid) {
      return NextResponse.json(
        { error: "pan_id 或 pan_uid 为必填项" },
        { status: 400 }
      );
    }

    let querySql = "";
    let params: any[] = [];

    if (panId) {
      querySql = `SELECT id, uid, pan_json FROM qimen_pan WHERE id = $1 LIMIT 1`;
      params = [parseInt(panId, 10)];
    } else if (panUid) {
      querySql = `SELECT id, uid, pan_json FROM qimen_pan WHERE uid = $1 LIMIT 1`;
      params = [panUid];
    }

    const result = await query(querySql, params);

    if (!result || result.length === 0) {
      return NextResponse.json(
        { error: "排盘数据不存在" },
        { status: 404 }
      );
    }

    const panData = result[0] as { id: number; uid: string; pan_json: any };
    
    // 解析 pan_json（如果是字符串）
    let panJson = panData.pan_json;
    if (typeof panJson === "string") {
      try {
        panJson = JSON.parse(panJson);
      } catch (e) {
        return NextResponse.json(
          { error: "pan_json 解析失败" },
          { status: 500 }
        );
      }
    }

    return NextResponse.json({
      success: true,
      id: panData.id,
      uid: panData.uid,
      pan_json: panJson,
    });
  } catch (error: any) {
    console.error("[qimen_pan] 获取排盘数据失败:", error);
    return NextResponse.json(
      { error: error.message || "获取排盘数据失败" },
      { status: 500 }
    );
  }
}

