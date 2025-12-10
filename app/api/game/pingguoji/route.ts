import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { query } from "@/lib/db";
import crypto from "crypto";

// 符号定义
const SYMBOLS = {
  APPLE: "🍎",
  ORANGE: "🍊",
  WATERMELON: "🍉",
  GRAPE: "🍇",
  BELL: "🔔",
  STAR: "⭐",
  SEVEN: "7",
  BAR: "BAR",
} as const;

type SymbolType = typeof SYMBOLS[keyof typeof SYMBOLS];

// 符号权重配置（影响出现概率，数字越大出现概率越高）
const SYMBOL_WEIGHTS: Record<SymbolType, number> = {
  [SYMBOLS.APPLE]: 30,      // 最常见
  [SYMBOLS.ORANGE]: 25,
  [SYMBOLS.WATERMELON]: 20,
  [SYMBOLS.GRAPE]: 15,
  [SYMBOLS.BELL]: 5,        // 较稀有
  [SYMBOLS.STAR]: 3,        // 稀有
  [SYMBOLS.SEVEN]: 1,       // 非常稀有
  [SYMBOLS.BAR]: 1,         // 非常稀有
};

// 赔率表（3个连续相同符号的赔率）
const PAYTABLE: Record<SymbolType, number> = {
  [SYMBOLS.APPLE]: 2,
  [SYMBOLS.ORANGE]: 3,
  [SYMBOLS.WATERMELON]: 5,
  [SYMBOLS.GRAPE]: 6,
  [SYMBOLS.BELL]: 10,
  [SYMBOLS.STAR]: 20,
  [SYMBOLS.SEVEN]: 50,
  [SYMBOLS.BAR]: 50,
};

// 9线定义（3×3盘面）
// 每条线是一个数组，表示 [行, 列] 的位置
const LINES = [
  // 水平线（3条）
  [[0, 0], [0, 1], [0, 2]], // 上横线
  [[1, 0], [1, 1], [1, 2]], // 中横线
  [[2, 0], [2, 1], [2, 2]], // 下横线
  // 斜线（4条）
  [[0, 0], [1, 1], [2, 2]], // 左上到右下
  [[0, 2], [1, 1], [2, 0]], // 右上到左下
  [[0, 0], [1, 0], [2, 0]], // 左竖线
  [[0, 2], [1, 2], [2, 2]], // 右竖线
  // V型（2条）
  [[0, 0], [1, 1], [0, 2]], // 上V
  [[2, 0], [1, 1], [2, 2]], // 下V
];

/**
 * 获取当前用户ID
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
    console.error("[pingguoji] 获取用户ID失败:", error);
    return null;
  }
}

/**
 * 根据权重随机选择符号
 */
function randomSymbol(): SymbolType {
  // 构建权重数组
  const symbols = Object.keys(SYMBOL_WEIGHTS) as SymbolType[];
  const weights = symbols.map((s) => SYMBOL_WEIGHTS[s]);
  const totalWeight = weights.reduce((sum, w) => sum + w, 0);

  // 使用加密安全的随机数
  const random = crypto.randomInt(0, totalWeight);
  
  let cumulative = 0;
  for (let i = 0; i < symbols.length; i++) {
    cumulative += weights[i];
    if (random < cumulative) {
      return symbols[i];
    }
  }

  // 默认返回第一个（理论上不会到这里）
  return symbols[0];
}

/**
 * 生成随机盘面（3×3）
 */
function generateGrid(): SymbolType[][] {
  const grid: SymbolType[][] = [];
  for (let row = 0; row < 3; row++) {
    grid[row] = [];
    for (let col = 0; col < 3; col++) {
      grid[row][col] = randomSymbol();
    }
  }
  return grid;
}

/**
 * 检查线是否中奖（3个连续相同符号）
 */
function checkLineWin(
  grid: SymbolType[][],
  line: number[][]
): { symbols: SymbolType[]; payout: number } | null {
  const symbols = line.map(([row, col]) => grid[row][col]);
  
  // 检查是否3个相同
  if (symbols[0] === symbols[1] && symbols[1] === symbols[2]) {
    const payout = PAYTABLE[symbols[0]] || 0;
    return { symbols, payout };
  }

  return null;
}

/**
 * 计算所有中奖线
 */
function calculateWins(
  grid: SymbolType[][],
  activeLines: number
): Array<{ line: number; symbols: SymbolType[]; payout: number }> {
  const wins: Array<{ line: number; symbols: SymbolType[]; payout: number }> = [];

  for (let i = 0; i < Math.min(activeLines, LINES.length); i++) {
    const win = checkLineWin(grid, LINES[i]);
    if (win) {
      wins.push({
        line: i,
        symbols: win.symbols,
        payout: win.payout,
      });
    }
  }

  return wins;
}

/**
 * 获取用户余额
 */
async function getUserBalance(userId: number): Promise<number> {
  try {
    // 检查users表是否有coins字段，如果没有则使用默认值
    const userRows = await query<{ coins?: number }>(
      `SELECT coins FROM users WHERE id = $1 LIMIT 1`,
      [userId]
    );

    if (userRows && userRows.length > 0 && userRows[0].coins !== undefined) {
      return userRows[0].coins || 1000; // 如果没有coins字段，返回默认值
    }

    // 如果表结构中没有coins字段，返回默认值
    return 1000;
  } catch (error) {
    console.error("[pingguoji] 获取用户余额失败:", error);
    return 1000; // 默认值
  }
}

/**
 * 更新用户余额
 */
async function updateUserBalance(
  userId: number,
  newBalance: number
): Promise<boolean> {
  try {
    // 尝试更新coins字段（如果表结构中有）
    await query(
      `UPDATE users SET coins = $1, updated_at = NOW() WHERE id = $2`,
      [newBalance, userId]
    );
    return true;
  } catch (error) {
    // 如果表结构中没有coins字段，记录日志但不阻止游戏
    console.warn("[pingguoji] 更新用户余额失败（可能表结构中没有coins字段）:", error);
    return false;
  }
}

/**
 * 保存游戏记录
 */
async function saveGameRecord(
  userId: number,
  betAmount: number,
  winAmount: number,
  grid: SymbolType[][]
): Promise<void> {
  try {
    // 如果存在game_records表，保存记录
    await query(
      `INSERT INTO game_records (user_id, bet_amount, win_amount, grid_result, created_at)
       VALUES ($1, $2, $3, $4, NOW())`,
      [userId, betAmount, winAmount, JSON.stringify(grid)]
    );
  } catch (error) {
    // 如果表不存在，只记录日志
    console.warn("[pingguoji] 保存游戏记录失败（可能表不存在）:", error);
  }
}

export async function POST(request: NextRequest) {
  try {
    // 获取用户ID
    const userId = await getCurrentUserId();
    if (!userId) {
      return NextResponse.json(
        { error: "未登录" },
        { status: 401 }
      );
    }

    // 解析请求体
    const body = await request.json();
    const { betPerLine = 1, lines = 9 } = body;

    // 验证参数
    if (betPerLine < 1 || betPerLine > 100) {
      return NextResponse.json(
        { error: "单线下注额必须在1-100之间" },
        { status: 400 }
      );
    }

    if (lines < 1 || lines > 9) {
      return NextResponse.json(
        { error: "线数必须在1-9之间" },
        { status: 400 }
      );
    }

    const totalBet = betPerLine * lines;

    // 获取用户余额
    const currentBalance = await getUserBalance(userId);
    if (currentBalance < totalBet) {
      return NextResponse.json(
        { error: "余额不足" },
        { status: 400 }
      );
    }

    // 生成随机盘面
    const grid = generateGrid();

    // 计算中奖
    const winLines = calculateWins(grid, lines);
    const totalWin = winLines.reduce(
      (sum, win) => sum + win.payout * betPerLine,
      0
    );

    // 计算新余额
    const newBalance = currentBalance - totalBet + totalWin;

    // 更新用户余额
    await updateUserBalance(userId, newBalance);

    // 保存游戏记录
    await saveGameRecord(userId, totalBet, totalWin, grid);

    // 返回结果
    return NextResponse.json({
      success: true,
      grid,
      winLines,
      totalWin,
      newBalance,
      betAmount: totalBet,
    });
  } catch (error: any) {
    console.error("[pingguoji] 游戏处理失败:", error);
    return NextResponse.json(
      { error: error.message || "游戏处理失败" },
      { status: 500 }
    );
  }
}

/**
 * 获取游戏配置（赔率表、线型等）
 */
export async function GET(request: NextRequest) {
  try {
    return NextResponse.json({
      success: true,
      config: {
        paytable: PAYTABLE,
        lines: LINES.length,
        symbols: Object.keys(SYMBOLS),
        minBetPerLine: 1,
        maxBetPerLine: 100,
        maxLines: 9,
      },
    });
  } catch (error: any) {
    console.error("[pingguoji] 获取配置失败:", error);
    return NextResponse.json(
      { error: "获取配置失败" },
      { status: 500 }
    );
  }
}

