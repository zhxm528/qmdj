import { NextRequest, NextResponse } from "next/server";
import Groq from "groq-sdk";
import { groqConfig } from "@/lib/config";

const groq = new Groq({ apiKey: groqConfig.apiKey });

export async function POST(request: NextRequest) {
  try {
    const { query, date, time } = await request.json();

    console.log("=== Agent API 请求开始 ===");
    console.log("查询内容:", query);
    console.log("日期:", date || "未提供");
    console.log("时间:", time || "未提供");

    if (!groqConfig.apiKey) {
      console.log("错误: GROQ_API_KEY 未配置");
      return NextResponse.json(
        { error: "服务器未配置 GROQ_API_KEY" },
        { status: 500 }
      );
    }

    if (!query) {
      console.log("错误: 查询内容为空");
      return NextResponse.json(
        { error: "查询内容不能为空" },
        { status: 400 }
      );
    }

    // 构建提示词，包含奇门遁甲相关信息和用户查询
    const context = date && time 
      ? `根据奇门遁甲分析，日期：${date}，时间：${time}。`
      : '';
    
    const prompt = `${context}${query}。请基于奇门遁甲理论给出专业分析。`;

    // 调用Groq API - 打印请求日志
    console.log("=== 调用 Groq API ===");
    console.log("baseURL:", groqConfig.baseURL);
    console.log("模型:", groqConfig.model);
    console.log("apiKey:", groqConfig.apiKey);
    console.log("提示词:", prompt);
    console.log("参数: temperature=0.7, max_tokens=1000");
    
    const startTime = Date.now();
    const response = await groq.chat.completions.create({
      model: groqConfig.model,
      messages: [
        { 
          role: "system", 
          content: "你是一位资深的奇门遁甲大师，精通奇门遁甲的理论和实践，能够提供专业、准确的预测和分析。" 
        },
        { 
          role: "user", 
          content: prompt 
        }
      ],
      temperature: 0.7,
      max_tokens: 1000,
    });
    
    const endTime = Date.now();
    const duration = endTime - startTime;
    
    // 打印响应日志
    console.log("=== Groq API 响应 ===");
    console.log("耗时:", `${duration}ms`);
    console.log("响应ID:", response.id);
    console.log("模型:", response.model);
    console.log("Token 使用:", {
      总计: response.usage?.total_tokens || 0,
      提示: response.usage?.prompt_tokens || 0,
      完成: response.usage?.completion_tokens || 0,
    });

    const result = response.choices[0]?.message?.content || "无法生成预测结果";
    console.log("返回结果长度:", result.length);
    console.log("====================\n");

    console.log("=== 返回成功响应 ===");
    return NextResponse.json({
      query,
      prediction: result,
      date: date || null,
      time: time || null,
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error("=== Groq API 调用失败 ===");
    console.error("错误类型:", error?.name || "Unknown");
    console.error("错误状态:", error?.status || "N/A");
    console.error("错误消息:", error?.message || "Unknown error");
    console.error("完整错误:", error);
    console.error("====================\n");
    
    // 提供更详细的错误信息
    let errorMessage = "预测失败，请重试";
    if (error?.status === 403) {
      errorMessage = "API密钥无效或已过期，请检查配置";
    } else if (error?.status === 400) {
      errorMessage = "请求参数错误，模型可能不可用";
    } else if (error?.status === 429) {
      errorMessage = "API调用频率过高，请稍后再试";
    }
    
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    );
  }
}
