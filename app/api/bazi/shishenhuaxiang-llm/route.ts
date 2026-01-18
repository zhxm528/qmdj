/**
 * 十神画像 LLM 生成 API
 * 规范见：md/bazi/deepseek_llm_shishenhuaxiang.md
 */

import { NextRequest, NextResponse } from "next/server";
import { deepseekConfig } from "@/lib/config";
import { extractMarkdownFromLLMResponse } from "@/lib/llmMarkdown";
import { PromptService } from "@/app/api/prompt_context/route";
import { Step9Result } from "../step9";

interface ShishenhuaxiangLLMRequest {
  step9Result: Step9Result;
}

interface ShishenhuaxiangLLMResponse {
  success: boolean;
  text?: string;
  error?: string;
}

export async function POST(request: NextRequest): Promise<NextResponse<ShishenhuaxiangLLMResponse>> {
  try {
    const body = (await request.json()) as ShishenhuaxiangLLMRequest;
    const { step9Result } = body;

    if (!step9Result) {
      return NextResponse.json(
        { success: false, error: "缺少 step9Result 参数" },
        { status: 400 }
      );
    }

    // 构建 API URL
    const apiUrl = `${deepseekConfig.baseURL}/v1/chat/completions`;
    const headers = {
      "Content-Type": "application/json",
      Authorization: `Bearer ${deepseekConfig.apiKey}`,
    };

    // 通过 PromptService 获取 system messages
    const envCode = (process.env.ENV as "dev" | "staging" | "prod") || "dev";
    const service = new PromptService();
    const flowMessages = await service.renderFlowToMessages({
      envCode,
      projectCode: "bazi",
      flow: "flow.bazi.kanpan.shishenhuaxiang",
      variables: {},
    });
    const systemMessages = flowMessages.filter((message) => message.role === "system");

    // 构建 user message
    const userMessage =
      '以下是"十神画像"板块 JSON，请生成描述：\n' +
      JSON.stringify(step9Result, null, 2);

    // 构建请求体
    const requestBody = {
      model: deepseekConfig.model || "deepseek-chat",
      messages: [
        ...systemMessages,
        { role: "user" as const, content: userMessage },
      ],
      temperature: 0.4,
      max_tokens: 200,
    };

    // 打印调用日志
    console.log("\n[bazi][shishenhuaxiang-llm] DeepSeek API 调用入参:");
    console.log("URL:", apiUrl);
    console.log("Body:", JSON.stringify(requestBody, null, 2));

    // 调用 DeepSeek API
    const response = await fetch(apiUrl, {
      method: "POST",
      headers,
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(
        "[bazi][shishenhuaxiang-llm] DeepSeek API 调用失败:",
        response.status,
        errorText
      );
      return NextResponse.json(
        {
          success: false,
          error: `DeepSeek API 调用失败: ${response.status} ${errorText}`,
        },
        { status: 500 }
      );
    }

    const data = await response.json();
    console.log(
      "[bazi][shishenhuaxiang-llm] DeepSeek API 原始返回:",
      JSON.stringify(data, null, 2)
    );

    // 提取 Markdown 文本
    const text = extractMarkdownFromLLMResponse(data);
    if (!text) {
      return NextResponse.json(
        {
          success: false,
          error: "LLM 返回内容格式不正确",
        },
        { status: 500 }
      );
    }

    console.log("[bazi][shishenhuaxiang-llm] 生成的文本:", text);

    return NextResponse.json({
      success: true,
      text,
    });
  } catch (error: any) {
    console.error("[bazi][shishenhuaxiang-llm] 调用失败:", error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || "调用 LLM 生成描述失败",
      },
      { status: 500 }
    );
  }
}
