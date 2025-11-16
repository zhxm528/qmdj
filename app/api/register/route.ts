import { NextRequest, NextResponse } from "next/server";
import { createUser, findUserByEmail } from "@/lib/user";
import { createEmailVerification, invalidateOldVerifications } from "@/lib/emailVerification";
import { sendVerificationEmail } from "@/lib/mailer";

// 使用 require 导入 bcryptjs（在 Next.js 中更可靠）
const bcrypt = require("bcryptjs");

// 验证邮箱格式
function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

export async function POST(request: NextRequest) {
  try {
    const { email, password } = await request.json();

    // 验证必填项
    if (!email || !password) {
      return NextResponse.json(
        { error: "邮箱和密码为必填项" },
        { status: 400 }
      );
    }

    // 验证邮箱格式
    if (!isValidEmail(email)) {
      return NextResponse.json(
        { error: "邮箱格式不正确" },
        { status: 400 }
      );
    }

    // 验证密码长度
    if (password.length < 6) {
      return NextResponse.json(
        { error: "密码长度至少为6位" },
        { status: 400 }
      );
    }

    // 检查邮箱是否已存在
    const normalizedEmail = email.toLowerCase().trim();
    const existingUser = await findUserByEmail(normalizedEmail);

    if (existingUser) {
      return NextResponse.json(
        { error: "该邮箱已被注册" },
        { status: 409 }
      );
    }

    // 加密密码
    const saltRounds = 10;
    const hashedPassword = bcrypt.hashSync(password, saltRounds);

    // 创建用户（状态为 pending，邮箱未验证）
    const userName = normalizedEmail.split("@")[0]; // 使用邮箱前缀作为默认用户名
    const user = await createUser(userName, normalizedEmail, hashedPassword);

    // 使旧的验证记录失效（如果存在）
    await invalidateOldVerifications(user.id);

    // 创建邮箱验证记录
    const verification = await createEmailVerification(
      user.id,
      normalizedEmail,
      24 // 24小时有效期
    );

    // 发送验证邮件
    try {
      await sendVerificationEmail(normalizedEmail, userName, verification.token);
    } catch (mailError) {
      console.error("发送验证邮件失败:", mailError);
      // 邮件发送失败不影响注册流程，但需要记录
    }

    return NextResponse.json({
      message: "注册成功，请查收邮箱完成验证",
      user: {
        id: user.id,
        email: user.email,
        createdAt: user.created_at,
      },
      emailSent: true,
    });
  } catch (error: any) {
    console.error("Register error:", error);
    
    // 处理数据库错误
    if (error.code === "42P01") {
      // 表不存在
      return NextResponse.json(
        { error: "数据库表不存在，请先创建 users 表" },
        { status: 500 }
      );
    }

    return NextResponse.json(
      { error: "注册失败，请稍后重试" },
      { status: 500 }
    );
  }
}

