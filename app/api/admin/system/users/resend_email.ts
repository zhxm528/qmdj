import { NextRequest, NextResponse } from "next/server";
import { findUserById } from "@/lib/user";
import { createEmailVerification, invalidateOldVerifications } from "@/lib/emailVerification";
import { sendVerificationEmail } from "@/lib/mailer";

/**
 * 重发注册验证邮件
 * 按照注册时的规则重发邮件，只发送邮件，不做其他操作
 */
export async function resendVerificationEmail(userId: number): Promise<{
  success: boolean;
  message?: string;
  error?: string;
}> {
  try {
    // 查找用户
    const user = await findUserById(userId);
    if (!user) {
      return {
        success: false,
        error: "用户不存在",
      };
    }

    if (!user.email) {
      return {
        success: false,
        error: "用户邮箱不存在",
      };
    }

    // 使旧的验证记录失效（如果存在）
    await invalidateOldVerifications(user.id);

    // 创建新的邮箱验证记录（默认 24 小时有效）
    const verification = await createEmailVerification(
      user.id,
      user.email,
      24 // 24小时有效期
    );

    // 发送验证邮件
    try {
      await sendVerificationEmail(user.email, user.name, verification.token);
      return {
        success: true,
        message: "验证邮件已重新发送",
      };
    } catch (mailError: any) {
      console.error("重发验证邮件失败:", mailError);
      return {
        success: false,
        error: mailError.message || "发送邮件失败",
      };
    }
  } catch (error: any) {
    console.error("重发验证邮件错误:", error);
    return {
      success: false,
      error: error.message || "重发验证邮件失败",
    };
  }
}
