import { NextRequest, NextResponse } from "next/server";
import { transaction } from "@/lib/db";

/**
 * 生成会员卡号
 * 格式：M + 时间戳后8位 + 随机数4位
 */
function generateCardNo(): string {
  const timestamp = Date.now().toString().slice(-8);
  const random = Math.floor(Math.random() * 10000)
    .toString()
    .padStart(4, "0");
  return `M${timestamp}${random}`;
}

/**
 * 生成会员编码
 * 格式：MEM + 时间戳后10位
 */
function generateMemberCode(): string {
  const timestamp = Date.now().toString().slice(-10);
  return `MEM${timestamp}`;
}

interface RegisterMemberRequest {
  full_name?: string;
  mobile?: string;
  email?: string;
  gender?: string;
  birth_date?: string;
  remark?: string;
  // 可选配置
  register_bonus_points?: number; // 注册赠送积分，默认100
  register_bonus_balance?: number; // 注册赠送储值金，默认0
}

/**
 * POST /api/member/register
 * 会员注册API - 实现完整的会员初始化流程
 */
export async function POST(request: NextRequest) {
  try {
    const body: RegisterMemberRequest = await request.json();
    const {
      full_name,
      mobile,
      email,
      gender,
      birth_date,
      remark,
      register_bonus_points = 100, // 默认赠送100积分
      register_bonus_balance = 0, // 默认不赠送储值金
    } = body;

    // 验证必填项：至少需要手机号或邮箱之一
    if (!mobile && !email) {
      return NextResponse.json(
        { error: "手机号或邮箱至少填写一个" },
        { status: 400 }
      );
    }

    // 验证手机号格式（如果提供）
    if (mobile && !/^1[3-9]\d{9}$/.test(mobile)) {
      return NextResponse.json(
        { error: "手机号格式不正确" },
        { status: 400 }
      );
    }

    // 验证邮箱格式（如果提供）
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json(
        { error: "邮箱格式不正确" },
        { status: 400 }
      );
    }

    // 使用事务执行所有操作
    const result = await transaction(async (client) => {
      // 步骤1：设置初始会员等级（默认为 2）
      const initLevelId = 2;
      
      // 查询等级名称（用于返回）
      const levelResult = await client.query(
        `SELECT level_name 
         FROM membership_level 
         WHERE level_id = $1
         LIMIT 1`,
        [initLevelId]
      );
      
      const initLevelName = levelResult.rows && levelResult.rows.length > 0 
        ? levelResult.rows[0].level_name 
        : "普通会员";

      // 检查手机号或邮箱是否已存在
      if (mobile) {
        const existingMobile = await client.query(
          `SELECT member_id FROM member WHERE mobile = $1 LIMIT 1`,
          [mobile]
        );
        if (existingMobile.rows && existingMobile.rows.length > 0) {
          throw new Error("该手机号已被注册");
        }
      }

      if (email) {
        const existingEmail = await client.query(
          `SELECT member_id FROM member WHERE email = $1 LIMIT 1`,
          [email]
        );
        if (existingEmail.rows && existingEmail.rows.length > 0) {
          throw new Error("该邮箱已被注册");
        }
      }

      // 生成会员编码：如果提供了 email，使用 email 前缀；否则使用生成的方式
      let memberCode: string;
      if (email) {
        // 取 email 的前缀（@ 符号之前的部分）
        memberCode = email.split("@")[0];
      } else {
        // 如果没有 email，使用原来的生成方式
        memberCode = generateMemberCode();
      }
      
      // 确保member_code唯一，如果已存在则添加后缀
      let codeExists = await client.query(
        `SELECT member_id FROM member WHERE member_code = $1 LIMIT 1`,
        [memberCode]
      );
      let suffix = 1;
      const originalMemberCode = memberCode;
      while (codeExists.rows && codeExists.rows.length > 0) {
        memberCode = `${originalMemberCode}${suffix}`;
        suffix++;
        codeExists = await client.query(
          `SELECT member_id FROM member WHERE member_code = $1 LIMIT 1`,
          [memberCode]
        );
      }

      let cardNo = generateCardNo();
      // 确保card_no唯一
      let cardExists = await client.query(
        `SELECT card_id FROM member_card WHERE card_no = $1 LIMIT 1`,
        [cardNo]
      );
      while (cardExists.rows && cardExists.rows.length > 0) {
        cardNo = generateCardNo();
        cardExists = await client.query(
          `SELECT card_id FROM member_card WHERE card_no = $1 LIMIT 1`,
          [cardNo]
        );
      }

      // 步骤2：插入 member（会员基础信息）
      const memberResult = await client.query(
        `INSERT INTO member (
          member_code, full_name, mobile, email,
          gender, birth_date, status,
          level_id, total_points, available_points,
          remark
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
        RETURNING member_id, member_code, full_name, mobile, email, level_id, total_points, available_points`,
        [
          memberCode,
          full_name || null,
          mobile || null,
          email || null,
          gender || null,
          birth_date || null,
          1, // status = 1 正常
          initLevelId, // level_id = 2（默认）
          200, // total_points = 200（默认）
          200, // available_points = 200（默认）
          remark || null,
        ]
      );

      if (!memberResult.rows || memberResult.rows.length === 0) {
        throw new Error("创建会员记录失败");
      }

      const memberId = memberResult.rows[0].member_id;

      // 步骤3：插入 member_account（初始化余额账户）
      await client.query(
        `INSERT INTO member_account (
          member_id, balance, frozen_balance
        ) VALUES ($1, $2, $3)`,
        [memberId, 0.0, 0.0]
      );

      // 步骤4：生成并插入 member_card（会员卡）
      const cardResult = await client.query(
        `INSERT INTO member_card (
          card_no, member_id, is_primary, status, issued_at
        ) VALUES ($1, $2, $3, $4, NOW())
        RETURNING card_id, card_no`,
        [cardNo, memberId, true, 1]
      );

      if (!cardResult.rows || cardResult.rows.length === 0) {
        throw new Error("创建会员卡失败");
      }

      const cardId = cardResult.rows[0].card_id;

      // 初始积分为 200
      let newAvailablePoints = 200;
      let newBalance = 0.0;

      // 步骤5：注册赠送积分（如果配置了）
      if (register_bonus_points && register_bonus_points > 0) {
        // 更新会员积分余额
        await client.query(
          `UPDATE member
           SET
             total_points = total_points + $1,
             available_points = available_points + $1,
             updated_at = NOW()
           WHERE member_id = $2`,
          [register_bonus_points, memberId]
        );

        // 查询更新后的积分
        const pointsResult = await client.query(
          `SELECT available_points FROM member WHERE member_id = $1`,
          [memberId]
        );
        newAvailablePoints = pointsResult.rows[0]?.available_points || 0;

        // 插入积分变动明细
        await client.query(
          `INSERT INTO points_transaction (
            member_id,
            card_id,
            change_type,
            change_points,
            balance_after,
            related_type,
            related_id,
            remark
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
          [
            memberId,
            cardId,
            "EARN", // 获得积分
            register_bonus_points,
            newAvailablePoints,
            "REGISTER", // 注册赠送
            null,
            "新会员注册赠送积分",
          ]
        );
      }

      // 步骤6：注册赠送储值金（如果配置了）
      if (register_bonus_balance && register_bonus_balance > 0) {
        // 更新储值余额
        await client.query(
          `UPDATE member_account
           SET
             balance = balance + $1,
             updated_at = NOW()
           WHERE member_id = $2`,
          [register_bonus_balance, memberId]
        );

        // 查询更新后的余额
        const balanceResult = await client.query(
          `SELECT balance FROM member_account WHERE member_id = $1`,
          [memberId]
        );
        newBalance = parseFloat(balanceResult.rows[0]?.balance || "0");

        // 插入充值记录（系统赠送）
        await client.query(
          `INSERT INTO recharge_transaction (
            member_id,
            card_id,
            amount,
            bonus_points,
            payment_method,
            status,
            external_order_no,
            operator_id,
            remark
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
          [
            memberId,
            cardId,
            register_bonus_balance,
            0, // 不额外赠积分
            "SYSTEM_GIFT", // 支付方式：系统赠送
            1, // 成功
            null,
            "SYSTEM", // 操作员：系统
            "新会员注册赠送储值金",
          ]
        );
      }

      return {
        success: true,
        member: {
          member_id: memberId,
          member_code: memberResult.rows[0].member_code,
          full_name: memberResult.rows[0].full_name,
          mobile: memberResult.rows[0].mobile,
          email: memberResult.rows[0].email,
          level_id: memberResult.rows[0].level_id,
          level_name: initLevelName,
          total_points: memberResult.rows[0].total_points + (register_bonus_points || 0),
          available_points: newAvailablePoints || memberResult.rows[0].available_points,
          balance: newBalance,
        },
        card: {
          card_id: cardId,
          card_no: cardResult.rows[0].card_no,
        },
        bonus: {
          points: register_bonus_points || 0,
          balance: register_bonus_balance || 0,
        },
      };
    });

    return NextResponse.json({
      message: "会员注册成功",
      ...result,
    });
  } catch (error: any) {
    console.error("会员注册失败:", error);

    // 处理已知错误
    if (error.message.includes("已被注册")) {
      return NextResponse.json(
        { error: error.message },
        { status: 409 }
      );
    }

    if (error.message.includes("未找到会员等级")) {
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      );
    }

    // 处理数据库唯一约束错误
    if (error.code === "23505") {
      return NextResponse.json(
        { error: "会员信息已存在，请检查手机号或邮箱" },
        { status: 409 }
      );
    }

    return NextResponse.json(
      {
        error: error.message || "会员注册失败，请稍后重试",
      },
      { status: 500 }
    );
  }
}