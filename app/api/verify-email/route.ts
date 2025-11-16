import { NextRequest, NextResponse } from "next/server";
import {
  validateToken,
  markVerificationAsUsed,
} from "@/lib/emailVerification";
import { findUserById, markEmailAsVerified } from "@/lib/user";
import { mailConfig } from "@/lib/config";
import { query } from "@/lib/db";

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const token = searchParams.get("token");

    if (!token) {
      return NextResponse.json(
        { error: "缺少验证Token" },
        { status: 400 }
      );
    }

    // 验证 token
    const validation = await validateToken(token);

    if (!validation.valid || !validation.verification) {
      // 记录环境与时区相关信息，便于定位“链接已被使用或已失效”的原因
      try {
        const requestOrigin = request.nextUrl.origin;
        const configOrigin = new URL(mailConfig.baseUrl).origin;
        const sameOrigin = requestOrigin === configOrigin;
        const appNow = new Date();
        let dbNow: string | null = null;
        try {
          const res = await query<{ now: string }>("SELECT NOW() as now");
          dbNow = res && res.length > 0 ? res[0].now : null;
        } catch (e) {
          // 数据库不可用时忽略
        }
        const expiresAt =
          validation.verification && (validation as any).verification.expires_at
            ? new Date((validation as any).verification.expires_at as any)
            : null;
        const tzOffsetMinutes = appNow.getTimezoneOffset();
        console.log("[verify-email] 环境检查 ->", {
          baseUrl: mailConfig.baseUrl,
          requestOrigin,
          configOrigin,
          sameOrigin,
        });
        console.log("[verify-email] 时区/时间检查 ->", {
          appNow_iso: appNow.toISOString(),
          appNow_locale: appNow.toString(),
          app_tz_offset_min: tzOffsetMinutes,
          dbNow,
          expiresAt_iso: expiresAt ? expiresAt.toISOString() : null,
          expiresAt_locale: expiresAt ? expiresAt.toString() : null,
          expires_in_ms: expiresAt ? expiresAt.getTime() - appNow.getTime() : null,
        });
      } catch {
        // 忽略日志异常
      }
      // 如果验证记录存在（例如已被使用/已过期），但用户已完成验证，则返回已验证成功，保证幂等
      if (validation.verification) {
        const v = validation.verification;
        const user = await findUserById(v.user_id);
        if (user && user.is_email_verified) {
          return NextResponse.json({
            success: true,
            message: "邮箱已验证",
            alreadyVerified: true,
            user: { id: user.id, email: user.email },
          });
        }
      }
      return NextResponse.json(
        {
          error: validation.error || "链接无效或已失效",
          canResend: true,
        },
        { status: 400 }
      );
    }

    const verification = validation.verification;

    // 检查用户是否存在
    const user = await findUserById(verification.user_id);
    if (!user) {
      return NextResponse.json(
        { error: "用户不存在" },
        { status: 404 }
      );
    }

    // 检查邮箱是否匹配
    if (user.email !== verification.email) {
      return NextResponse.json(
        { error: "邮箱不匹配，验证失败" },
        { status: 400 }
      );
    }

    // 如果已经验证过，直接返回成功
    if (user.is_email_verified) {
      return NextResponse.json({
        success: true,
        message: "邮箱已验证",
        alreadyVerified: true,
      });
    }

    // 标记验证记录为已使用
    await markVerificationAsUsed(verification.id);

    // 标记用户邮箱为已验证
    await markEmailAsVerified(user.id, user.email);

    // 记录日志（可以扩展为独立的日志系统）
    console.log(`[邮箱验证] 用户 ${user.id} (${user.email}) 验证成功`);

    return NextResponse.json({
      success: true,
      message: "邮箱验证成功",
      user: {
        id: user.id,
        email: user.email,
      },
    });
  } catch (error: any) {
    console.error("Verify email error:", error);

    return NextResponse.json(
      { error: "验证失败，请稍后重试" },
      { status: 500 }
    );
  }
}

