import { NextResponse } from "next/server";
import { timezoneConfig } from "@/lib/config";

// GET: 获取时区配置
export async function GET() {
  try {
    return NextResponse.json({
      success: true,
      timezone: timezoneConfig.timezone,
      utcOffset: timezoneConfig.utcOffset,
    });
  } catch (error) {
    console.error("[config/timezone] 获取时区配置失败:", error);
    return NextResponse.json(
      { error: "获取时区配置失败" },
      { status: 500 }
    );
  }
}

