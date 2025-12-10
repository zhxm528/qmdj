import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  return NextResponse.json({
    success: true,
    message: "会员管理 / 会员充值 API 占位实现，请根据业务需求补充逻辑。",
  });
}


