import { NextRequest, NextResponse } from "next/server";
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
  error?: string;
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
    const step3Result = step3(fourPillars);
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
        name: "补齐基础盘面信息",
        annotations: "十神、藏干、合冲刑害等",
        result: step2Result,
        confidence: 0.6,
      },
      {
        step: 3,
        name: "抓月令与季节",
        annotations: "月支月令为第一权重",
        result: step3Result,
        confidence: 0.7,
      },
      {
        step: 4,
        name: "判旺衰：日主强弱与身态",
        annotations: "得令/通根/得助/生克泄耗综合",
        result: step4Result,
        confidence: 0.45,
      },
      {
        step: 5,
        name: "看寒暖燥湿与调候",
        annotations: "季节偏性与五行分布修正取用",
        result: step5Result,
        confidence: 0.35,
      },
      {
        step: 6,
        name: "定格局/成局",
        annotations: "格局清纯、成局、破格与否",
        result: step6Result,
        confidence: 0.3,
      },
      {
        step: 7,
        name: "取用神、喜神、忌神",
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
        name: "动态：排大运【10年一运】",
        annotations: "看扶格/破格、引动喜忌、阶段主旋律",
        result: step10Result,
        confidence: 0.2,
      },
      {
        step: 11,
        name: "动态：叠流年",
        annotations: "大运框架下看流年合冲刑害与主题触发",
        result: step11Result,
        confidence: 0.2,
      },
      {
        step: 12,
        name: "需要更细再看流月/流日",
        annotations: "择时/复盘用；粒度越细噪声越大",
        result: step12Result,
        confidence: 0.9,
      },
      {
        step: 13,
        name: "输出结论与建议",
        annotations: "主结构、病药、节奏、策略与行动建议",
        result: step13Result,
        confidence: 0.25,
      },
    ];

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

