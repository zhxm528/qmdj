import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { query, transaction } from "@/lib/db";
import { getFourPillars } from "@/lib/ganzhi";
import { step1, Step1Result } from "./step1";
import { step2, Step2Result } from "./step2";
import { step3, Step3Result } from "./step3";
import { step4, Step4Result } from "./step4";
import { step5, Step5Result } from "./step5";
import { step6, Step6Result } from "./step6";
import { step7, Step7Result } from "./step7";
import { step8, Step8Result } from "./step8";
import { step9, Step9Result } from "./step9";
import { step10, Step10Result } from "./step10";
import { step11, Step11Result } from "./step11";
import { step12, Step12Result } from "./step12";
import { step13, Step13Result } from "./step13";

interface BaziRequest {
  date: string;
  hour: string;
  minute: string;
}

interface BaziResponse {
  success: boolean;
  steps?: Array<{
    step: number;
    name: string;
    annotations: string;
    result: any;
    confidence: number;
  }>;
  fourPillars?: {
    year: string;
    month: string;
    day: string;
    hour: string;
  };
  error?: string;
}

/**
 * 获取当前用户email
 */
async function getCurrentUserEmail(): Promise<string | null> {
  try {
    const cookieStore = await cookies();
    const session = cookieStore.get("session");
    if (!session?.value) {
      return null;
    }

    const token = session.value.trim();
    // 尝试按邮箱查询
    const userRows = await query<{ email: string }>(
      `SELECT email FROM users WHERE email = $1 LIMIT 1`,
      [token.toLowerCase()]
    );

    if (userRows && userRows.length > 0) {
      return userRows[0].email;
    }

    // 若未命中且token是数字，按ID查询
    if (/^\d+$/.test(token)) {
      const userRowsById = await query<{ email: string }>(
        `SELECT email FROM users WHERE id = $1 LIMIT 1`,
        [parseInt(token, 10)]
      );
      if (userRowsById && userRowsById.length > 0) {
        return userRowsById[0].email;
      }
    }

    return null;
  } catch (error) {
    console.error("[bazi] 获取用户email失败:", error);
    return null;
  }
}

export async function POST(req: NextRequest): Promise<NextResponse<BaziResponse>> {
  try {
    const body = (await req.json()) as BaziRequest;
    const { date, hour, minute } = body;

    if (!date || !hour) {
      return NextResponse.json(
        { success: false, error: "请先选择日期和小时" },
        { status: 400 }
      );
    }

    // 解析日期时间
    const parts = date.split("-");
    if (parts.length !== 3) {
      return NextResponse.json(
        { success: false, error: "日期格式不正确" },
        { status: 400 }
      );
    }

    const year = parseInt(parts[0], 10);
    const month = parseInt(parts[1], 10);
    const day = parseInt(parts[2], 10);
    const hourNum = parseInt(hour, 10);
    const minuteNum = parseInt(minute || "0", 10);

    if (Number.isNaN(year) || Number.isNaN(month) || Number.isNaN(day) || Number.isNaN(hourNum)) {
      return NextResponse.json(
        { success: false, error: "日期或时间格式不正确" },
        { status: 400 }
      );
    }

    // 计算四柱
    const fourPillars = getFourPillars(year, month, day, hourNum, minuteNum);

    // 执行13个步骤
    const step1Result = step1(fourPillars);
    const dayMaster = step1Result.day_master.stem;
    const dayMasterElement = step1Result.day_master.element;

    const step2Result = step2(fourPillars, dayMaster);
    const step3Result = await step3(fourPillars, dayMasterElement);
    const step4Result = step4(fourPillars, dayMaster, dayMasterElement, step2Result, step3Result);
    const step5Result = step5(fourPillars, step3Result);
    const step6Result = step6(fourPillars, dayMaster, step2Result, step4Result);
    const step7Result = step7(step4Result, step5Result, step6Result);
    const step8Result = step8(step4Result, step6Result, step7Result, step2Result);
    const step9Result = step9(step2Result, step4Result);
    const step10Result = step10(fourPillars, step7Result);
    const step11Result = step11(step7Result);
    const step12Result = step12();
    const step13Result = step13(step4Result, step6Result, step7Result, step8Result);

    // 构建返回结果
    const steps = [
      {
        step: 1,
        name: "定命主【我】",
        annotations: "以日干为核心",
        result: step1Result,
        confidence: 0.95,
      },
      {
        step: 2,
        name: "基础盘面信息",
        annotations: "十神、藏干、合冲刑害等",
        result: step2Result,
        confidence: 0.6,
      },
      {
        step: 3,
        name: "月令与季节",
        annotations: "月支月令为第一权重",
        result: step3Result,
        confidence: 0.7,
      },
      {
        step: 4,
        name: "旺衰：日主强弱与身态",
        annotations: "得令/通根/得助/生克泄耗综合",
        result: step4Result,
        confidence: 0.45,
      },
      {
        step: 5,
        name: "寒暖燥湿与调候",
        annotations: "季节偏性与五行分布修正取用",
        result: step5Result,
        confidence: 0.35,
      },
      {
        step: 6,
        name: "格局/成局",
        annotations: "格局清纯、成局、破格与否",
        result: step6Result,
        confidence: 0.3,
      },
      {
        step: 7,
        name: "用神、喜神、忌神",
        annotations: "强弱+格局+调候+合冲影响综合定性",
        result: step7Result,
        confidence: 0.25,
      },
      {
        step: 8,
        name: "验盘：病药是否自洽",
        annotations: "用神能否解决主要矛盾、是否被合冲绑架等",
        result: step8Result,
        confidence: 0.3,
      },
      {
        step: 9,
        name: "十神解读",
        annotations: "十神强弱+位置+透藏→性格/事业/财/关系等",
        result: step9Result,
        confidence: 0.25,
      },
      {
        step: 10,
        name: "排大运【10年一运】",
        annotations: "看扶格/破格、引动喜忌、阶段主旋律",
        result: step10Result,
        confidence: 0.2,
      },
      {
        step: 11,
        name: "叠流年",
        annotations: "大运框架下看流年合冲刑害与主题触发",
        result: step11Result,
        confidence: 0.2,
      },
      {
        step: 12,
        name: "流月/流日",
        annotations: "择时/复盘用；粒度越细噪声越大",
        result: step12Result,
        confidence: 0.9,
      },
      {
        step: 13,
        name: "建议",
        annotations: "主结构、病药、节奏、策略与行动建议",
        result: step13Result,
        confidence: 0.25,
      },
    ];

    // 获取当前用户email
    const userEmail = await getCurrentUserEmail();
    if (!userEmail) {
      return NextResponse.json(
        { success: false, error: "请先登录才能排盘" },
        { status: 401 }
      );
    }

    // 构建完整的排盘数据（用于保存到数据库）
    const baziData = {
      meta: {
        spec_version: "bazi_reading_flow_v1",
        created_at_local: new Date().toISOString().replace("Z", ""),
        timezone: "Asia/Shanghai",
        method_notes: {
          month_rule: "jieqi",
          true_solar_time_corrected: false,
          school: "generic",
          confidence_scale: "0-1",
        },
      },
      input: {
        four_pillars: {
          year: {
            stem: fourPillars.year.charAt(0),
            branch: fourPillars.year.charAt(1),
          },
          month: {
            stem: fourPillars.month.charAt(0),
            branch: fourPillars.month.charAt(1),
          },
          day: {
            stem: fourPillars.day.charAt(0),
            branch: fourPillars.day.charAt(1),
          },
          hour: {
            stem: fourPillars.hour.charAt(0),
            branch: fourPillars.hour.charAt(1),
          },
        },
        optional_context: {
          date,
          hour,
          minute,
        },
      },
      steps: steps.map(s => ({
        step: s.step,
        name: s.name,
        annotations: s.annotations,
        result: s.result,
        confidence: s.confidence,
      })),
    };

    // 保存/更新排盘结果到数据库
    try {
      await saveBaziChartToDB(userEmail, fourPillars, step1Result, step2Result, baziData);
    } catch (saveError: any) {
      console.error("[bazi] 保存排盘结果失败:", saveError);
      // 保存失败不影响返回结果，只记录错误
    }

    // 构建完整的返回数据，包含四柱信息
    return NextResponse.json({
      success: true,
      fourPillars,
      steps,
    });
  } catch (error: any) {
    console.error("八字排盘失败:", error);
    return NextResponse.json(
      { success: false, error: error.message || "八字排盘失败，请重试" },
      { status: 500 }
    );
  }
}

/**
 * 保存/更新八字排盘结果到数据库
 */
async function saveBaziChartToDB(
  userEmail: string,
  fourPillars: { year: string; month: string; day: string; hour: string },
  step1Result: Step1Result,
  step2Result: Step2Result,
  baziData: any
) {
  return await transaction(async (client) => {
    // 构建四柱唯一标识（存储在meta中用于快速查询）
    const fourPillarsKey = `${fourPillars.year}-${fourPillars.month}-${fourPillars.day}-${fourPillars.hour}`;
    
    console.log("[bazi] 保存排盘结果:", { userEmail, fourPillarsKey });

    // 在meta中添加四柱标识，用于查询
    const metaWithKey = {
      ...baziData.meta,
      four_pillars_key: fourPillarsKey,
    };
    const fullBaziData = {
      ...baziData,
      meta: metaWithKey,
    };

    // 查询是否已存在该用户的该四柱组合（通过查询所有pillar匹配的chart）
    const existingChart = await client.query(
      `SELECT c.chart_id
       FROM public.bazi_chart_tbl c
       WHERE c.user_email = $1
       AND (
         SELECT COUNT(*) FROM public.bazi_pillar_tbl p
         WHERE p.chart_id = c.chart_id
         AND (
           (p.pillar = 'year' AND p.stem = $2 AND p.branch = $3) OR
           (p.pillar = 'month' AND p.stem = $4 AND p.branch = $5) OR
           (p.pillar = 'day' AND p.stem = $6 AND p.branch = $7) OR
           (p.pillar = 'hour' AND p.stem = $8 AND p.branch = $9)
         )
       ) = 4
       LIMIT 1`,
      [
        userEmail,
        fourPillars.year.charAt(0), // year_stem
        fourPillars.year.charAt(1), // year_branch
        fourPillars.month.charAt(0), // month_stem
        fourPillars.month.charAt(1), // month_branch
        fourPillars.day.charAt(0), // day_stem
        fourPillars.day.charAt(1), // day_branch
        fourPillars.hour.charAt(0), // hour_stem
        fourPillars.hour.charAt(1), // hour_branch
      ]
    );

    let chartId: string;

    if (existingChart.rows.length > 0) {
      // 已存在，更新
      chartId = existingChart.rows[0].chart_id;
      console.log("[bazi] 更新已存在的排盘结果:", chartId);
      
      await client.query(
        `UPDATE public.bazi_chart_tbl 
         SET day_master_stem = $1,
             day_master_element = $2::public.bazi_element_enum,
             day_master_yinyang = $3::public.bazi_yinyang_enum,
             meta = $4,
             updated_at = now()
         WHERE chart_id = $5`,
        [
          step1Result.day_master.stem,
          step1Result.day_master.element,
          step1Result.day_master.yin_yang,
          JSON.stringify(fullBaziData),
          chartId,
        ]
      );
    } else {
      // 不存在，创建新的
      console.log("[bazi] 创建新的排盘结果");
      
      const newChart = await client.query(
        `INSERT INTO public.bazi_chart_tbl 
         (user_email, day_master_stem, day_master_element, day_master_yinyang, meta)
         VALUES ($1, $2, $3::public.bazi_element_enum, $4::public.bazi_yinyang_enum, $5)
         RETURNING chart_id`,
        [
          userEmail,
          step1Result.day_master.stem,
          step1Result.day_master.element,
          step1Result.day_master.yin_yang,
          JSON.stringify(fullBaziData),
        ]
      );
      
      chartId = newChart.rows[0].chart_id;
      
      // 保存四柱信息
      const pillars = [
        { pillar: "year", sort_order: 1, stem: fourPillars.year.charAt(0), branch: fourPillars.year.charAt(1) },
        { pillar: "month", sort_order: 2, stem: fourPillars.month.charAt(0), branch: fourPillars.month.charAt(1) },
        { pillar: "day", sort_order: 3, stem: fourPillars.day.charAt(0), branch: fourPillars.day.charAt(1) },
        { pillar: "hour", sort_order: 4, stem: fourPillars.hour.charAt(0), branch: fourPillars.hour.charAt(1) },
      ];

      // 从step2Result获取十神信息
      const structureTable = step2Result.structure_table;
      
      // 获取地支五行映射
      const BRANCH_TO_ELEMENT: Record<string, string> = {
        寅: "木", 卯: "木", 巳: "火", 午: "火", 辰: "土", 戌: "土", 丑: "土", 未: "土",
        申: "金", 酉: "金", 子: "水", 亥: "水",
      };
      
      for (const p of pillars) {
        // 从structure_table获取十神信息（如果存在）
        let stemTenshen = "日主";
        if (structureTable?.pillars) {
          const pillarInfo = structureTable.pillars.find((pl) => pl.pillar === p.pillar);
          if (pillarInfo?.stem?.tenshen) {
            stemTenshen = pillarInfo.stem.tenshen;
          }
        }
        
        // 如果structure_table不存在，使用ten_gods
        if (!structureTable && step2Result.ten_gods) {
          if (p.pillar === "year") {
            stemTenshen = step2Result.ten_gods.year_stem || "日主";
          } else if (p.pillar === "month") {
            stemTenshen = step2Result.ten_gods.month_stem || "日主";
          } else if (p.pillar === "day") {
            stemTenshen = "日主";
          } else if (p.pillar === "hour") {
            stemTenshen = step2Result.ten_gods.hour_stem || "日主";
          }
        }
        
        const stemElement = GAN_TO_ELEMENT[p.stem] || "";
        const stemYinyang = GAN_TO_YINYANG[p.stem] || "";
        const branchElement = BRANCH_TO_ELEMENT[p.branch] || "";
        
        await client.query(
          `INSERT INTO public.bazi_pillar_tbl 
           (chart_id, pillar, sort_order, stem, stem_element, stem_yinyang, stem_tenshen, branch, branch_element)
           VALUES ($1, $2::public.bazi_pillar_enum, $3, $4, $5::public.bazi_element_enum, $6::public.bazi_yinyang_enum, $7::public.bazi_tenshen_enum, $8, $9::public.bazi_element_enum)`,
          [
            chartId,
            p.pillar,
            p.sort_order,
            p.stem,
            stemElement,
            stemYinyang,
            stemTenshen,
            p.branch,
            branchElement,
          ]
        );
      }
    }

    console.log("[bazi] 排盘结果已保存/更新:", chartId);
  });
}

// 临时使用：天干五行和阴阳映射（应该从数据库读取）
const GAN_TO_ELEMENT: Record<string, string> = {
  甲: "木", 乙: "木", 丙: "火", 丁: "火", 戊: "土",
  己: "土", 庚: "金", 辛: "金", 壬: "水", 癸: "水",
};

const GAN_TO_YINYANG: Record<string, string> = {
  甲: "阳", 乙: "阴", 丙: "阳", 丁: "阴", 戊: "阳",
  己: "阴", 庚: "阳", 辛: "阴", 壬: "阳", 癸: "阴",
};

