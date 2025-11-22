import { NextRequest, NextResponse } from "next/server";
import { deepseekConfig } from "@/lib/config";

interface KanpanRequest {
  question?: string;
  dateInfo?: any;
  paipanResult?: any;
  dipangan?: Record<number, string>;
  tianpangan?: Record<number, string>;
  dibashen?: Record<number, string>;
  tianbashen?: Record<number, string>;
  jiuxing?: Record<number, string>;
  bamen?: Record<number, string>;
  kongwang?: Record<number, boolean>;
  yima?: Record<number, boolean>;
  jigong?: Record<number, { diGan?: string; tianGan?: string }>;
  zhiShiDoor?: string;
  zhiFuPalace?: number | null;
}

export async function POST(request: NextRequest) {
  try {
    const body: KanpanRequest = await request.json();
    const {
      question,
      dateInfo,
      paipanResult,
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
    } = body;

    // 打印输入参数
    console.log("=== AI看盘 API 请求开始 ===");
    console.log("输入参数:", JSON.stringify(body, null, 2));

    // 构建排盘信息的详细描述
    let paipanDescription = "";
    
    if (dateInfo) {
      paipanDescription += `\n日期信息：\n`;
      paipanDescription += `- 公历：${dateInfo.gregorian || ""}\n`;
      paipanDescription += `- 农历：${dateInfo.lunar || ""}\n`;
      paipanDescription += `- 时节：${dateInfo.season || ""}\n`;
      if (dateInfo.fourPillars) {
        paipanDescription += `- 四柱：${dateInfo.fourPillars.year}年 ${dateInfo.fourPillars.month}月 ${dateInfo.fourPillars.day}日 ${dateInfo.fourPillars.hour}时\n`;
      }
      paipanDescription += `- 阴阳遁：${dateInfo.dunType || ""}${dateInfo.ju || 0}局\n`;
    }

    if (dipangan) {
      paipanDescription += `\n地盘干：\n`;
      Object.entries(dipangan).forEach(([palace, gan]) => {
        paipanDescription += `- 宫${palace}：${gan}\n`;
      });
    }

    if (tianpangan) {
      paipanDescription += `\n天盘干：\n`;
      Object.entries(tianpangan).forEach(([palace, gan]) => {
        paipanDescription += `- 宫${palace}：${gan}\n`;
      });
    }

    if (dibashen) {
      paipanDescription += `\n地八神：\n`;
      Object.entries(dibashen).forEach(([palace, shen]) => {
        paipanDescription += `- 宫${palace}：${shen}\n`;
      });
    }

    if (tianbashen) {
      paipanDescription += `\n天八神：\n`;
      Object.entries(tianbashen).forEach(([palace, shen]) => {
        paipanDescription += `- 宫${palace}：${shen}\n`;
      });
    }

    if (jiuxing) {
      paipanDescription += `\n九星：\n`;
      Object.entries(jiuxing).forEach(([palace, star]) => {
        paipanDescription += `- 宫${palace}：${star}\n`;
      });
    }

    if (bamen) {
      paipanDescription += `\n八门：\n`;
      Object.entries(bamen).forEach(([palace, door]) => {
        paipanDescription += `- 宫${palace}：${door}\n`;
      });
    }

    if (kongwang) {
      const kongwangPalaces = Object.entries(kongwang)
        .filter(([_, isKongwang]) => isKongwang)
        .map(([palace]) => `宫${palace}`)
        .join("、");
      if (kongwangPalaces) {
        paipanDescription += `\n空亡：${kongwangPalaces}\n`;
      }
    }

    if (yima) {
      const yimaPalaces = Object.entries(yima)
        .filter(([_, isYima]) => isYima)
        .map(([palace]) => `宫${palace}`)
        .join("、");
      if (yimaPalaces) {
        paipanDescription += `\n驿马：${yimaPalaces}\n`;
      }
    }

    if (jigong) {
      paipanDescription += `\n寄宫：\n`;
      Object.entries(jigong).forEach(([palace, info]) => {
        if (info.diGan || info.tianGan) {
          paipanDescription += `- 宫${palace}：${info.diGan || ""}${info.tianGan ? `、${info.tianGan}` : ""}\n`;
        }
      });
    }

    if (zhiShiDoor) {
      paipanDescription += `\n值使门：${zhiShiDoor}\n`;
    }

    if (zhiFuPalace !== null && zhiFuPalace !== undefined) {
      paipanDescription += `\n值符：宫${zhiFuPalace}\n`;
    }

    // 构建提示词
    const systemPrompt = "你是一位资深的奇门遁甲大师，精通奇门遁甲的理论和实践，能够根据排盘结果提供专业、准确的预测和分析。";
    
    const userPrompt = `以下是奇门遁甲排盘结果：${paipanDescription}\n\n${question ? `问事：${question}\n\n` : ""}请根据以上排盘结果${question ? "和问事内容" : ""}，提供专业的奇门遁甲分析和预测。`;

    console.log("=== 调用 DeepSeek API ===");
    console.log("baseURL:", deepseekConfig.baseURL);
    console.log("提示词:", userPrompt);

    const startTime = Date.now();
    
    // 调用 DeepSeek API
    const response = await fetch(`${deepseekConfig.baseURL}/v1/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${deepseekConfig.apiKey}`,
      },
      body: JSON.stringify({
        model: deepseekConfig.model,
        messages: [
          {
            role: "system",
            content: systemPrompt,
          },
          {
            role: "user",
            content: userPrompt,
          },
        ],
        temperature: 0.7,
        max_tokens: 2000,
      }),
    });

    const endTime = Date.now();
    const duration = endTime - startTime;

    if (!response.ok) {
      const errorText = await response.text();
      console.error("=== DeepSeek API 调用失败 ===");
      console.error("状态码:", response.status);
      console.error("错误信息:", errorText);
      throw new Error(`DeepSeek API 调用失败: ${response.status} ${errorText}`);
    }

    const data = await response.json();

    // 打印响应日志
    console.log("=== DeepSeek API 响应 ===");
    console.log("耗时:", `${duration}ms`);
    console.log("响应ID:", data.id);
    console.log("模型:", data.model);
    if (data.usage) {
      console.log("Token 使用:", {
        总计: data.usage.total_tokens || 0,
        提示: data.usage.prompt_tokens || 0,
        完成: data.usage.completion_tokens || 0,
      });
    }

    const result = data.choices?.[0]?.message?.content || "无法生成分析结果";
    console.log("返回结果长度:", result.length);
    console.log("====================\n");

    return NextResponse.json({
      success: true,
      result,
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error("=== AI看盘 API 调用失败 ===");
    console.error("错误类型:", error?.name || "Unknown");
    console.error("错误消息:", error?.message || "Unknown error");
    console.error("完整错误:", error);
    console.error("====================\n");

    return NextResponse.json(
      {
        success: false,
        error: error?.message || "AI看盘失败，请重试",
      },
      { status: 500 }
    );
  }
}

