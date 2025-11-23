import { NextRequest, NextResponse } from "next/server";
import { deepseekConfig } from "@/lib/config";
import { readFileSync } from "fs";
import { join } from "path";
import { query } from "@/lib/db";

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

interface Category {
  id: number;
  parent_id: number | null;
  level: number;
  code: string;
  name_zh: string;
  name_en: string | null;
  description: string | null;
  examples: string | null;
}

export async function POST(request: NextRequest) {
  try {
    const body: PromptWenshiRequest = await request.json();
    const { text } = body;

    // 验证输入
    if (!text || typeof text !== "string" || text.trim().length === 0) {
      return NextResponse.json(
        {
          success: false,
          error: "请输入有效的文本内容",
        },
        { status: 400 }
      );
    }

    // 读取规则文件：问事提炼.md
    const templatePath = join(process.cwd(), "md", "prompt", "问事提炼.md");
    let ruleContent: string;
    
    try {
      ruleContent = readFileSync(templatePath, "utf-8");
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

    // 从数据库查询分类数据
    let categories: Category[] = [];
    try {
      categories = await query<Category>(
        `SELECT id, parent_id, level, code, name_zh, name_en, description, examples 
         FROM qmdj_question_category 
         ORDER BY level, id`
      );
    } catch (error) {
      console.error("查询分类数据失败:", error);
      // 不阻止流程，继续执行
    }

    // 按照规则文件生成提示词（每个步骤生成一个 system message）
    const systemMessages = generateSystemMessages(ruleContent, categories);

    // 构建用户提示词
    const userPrompt = `请分析以下用户输入文本：\n\n${text}`;

    // 构建 DeepSeek API 调用参数
    const apiUrl = `${deepseekConfig.baseURL}/v1/chat/completions`;
    const requestHeaders = {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${deepseekConfig.apiKey}`,
    };
    
    // 构建 messages 数组：多个 system messages + 1个 user message
    const messages = [
      ...systemMessages,  // 每个步骤对应一个 system message
      {
        role: "user" as const,
        content: userPrompt,
      },
    ];
    
    const requestBody = {
      model: deepseekConfig.model,
      messages: messages,
      temperature: 0.7,
      max_tokens: 2000,
    };

    // 程序后台打印调用 deepseek 的 api 接口的输入参数
    console.log("\n========== DeepSeek API 调用入参 ==========");
    console.log("API URL:", apiUrl);
    console.log("请求头:", JSON.stringify(requestHeaders, null, 2));
    console.log("请求体:", JSON.stringify(requestBody, null, 2));
    console.log("==========================================\n");

    // 调用 DeepSeek API
    const response = await fetch(apiUrl, {
      method: "POST",
      headers: requestHeaders,
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("DeepSeek API 调用失败:", response.status, errorText);
      throw new Error(`DeepSeek API 调用失败: ${response.status} ${errorText}`);
    }

    const data = await response.json();
    
    // 打印 DeepSeek API 接口原始返回内容
    console.log("\n========== DeepSeek API 原始返回内容 ==========");
    console.log("完整响应数据:", JSON.stringify(data, null, 2));
    console.log("=============================================\n");
    
    const rawResult = data.choices?.[0]?.message?.content || "";
    
    // 打印提取的原始文本内容
    console.log("\n========== DeepSeek API 提取的原始文本 ==========");
    console.log(rawResult);
    console.log("===============================================\n");

    // 解析 JSON 结果（可能包含 markdown 代码块）
    let jsonResult: PromptWenshiResponse;
    try {
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

      // 程序后台打印 json 格式字符串
      console.log("\n========== 转换后的 JSON 格式提示词 ==========");
      console.log(JSON.stringify(jsonResult, null, 2));
      console.log("==============================================\n");

      return NextResponse.json({
        success: true,
        data: jsonResult,
        timestamp: new Date().toISOString(),
      });
    } catch (parseError) {
      console.error("JSON 解析失败:", parseError);
      console.error("原始响应:", rawResult);
      throw new Error(`无法解析 AI 返回的 JSON: ${parseError}`);
    }
  } catch (error: any) {
    console.error("问事提炼 API 调用失败:", error);
    return NextResponse.json(
      {
        success: false,
        error: error?.message || "问事提炼失败，请重试",
      },
      { status: 500 }
    );
  }
}

/**
 * 根据规则文件和分类数据生成系统提示词 messages 数组
 * 每个步骤对应一个 system message
 */
function generateSystemMessages(
  ruleContent: string,
  categories: Category[]
): Array<{ role: "system"; content: string }> {
  const messages: Array<{ role: "system"; content: string }> = [];

  // 第1步：生成角色提示词
  messages.push({
    role: "system",
    content: '你现在的角色是一个"奇门遁甲问事分类与提炼助手"',
  });

  // 第2步：生成分类信息
  let step2Content = "用户问题归类一级分类：";
  const level1Categories = categories.filter(c => c.level === 1);
  const level2Categories = categories.filter(c => c.level === 2);
  
  if (level1Categories.length > 0) {
    const level1List = level1Categories.map(cat => `${cat.code}：${cat.name_zh}`).join("、");
    step2Content += level1List;
  }
  
  step2Content += "\n用户问题归类二级分类：";
  
  if (level2Categories.length > 0) {
    const level2List = level2Categories.map(child => {
      const parent = level1Categories.find(p => p.id === child.parent_id);
      return `${child.code}：${child.name_zh}`;
    }).join("、");
    step2Content += level2List;
  }

  messages.push({
    role: "system",
    content: step2Content,
  });

  // 第3步：生成提炼要求提示词
  const step3Content = `再把用户真正要问的问题，提炼成一两句尽量简练、明确、适合用来起奇门盘的标准问句，用中文输出。如果你能从语义中判断出具体的二级细分，就选最贴近的一项；如果拿不准二级，就选择尽量接近的一级类目，并把二级留空或用 "unknown"。

提炼问句的要求：用第一人称"我"来写，除非原文明确是替别人问；时间可以模糊，比如"未来三个月"、"今年内"、"近期"；不要带太多背景故事，只要留下对奇门起盘有用的信息；语气简洁自然，可以直接拿来当占卦问题。`;

  messages.push({
    role: "system",
    content: step3Content,
  });

  // 第4步：定义输出格式
  messages.push({
    role: "system",
    content: `定义返回的文本输出格式：请严格输出以下 JSON，对字段名保持一致，不要多加说明文字：

{
  "category_code": "一级类目的 code，如 career_academic",
  "subcategory_code": "二级细分的 code，如 career_academic_job_change；如果不确定，用 null",
  "reason": "你为什么这样分类的简短说明（1-3句）",
  "short_prompt_zh": "提炼后的最简练中文问句，适合作为下一次问奇门盘的问题",
  "extra": {
    "who": "问题主要是为谁而问，如：本人、配偶、子女、朋友；若不明则写 '本人'",
    "time_scope": "你从原文中推断出的时间范围，如：未来三个月、今年内、近期、不明确",
    "key_objects": "涉及的关键人物或事物简要列出，例如：A公司offer、某项目名称等"
  }
}`,
  });

  // 第5步：注意事项
  messages.push({
    role: "system",
    content: `请注意：一定要先理解原文本真实想解决的"事"，不是原文的所有抱怨和背景。不要输出任何解释性文字，只输出 JSON。如果内容完全无法归类，就用："category_code": "unknown"、"subcategory_code": null，并在 reason 里说明原因。`,
  });

  return messages;
}
