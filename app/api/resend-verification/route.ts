import { NextRequest, NextResponse } from "next/server";
import { findUserByEmail } from "@/lib/user";
import {
  createEmailVerification,
  invalidateOldVerifications,
  findPendingVerificationByUserId,
} from "@/lib/emailVerification";
import { sendVerificationEmail } from "@/lib/mailer";

// 限制：同一用户1小时内最多发送3次验证邮件
const MAX_RESEND_COUNT = 3;
const RESEND_WINDOW_HOURS = 1;

export async function POST(request: NextRequest) {
  try {
    const { email } = await request.json();

    if (!email) {
      return NextResponse.json(
        { error: "邮箱为必填项" },
        { status: 400 }
      );
    }

    // 查找用户
    const user = await findUserByEmail(email);
    if (!user) {
      return NextResponse.json(
        { error: "用户不存在" },
        { status: 404 }
      );
    }

    // 如果邮箱已验证，无需重新发送
    if (user.is_email_verified) {
      return NextResponse.json({
        message: "邮箱已验证，无需重新发送",
        alreadyVerified: true,
      });
    }

    // 检查最近1小时内的发送次数
    const recentVerifications = await findPendingVerificationByUserId(user.id);
    // TODO: 实现更精确的发送频率限制（需要记录发送时间）

    // 使旧的验证记录失效
    await invalidateOldVerifications(user.id);

    // 创建新的验证记录
    const verification = await createEmailVerification(
      user.id,
      user.email,
      24 // 24小时有效期
    );

    // 发送验证邮件
    try {
      await sendVerificationEmail(
        user.email,
        user.name,
        verification.token
      );
    } catch (mailError) {
      console.error("发送验证邮件失败:", mailError);
      return NextResponse.json(
        { error: "发送邮件失败，请稍后重试" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      message: "验证邮件已重新发送，请查收",
      emailSent: true,
    });
  } catch (error: any) {
    console.error("Resend verification error:", error);

    return NextResponse.json(
      { error: "操作失败，请稍后重试" },
      { status: 500 }
    );
  }
}

