import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";

export async function POST(request: NextRequest) {
  try {
    const { plan } = await request.json();

    if (!plan) {
      return NextResponse.json(
        { error: "请选择订阅方案" },
        { status: 400 }
      );
    }

    const validPlans = ["monthly", "yearly"];
    if (!validPlans.includes(plan)) {
      return NextResponse.json(
        { error: "无效的订阅方案" },
        { status: 400 }
      );
    }

    const cookieStore = await cookies();
    const session = cookieStore.get("session");

    if (!session) {
      return NextResponse.json(
        { error: "请先登录" },
        { status: 401 }
      );
    }

    // TODO: 实现支付流程
    // 示例：生成订单并返回支付链接
    const order = {
      id: `order_${Date.now()}`,
      plan,
      amount: plan === "monthly" ? 19 : 199,
      currency: "CNY",
      status: "pending",
    };

    return NextResponse.json({
      order,
      paymentUrl: "/payment/redirect", // 实际应返回真实的支付链接
      message: "订单创建成功",
    });
  } catch (error) {
    console.error("Checkout error:", error);
    return NextResponse.json(
      { error: "创建订单失败" },
      { status: 500 }
    );
  }
}

