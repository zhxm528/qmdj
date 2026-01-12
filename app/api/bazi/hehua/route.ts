import { NextRequest, NextResponse } from "next/server";

/**
 * 合化API
 * 处理天干合化相关的请求
 */

interface HehuaResponse {
  success: boolean;
  data?: any;
  error?: string;
}

export async function GET(req: NextRequest): Promise<NextResponse<HehuaResponse>> {
    const { searchParams } = new URL(req.url);
    console.log("[hehua] input ok:", Object.fromEntries(searchParams.entries()));

    // TODO: 实现合化逻辑
    console.log("[hehua] response ok:", { success: true });
    return NextResponse.json({
      success: true,
      data: {
        message: "合化API已调用",
        timestamp: new Date().toISOString(),
      },
    });
  } catch (error: any) {
    console.error("[合化API] GET请求错误:", error);
    console.error("[合化API] 错误堆栈:", error.stack);
    return NextResponse.json(
      {
        success: false,
        error: error.message || "处理合化请求失败",
      },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest): Promise<NextResponse<HehuaResponse>> {
    const body = await req.json().catch(() => ({}));
    console.log("[hehua] input ok:", body);

    // TODO: 实现合化逻辑
    console.log("[hehua] response ok:", { success: true });
    return NextResponse.json({
      success: true,
      data: {
        message: "合化API已调用",
        timestamp: new Date().toISOString(),
      },
    });
  } catch (error: any) {
    console.error("[合化API] POST请求错误:", error);
    console.error("[合化API] 错误堆栈:", error.stack);
    return NextResponse.json(
      {
        success: false,
        error: error.message || "处理合化请求失败",
      },
      { status: 500 }
    );
  }
}

