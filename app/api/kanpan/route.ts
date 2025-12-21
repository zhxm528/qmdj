import { NextRequest, NextResponse } from "next/server";
import { deepseekConfig } from "@/lib/config";
import { PromptService } from "@/app/api/prompt_context/route";

interface KanpanRequest {
  question?: string | object;
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
  systemPrompt?: string; // 可选的动态 system prompt
  sceneCode?: string; // 场景代码：'career', 'wealth', 'relationship', 'study', 'health', 'lawsuit'
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
      systemPrompt,
      sceneCode,
    } = body;

    // 打印输入参数
    console.log("=== AI看盘 API 请求开始 ===");
    console.log("输入参数:", JSON.stringify(body, null, 2));
    console.log("使用的场景代码 (sceneCode):", sceneCode || "未指定（将使用默认值 analyze_chart）");

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

    // 解析 question（可能是 JSON 字符串、对象或普通字符串）
    let questionData: any = null;
    let questionText = "";
    
    if (question) {
      if (typeof question === "object" && question !== null) {
        // 如果已经是对象，直接使用
        questionData = question;
        questionText = questionData.short_prompt_zh || JSON.stringify(question);
      } else if (typeof question === "string") {
        try {
          // 尝试解析为 JSON
          questionData = JSON.parse(question);
          // 如果解析成功，使用 short_prompt_zh 作为问事文本
          if (questionData && typeof questionData === "object") {
            questionText = questionData.short_prompt_zh || question;
          } else {
            questionText = question;
          }
        } catch (e) {
          // 如果不是 JSON，直接使用原始字符串
          questionText = question;
        }
      } else {
        questionText = String(question);
      }
    }

    // 构建系统提示词（system prompt）
    // 优先使用传入的 systemPrompt，其次从数据库获取流程，最后回退到硬编码的默认值
    const defaultSystemPrompt = `你是一位**资深的奇门遁甲大师，同时也是一位**经验丰富的心理咨询师。你精通传统奇门遁甲的理论与实战，并具备良好的同理心和沟通能力，能够在专业解盘的同时，给予问事者情绪上的支持与建设性引导。`;
    
    // 从数据库获取提示词（使用流程接口，带回退机制）
    let messages: Array<{ role: "system" | "user" | "assistant" | "tool"; content: string }> = [];
    
    if (systemPrompt) {
      // 优先使用传入的 systemPrompt，构建单个 system message
      messages = [
        {
          role: "system",
          content: systemPrompt,
        },
      ];
    } else {
      try {
        // 尝试从数据库获取提示词（使用流程接口）
        const service = new PromptService();
        const envCode = (process.env.ENV as 'dev' | 'staging' | 'prod') || 'dev';
        
        // 使用传入的 sceneCode，如果没有则使用默认值 'analyze_chart'
        const finalSceneCode = sceneCode || 'analyze_chart';
        console.log("从数据库获取提示词模板（流程模式），使用的 sceneCode:", finalSceneCode);
        
        // 构建流程代码，固定使用 'flow.qmdj.kanpan.default'
        const flowCode = 'flow.qmdj.kanpan.default';
        
        // 构建 variables 对象，包含排盘信息和问事信息
        const variables: Record<string, any> = {
          chart_json: paipanDescription,
          question: questionText || '',
        };
        
        // 如果有问事详情，添加到 variables
        if (questionData && typeof questionData === "object") {
          if (questionData.category_code) {
            variables.category_code = questionData.category_code;
          }
          if (questionData.subcategory_code) {
            variables.subcategory_code = questionData.subcategory_code;
          }
          if (questionData.reason) {
            variables.reason = questionData.reason;
          }
          if (questionData.extra) {
            variables.extra = questionData.extra;
          }
        }
        
        const flowMessages = await service.renderFlowToMessages({
          envCode,
          projectCode: 'qmdj',
          flow: flowCode,
          variables
        });
        
        if (flowMessages && flowMessages.length > 0) {
          messages = flowMessages;
        } else {
          // 如果返回空，回退到默认值
          messages = [
            {
              role: "system",
              content: defaultSystemPrompt,
            },
          ];
        }
      } catch (error) {
        // 数据库获取失败，回退到硬编码的默认提示词
        console.error('Failed to load prompt from database (flow mode), using fallback:', error);
        messages = [
          {
            role: "system",
            content: defaultSystemPrompt,
          },
        ];
      }
    }
    
    // 构建排盘结果描述（不包含问事）
    const paipanPrompt = `以下是奇门遁甲排盘结果：${paipanDescription}\n\n请根据以上排盘结果${questionText ? "和问事内容" : ""}，提供专业的奇门遁甲分析和预测。`;

    // 构建问事信息（单独作为 user message）
    let questionPrompt = "";
    if (questionText) {
      questionPrompt = `问事：${questionText}`;
      
      // 如果有解析的 JSON 数据，添加额外的结构化信息
      if (questionData && typeof questionData === "object") {
        questionPrompt += "\n\n问事详情：\n";
        if (questionData.category_code) {
          questionPrompt += `- 问题分类：${questionData.category_code}`;
          if (questionData.subcategory_code) {
            questionPrompt += ` / ${questionData.subcategory_code}`;
          }
          questionPrompt += "\n";
        }
        if (questionData.reason) {
          questionPrompt += `- 分类原因：${questionData.reason}\n`;
        }
        if (questionData.extra) {
          if (questionData.extra.who) {
            questionPrompt += `- 问事对象：${questionData.extra.who}\n`;
          }
          if (questionData.extra.time_scope) {
            questionPrompt += `- 时间范围：${questionData.extra.time_scope}\n`;
          }
          if (questionData.extra.key_objects) {
            questionPrompt += `- 关键对象：${questionData.extra.key_objects}\n`;
          }
        }
      }
    }

    // 构建 DeepSeek API 调用参数
    const apiUrl = `${deepseekConfig.baseURL}/v1/chat/completions`;
    const requestHeaders = {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${deepseekConfig.apiKey}`,
    };
    
    // 在流程 messages 基础上，添加排盘信息和问事信息
    // 添加排盘信息的 user message
    messages.push({
        role: "user",
        content: paipanPrompt,
    });
    
    // 如果有问事内容，单独作为一个 user message
    if (questionPrompt) {
      messages.push({
        role: "user",
        content: questionPrompt,
      });
    }
    
    const requestBody = {
      model: deepseekConfig.model,
      messages: messages,
      temperature: 0.7,
      max_tokens: 2000,
    };

    // 在后台日志中打印调用 DeepSeek API 的入参
    console.log("\n========== DeepSeek API 调用入参 ==========");
    console.log("API URL:", apiUrl);
    console.log("请求头:", JSON.stringify(requestHeaders, null, 2));
    console.log("请求体:", JSON.stringify(requestBody, null, 2));
    console.log("==========================================\n");

    // 暂时不调用 DeepSeek API，保留代码以便后续启用
    // 注意：如需启用，请将下面的条件改为 true
    const ENABLE_DEEPSEEK_API = true;
    
    if (ENABLE_DEEPSEEK_API) {
      const startTime = Date.now();
      
      // 调用 DeepSeek API
      const response = await fetch(apiUrl, {
        method: "POST",
        headers: requestHeaders,
        body: JSON.stringify(requestBody),
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

      // 打印 DeepSeek API 原始返回内容
      console.log("\n========== DeepSeek API 原始返回内容 ==========");
      console.log("完整响应数据:", JSON.stringify(data, null, 2));
      console.log("=============================================\n");

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

      let result = data.choices?.[0]?.message?.content || "无法生成分析结果";
      
      // 打印提取的原始看盘结果
      console.log("\n========== DeepSeek API 提取的原始看盘结果 ==========");
      console.log(result);
      console.log("返回结果长度:", result.length);
      console.log("===============================================\n");

      // 将 Markdown 格式转换为自然阅读文本格式
      result = convertMarkdownToText(result);

      // 打印转换后的看盘结果
      console.log("\n========== 转换后的看盘结果（纯文本格式）==========");
      console.log(result);
      console.log("===============================================\n");

      return NextResponse.json({
        success: true,
        result,
        timestamp: new Date().toISOString(),
      });
    } else {
      // 暂时不调用 API，返回提示信息
      console.log("注意：DeepSeek API 调用已禁用，当前不执行实际调用");
      return NextResponse.json(
        {
          success: false,
          error: "DeepSeek API 调用已暂时禁用，请稍后再试",
        },
        { status: 503 }
      );
    }
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

/**
 * 将 Markdown 格式转换为自然阅读文本格式
 */
function convertMarkdownToText(markdown: string): string {
  let text = markdown;

  // 1. 移除代码块（```code```），保留内容
  text = text.replace(/```[\w]*\n?([\s\S]*?)```/g, "$1");

  // 2. 移除行内代码标记（`code`），保留内容
  text = text.replace(/`([^`\n]+)`/g, "$1");

  // 3. 转换标题（# ## ### 等）为普通文本，保留标题内容
  text = text.replace(/^#{1,6}\s+(.+)$/gm, "$1");

  // 4. 转换粗体（**text** 或 __text__）为普通文本
  // 先处理双星号，避免与单星号冲突
  text = text.replace(/\*\*([^*]+)\*\*/g, "$1");
  text = text.replace(/__([^_]+)__/g, "$1");

  // 5. 转换斜体（*text* 或 _text_）为普通文本
  // 先处理已经被粗体处理过的，避免重复处理
  // 只处理单星号或单下划线，且前后有空格或标点的
  text = text.replace(/\s\*([^*\n]+)\*\s/g, " $1 ");
  text = text.replace(/\s_([^_\n]+)_\s/g, " $1 ");
  // 处理行首或行尾的斜体
  text = text.replace(/^\*([^*\n]+)\*/gm, "$1");
  text = text.replace(/^_([^_\n]+)_/gm, "$1");

  // 6. 转换链接（[text](url)）为普通文本，只保留链接文本
  text = text.replace(/\[([^\]]+)\]\([^\)]+\)/g, "$1");

  // 7. 转换引用（> text）为普通文本，添加缩进
  text = text.replace(/^>\s+(.+)$/gm, "  $1");

  // 8. 转换无序列表（- item 或 * item 或 + item）为普通文本，添加项目符号
  text = text.replace(/^[\-\*\+]\s+(.+)$/gm, "  • $1");

  // 9. 转换有序列表（1. item）为普通文本，添加缩进
  text = text.replace(/^\d+\.\s+(.+)$/gm, "  $1");

  // 10. 移除分割线（--- 或 *** 或 ___）
  text = text.replace(/^[\-\*_]{3,}$/gm, "");

  // 11. 移除多余的空白行（超过两个连续换行）
  text = text.replace(/\n{3,}/g, "\n\n");

  // 12. 清理每行的首尾空白，但保留必要的缩进
  const lines = text.split("\n");
  text = lines.map(line => {
    // 如果行以空格开头（可能是列表缩进），保留前两个空格
    const trimmed = line.trim();
    if (trimmed && line.startsWith("  ")) {
      return "  " + trimmed;
    }
    return trimmed;
  }).join("\n");

  return text.trim();
}

