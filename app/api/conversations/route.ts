import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { query, transaction } from "@/lib/db";
import { deepseekConfig } from "@/lib/config";

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
    const userRows = await query<{ id: number }>(
      `SELECT id FROM users WHERE email = $1 LIMIT 1`,
      [token.toLowerCase()]
    );

    if (userRows && userRows.length > 0) {
      return userRows[0].id;
    }

    // 若未命中且token是数字，按ID查询
    if (/^\d+$/.test(token)) {
      const userRowsById = await query<{ id: number }>(
        `SELECT id FROM users WHERE id = $1 LIMIT 1`,
        [parseInt(token, 10)]
      );
      if (userRowsById && userRowsById.length > 0) {
        return userRowsById[0].id;
      }
    }

    return null;
  } catch (error) {
    console.error("[conversations] 获取用户ID失败:", error);
    return null;
  }
}

/**
 * 生成对话标题（调用DeepSeek API）
 */
async function generateConversationTitle(questionText: string): Promise<string> {
  try {
    const apiUrl = `${deepseekConfig.baseURL}/v1/chat/completions`;
    const requestHeaders = {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${deepseekConfig.apiKey}`,
    };

    const messages = [
      {
        role: "system" as const,
        content: "你是一个标题生成助手。请根据用户的问题，生成一个简短、清晰的标题（10字以内）。只返回标题文本，不要包含任何解释或标点符号。",
      },
      {
        role: "user" as const,
        content: `请为以下问题生成一个简短标题：\n\n${questionText}`,
      },
    ];

    const requestBody = {
      model: deepseekConfig.model,
      messages: messages,
      temperature: 0.7,
      max_tokens: 50,
    };

    const response = await fetch(apiUrl, {
      method: "POST",
      headers: requestHeaders,
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      throw new Error(`DeepSeek API 调用失败: ${response.status}`);
    }

    const data = await response.json();
    let title = data.choices?.[0]?.message?.content || questionText.slice(0, 20);

    // 清理标题：移除引号、换行等
    title = title.trim().replace(/["'`]/g, "").replace(/\n/g, "").slice(0, 20);

    return title || questionText.slice(0, 20);
  } catch (error) {
    console.error("[conversations] 生成标题失败:", error);
    // 回退：使用问题文本的前20个字符作为标题
    return questionText.slice(0, 20) || "问事";
  }
}

/**
 * POST /api/conversations
 * 保存对话和提问记录
 */
export async function POST(request: NextRequest) {
  try {
    const userId = await getCurrentUserId();
    if (!userId) {
      return NextResponse.json(
        { error: "未登录" },
        { status: 401 }
      );
    }

    const body = await request.json();
    const {
      pan_id, // 排盘结果ID（从qimen_pan表）
      pan_uid, // 排盘结果UID
      original_question, // 原始提问文本
      refined_question_json, // 提炼后的结构化问题（JSON对象）
      question_category_code, // 问题分类代码
      question_subcategory_code, // 问题子分类代码
      ai_analysis, // AI分析结果文本
      ai_analysis_metadata, // AI分析元数据（可选）
      conversation_id, // 对话ID（可选，如果提供则在该对话中添加提问，否则创建新对话）
      project_code = "qmdj", // 项目代码，默认为qmdj
    } = body;

    // 验证必填字段
    if (!pan_id && !pan_uid) {
      return NextResponse.json(
        { error: "排盘结果ID或UID为必填项" },
        { status: 400 }
      );
    }

    if (!original_question || !ai_analysis) {
      return NextResponse.json(
        { error: "原始提问和AI分析结果为必填项" },
        { status: 400 }
      );
    }

    // 使用事务执行所有操作
    const result = await transaction(async (client) => {
      let conversationId: number;
      let conversationUid: string;
      let conversationTitle: string;

      // 获取项目ID
      let projectId: string | null = null;
      if (project_code) {
        const projectRows = await client.query<{ id: string }>(
          `SELECT id FROM projects WHERE code = $1 LIMIT 1`,
          [project_code]
        );
        if (projectRows.rows && projectRows.rows.length > 0) {
          projectId = projectRows.rows[0].id;
        }
      }

      // 获取排盘结果信息（如果只提供了pan_uid）
      let finalPanId: number | null = pan_id || null;
      if (!finalPanId && pan_uid) {
        const panRows = await client.query<{ id: number }>(
          `SELECT id FROM qimen_pan WHERE uid = $1 LIMIT 1`,
          [pan_uid]
        );
        if (panRows.rows && panRows.rows.length > 0) {
          finalPanId = panRows.rows[0].id;
        }
      }

      // 判断是新建对话还是在现有对话中添加提问
      if (conversation_id) {
        // 在现有对话中添加提问
        const convRows = await client.query<{ id: number; uid: string; title: string; pan_id: number }>(
          `SELECT id, uid, title, pan_id FROM conversations 
           WHERE id = $1 AND user_id = $2 AND deleted_at IS NULL LIMIT 1`,
          [conversation_id, userId]
        );

        if (!convRows.rows || convRows.rows.length === 0) {
          throw new Error("对话不存在或无权限访问");
        }

        conversationId = convRows.rows[0].id;
        conversationUid = convRows.rows[0].uid;
        conversationTitle = convRows.rows[0].title;
      } else {
        // 创建新对话
        // 生成对话标题
        const shortQuestion = refined_question_json?.short_prompt_zh || original_question;
        conversationTitle = await generateConversationTitle(shortQuestion);

        const convResult = await client.query<{ id: number; uid: string }>(
          `INSERT INTO conversations (
            user_id,
            project_id,
            pan_id,
            pan_uid,
            title,
            status
          ) VALUES ($1, $2, $3, $4, $5, $6)
          RETURNING id, uid`,
          [
            userId,
            projectId,
            finalPanId,
            pan_uid || null,
            conversationTitle,
            1, // status = 1 正常
          ]
        );

        if (!convResult.rows || convResult.rows.length === 0) {
          throw new Error("创建对话失败");
        }

        conversationId = convResult.rows[0].id;
        conversationUid = convResult.rows[0].uid;
      }

      // 生成本次提问的标题
      const questionTitle = await generateConversationTitle(
        refined_question_json?.short_prompt_zh || original_question
      );

      // 插入提问记录
      const recordResult = await client.query<{ id: number; uid: string }>(
        `INSERT INTO agent_records (
          conversation_id,
          user_id,
          project_id,
          pan_id,
          pan_uid,
          original_question,
          refined_question_json,
          question_category_code,
          question_subcategory_code,
          question_title,
          ai_analysis,
          ai_analysis_metadata,
          ai_analysis_status,
          status
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
        RETURNING id, uid`,
        [
          conversationId,
          userId,
          projectId,
          finalPanId,
          pan_uid || null,
          original_question,
          refined_question_json ? JSON.stringify(refined_question_json) : null,
          question_category_code || null,
          question_subcategory_code || null,
          questionTitle,
          ai_analysis,
          ai_analysis_metadata ? JSON.stringify(ai_analysis_metadata) : null,
          2, // ai_analysis_status = 2 分析成功
          1, // status = 1 正常
        ]
      );

      if (!recordResult.rows || recordResult.rows.length === 0) {
        throw new Error("保存提问记录失败");
      }

      // 更新对话的更新时间
      await client.query(
        `UPDATE conversations SET updated_at = NOW() WHERE id = $1`,
        [conversationId]
      );

      return {
        success: true,
        conversation: {
          id: conversationId,
          uid: conversationUid,
          title: conversationTitle,
        },
        record: {
          id: recordResult.rows[0].id,
          uid: recordResult.rows[0].uid,
          question_title: questionTitle,
        },
      };
    });

    return NextResponse.json(result);
  } catch (error: any) {
    console.error("[conversations] 保存对话失败:", error);

    // 处理数据库唯一约束错误
    if (error.code === "23505") {
      return NextResponse.json(
        { error: "记录已存在" },
        { status: 409 }
      );
    }

    return NextResponse.json(
      {
        error: error.message || "保存对话失败，请稍后重试",
      },
      { status: 500 }
    );
  }
}

/**
 * GET /api/conversations
 * 获取用户的历史对话列表
 */
export async function GET(request: NextRequest) {
  try {
    const userId = await getCurrentUserId();
    if (!userId) {
      return NextResponse.json(
        { error: "未登录" },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const projectCode = searchParams.get("project_code") || "qmdj";
    const conversationId = searchParams.get("conversation_id");
    const page = parseInt(searchParams.get("page") || "1", 10);
    const pageSize = parseInt(searchParams.get("page_size") || "20", 10);

    // 获取项目ID
    let projectId: string | null = null;
    if (projectCode) {
      const projectRows = await query<{ id: string }>(
        `SELECT id FROM projects WHERE code = $1 LIMIT 1`,
        [projectCode]
      );
      if (projectRows.length > 0) {
        projectId = projectRows[0].id;
      }
    }

    if (conversationId) {
      // 获取特定对话的详细信息（包含所有提问记录）
      const conversationRows = await query<{
        id: number;
        uid: string;
        title: string;
        pan_id: number;
        pan_uid: string;
        created_at: string;
        updated_at: string;
      }>(
        `SELECT id, uid, title, pan_id, pan_uid, created_at, updated_at
         FROM conversations
         WHERE id = $1 AND user_id = $2 AND deleted_at IS NULL
         LIMIT 1`,
        [parseInt(conversationId, 10), userId]
      );

      if (conversationRows.length === 0) {
        return NextResponse.json(
          { error: "对话不存在或无权限访问" },
          { status: 404 }
        );
      }

      const conversation = conversationRows[0];

      // 获取该对话下的所有提问记录
      const records = await query<{
        id: number;
        uid: string;
        question_title: string;
        original_question: string;
        refined_question_json: any;
        ai_analysis: string;
        created_at: string;
      }>(
        `SELECT id, uid, question_title, original_question, 
                refined_question_json, ai_analysis, created_at
         FROM agent_records
         WHERE conversation_id = $1 AND deleted_at IS NULL
         ORDER BY created_at ASC`,
        [conversation.id]
      );

      return NextResponse.json({
        success: true,
        conversation: {
          ...conversation,
          records: records.map((r) => ({
            ...r,
            refined_question_json: r.refined_question_json
              ? (typeof r.refined_question_json === "string"
                  ? JSON.parse(r.refined_question_json)
                  : r.refined_question_json)
              : null,
          })),
        },
      });
    } else {
      // 获取对话列表
      const offset = (page - 1) * pageSize;
      let sql = `
        SELECT 
          c.id,
          c.uid,
          c.title,
          c.pan_id,
          c.pan_uid,
          c.created_at,
          c.updated_at,
          COUNT(ar.id) as question_count,
          MAX(ar.created_at) as last_question_at
        FROM conversations c
        LEFT JOIN agent_records ar ON ar.conversation_id = c.id AND ar.deleted_at IS NULL
        WHERE c.user_id = $1
          AND c.deleted_at IS NULL
      `;
      const params: any[] = [userId];

      if (projectId) {
        sql += ` AND c.project_id = $2`;
        params.push(projectId);
      }

      sql += ` GROUP BY c.id, c.uid, c.title, c.pan_id, c.pan_uid, c.created_at, c.updated_at
               ORDER BY c.updated_at DESC
               LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
      params.push(pageSize, offset);

      const conversations = await query(sql, params);

      // 获取总数
      let countSql = `SELECT COUNT(*) as total FROM conversations WHERE user_id = $1 AND deleted_at IS NULL`;
      const countParams: any[] = [userId];
      if (projectId) {
        countSql += ` AND project_id = $2`;
        countParams.push(projectId);
      }
      const countResult = await query<{ total: string }>(countSql, countParams);
      const total = parseInt(countResult[0]?.total || "0", 10);

      return NextResponse.json({
        success: true,
        conversations,
        pagination: {
          page,
          page_size: pageSize,
          total,
          total_pages: Math.ceil(total / pageSize),
        },
      });
    }
  } catch (error: any) {
    console.error("[conversations] 获取对话列表失败:", error);
    return NextResponse.json(
      {
        error: error.message || "获取对话列表失败，请稍后重试",
      },
      { status: 500 }
    );
  }
}
