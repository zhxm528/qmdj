import { NextRequest, NextResponse } from "next/server";
import { deepseekConfig } from "@/lib/config";
import { readFileSync } from "fs";
import { join } from "path";

interface PromptWenshiRequest {
  text: string;
}

interface PromptWenshiResponse {
  category_code: string;
  subcategory_code: string | null;
  reason: string;
  short_prompt_zh: string;
  extra: {
    who: string;
    time_scope: string;
    key_objects: string;
  };
}

export async function POST(request: NextRequest) {
  try {
    const body: PromptWenshiRequest = await request.json();
    const { text } = body;

    if (!text || typeof text !== "string" || text.trim().length === 0) {
      return NextResponse.json(
        {
          success: false,
          error: "请输入有效的文本内容",
        },
        { status: 400 }
      );
    }

    // 打印转换前的文本
    console.log("=== 问事提炼 API 请求开始 ===");
    console.log("转换前的文本:", text);
    console.log("文本长度:", text.length);

    // 读取提示词模板
    const templatePath = join(process.cwd(), "md", "prompt", "问事提炼.md");
    let systemPrompt: string;
    
    try {
      systemPrompt = readFileSync(templatePath, "utf-8");
      // 移除 Markdown 标题，只保留内容
      systemPrompt = systemPrompt.replace(/^#.*\n\n/, "");
    } catch (error) {
      console.error("读取提示词模板失败:", error);
      return NextResponse.json(
        {
          success: false,
          error: "无法读取提示词模板文件",
        },
        { status: 500 }
      );
    }

    // 构建用户提示词
    const userPrompt = `请分析以下用户输入文本：\n\n${text}`;

    console.log("=== 调用 DeepSeek API ===");
    console.log("baseURL:", deepseekConfig.baseURL);
    console.log("模型:", deepseekConfig.model);

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
    const rawResult = data.choices?.[0]?.message?.content || "";

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

    // 尝试解析 JSON 结果
    let jsonResult: PromptWenshiResponse;
    try {
      // 尝试提取 JSON（可能包含 markdown 代码块或其他文本）
      let jsonString = rawResult.trim();
      
      // 如果包含 markdown 代码块，提取其中的 JSON
      const jsonMatch = jsonString.match(/```(?:json)?\s*(\{[\s\S]*\})\s*```/);
      if (jsonMatch) {
        jsonString = jsonMatch[1];
      } else {
        // 尝试直接提取第一个 JSON 对象
        const firstBrace = jsonString.indexOf("{");
        const lastBrace = jsonString.lastIndexOf("}");
        if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
          jsonString = jsonString.substring(firstBrace, lastBrace + 1);
        }
      }

      jsonResult = JSON.parse(jsonString);
    } catch (parseError) {
      console.error("=== JSON 解析失败 ===");
      console.error("原始响应:", rawResult);
      console.error("解析错误:", parseError);
      throw new Error(`无法解析 AI 返回的 JSON: ${parseError}`);
    }

    // 打印转换后的 JSON 格式提示词
    console.log("=== 转换后的 JSON 格式提示词 ===");
    console.log(JSON.stringify(jsonResult, null, 2));
    console.log("====================\n");

    return NextResponse.json({
      success: true,
      data: jsonResult,
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error("=== 问事提炼 API 调用失败 ===");
    console.error("错误类型:", error?.name || "Unknown");
    console.error("错误消息:", error?.message || "Unknown error");
    console.error("完整错误:", error);
    console.error("====================\n");

    return NextResponse.json(
      {
        success: false,
        error: error?.message || "问事提炼失败，请重试",
      },
      { status: 500 }
    );
  }
}

