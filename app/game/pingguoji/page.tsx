"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Layout from "@/components/Layout";
import { Button, ConfigProvider } from "antd";
import zhCN from "antd/locale/zh_CN";

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

// 符号显示名称
const SYMBOL_NAMES: Record<SymbolType, string> = {
  "🍎": "苹果",
  "🍊": "橙子",
  "🍉": "西瓜",
  "🍇": "葡萄",
  "🔔": "铃铛",
  "⭐": "星星",
  "7": "7",
  "BAR": "BAR",
};

// 3×3 盘面类型
type ReelGrid = SymbolType[][];

interface SpinResult {
  grid: ReelGrid;
  winLines: Array<{
    line: number;
    symbols: SymbolType[];
    payout: number;
  }>;
  totalWin: number;
  newBalance: number;
  betAmount: number;
}

export default function PingguojiPage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [balance, setBalance] = useState<number>(0);
  const [loading, setLoading] = useState(true);
  const [spinning, setSpinning] = useState(false);
  
  // 游戏参数
  const [betPerLine, setBetPerLine] = useState<number>(1);
  const [lines, setLines] = useState<number>(9);
  const [grid, setGrid] = useState<ReelGrid>([
    [SYMBOLS.APPLE, SYMBOLS.APPLE, SYMBOLS.APPLE],
    [SYMBOLS.ORANGE, SYMBOLS.ORANGE, SYMBOLS.ORANGE],
    [SYMBOLS.WATERMELON, SYMBOLS.WATERMELON, SYMBOLS.WATERMELON],
  ]);
  const [lastResult, setLastResult] = useState<SpinResult | null>(null);
  const [winningLines, setWinningLines] = useState<number[]>([]);

  // 获取用户信息和余额
  useEffect(() => {
    const fetchUser = async () => {
      try {
        const response = await fetch("/api/user/me");
        if (response.ok) {
          const userData = await response.json();
          setUser(userData);
          // 从用户数据获取余额（如果数据库有coins字段）
          // 暂时使用默认值1000
          setBalance(userData.coins || 1000);
        } else {
          // 未登录，跳转到登录页
          router.push("/login");
        }
      } catch (error) {
        console.error("获取用户信息失败:", error);
        router.push("/login");
      } finally {
        setLoading(false);
      }
    };

    fetchUser();
  }, [router]);

  // 处理Spin
  const handleSpin = async () => {
    if (spinning) return;
    
    const totalBet = betPerLine * lines;
    if (balance < totalBet) {
      alert("余额不足！");
      return;
    }

    setSpinning(true);
    setWinningLines([]);
    setLastResult(null);

    try {
      const response = await fetch("/api/game/pingguoji", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          betPerLine,
          lines,
        }),
      });

      if (!response.ok) {
        const error = await response.json().catch(() => ({}));
        throw new Error(error.error || "游戏失败");
      }

      const result: SpinResult = await response.json();
      
      // 播放转轴动画（简化版：直接显示结果）
      setTimeout(() => {
        setGrid(result.grid);
        setBalance(result.newBalance);
        setLastResult(result);
        if (result.winLines.length > 0) {
          setWinningLines(result.winLines.map((w) => w.line));
        }
        setSpinning(false);
      }, 1000); // 模拟1秒动画
    } catch (error: any) {
      console.error("Spin失败:", error);
      alert(error.message || "游戏失败，请重试");
      setSpinning(false);
    }
  };

  if (loading) {
    return (
      <Layout>
        <div className="min-h-screen bg-gradient-to-b from-amber-50 to-white py-12 px-4 flex items-center justify-center">
          <div className="text-gray-600">加载中...</div>
        </div>
      </Layout>
    );
  }

  return (
    <ConfigProvider locale={zhCN}>
      <Layout>
        <div className="min-h-screen bg-gradient-to-b from-amber-50 to-white py-12 px-4">
          <div className="max-w-4xl mx-auto">
            {/* 标题和余额 */}
            <div className="text-center mb-6">
              <h1 className="text-4xl font-bold text-gray-900 mb-4">苹果机游戏</h1>
              <div className="bg-white rounded-lg shadow-md p-4 inline-block">
                <div className="text-sm text-gray-600 mb-1">当前余额</div>
                <div className="text-3xl font-bold text-amber-600">{balance.toLocaleString()}</div>
              </div>
            </div>

            {/* 公告 */}
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 mb-6 text-center text-sm text-yellow-800">
              ⚠️ 本游戏仅供娱乐，禁止用于赌博
            </div>

            {/* 游戏盘面 */}
            <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
              <div className="grid grid-cols-3 gap-4 mb-6">
                {grid.map((row, rowIndex) =>
                  row.map((symbol, colIndex) => {
                    // 检查当前格子是否在中奖线上
                    const isWinning = lastResult?.winLines.some((win) => {
                      // 简化版：检查符号是否匹配中奖线的符号
                      return win.symbols.includes(symbol);
                    }) || false;
                    return (
                      <div
                        key={`${rowIndex}-${colIndex}`}
                        className={`aspect-square bg-gradient-to-br from-gray-50 to-gray-100 rounded-lg border-2 flex items-center justify-center text-6xl transition-all ${
                          isWinning
                            ? "border-yellow-400 bg-yellow-50 shadow-lg scale-105"
                            : "border-gray-200"
                        } ${spinning ? "animate-pulse" : ""}`}
                      >
                        {symbol}
                      </div>
                    );
                  })
                )}
              </div>
            </div>

            {/* 下注控制区 */}
            <div className="bg-white rounded-lg shadow-md p-6 mb-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* 单线下注额 */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    单线下注额
                  </label>
                  <div className="flex gap-2">
                    {[1, 5, 10].map((bet) => (
                      <button
                        key={bet}
                        onClick={() => setBetPerLine(bet)}
                        className={`flex-1 px-4 py-2 rounded-lg border-2 transition-colors ${
                          betPerLine === bet
                            ? "bg-amber-600 text-white border-amber-600"
                            : "bg-white text-gray-700 border-gray-300 hover:border-amber-500"
                        }`}
                      >
                        {bet}
                      </button>
                    ))}
                  </div>
                </div>

                {/* 线数选择 */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    线数
                  </label>
                  <div className="flex gap-2">
                    {[1, 5, 9].map((line) => (
                      <button
                        key={line}
                        onClick={() => setLines(line)}
                        className={`flex-1 px-4 py-2 rounded-lg border-2 transition-colors ${
                          lines === line
                            ? "bg-amber-600 text-white border-amber-600"
                            : "bg-white text-gray-700 border-gray-300 hover:border-amber-500"
                        }`}
                      >
                        {line}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* 总下注额 */}
              <div className="mt-4 pt-4 border-t border-gray-200">
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">总下注额：</span>
                  <span className="text-xl font-bold text-gray-900">
                    {betPerLine * lines}
                  </span>
                </div>
              </div>
            </div>

            {/* Spin按钮 */}
            <div className="text-center mb-6">
              <Button
                type="primary"
                size="large"
                onClick={handleSpin}
                disabled={spinning || balance < betPerLine * lines}
                loading={spinning}
                className="bg-amber-600 hover:bg-amber-700 px-12 py-6 text-lg h-auto"
              >
                {spinning ? "转动中..." : "开始游戏"}
              </Button>
            </div>

            {/* 结果显示 */}
            {lastResult && (
              <div className="bg-white rounded-lg shadow-md p-6">
                <h3 className="text-lg font-bold text-gray-900 mb-4">本局结果</h3>
                {lastResult.totalWin > 0 ? (
                  <div className="text-center">
                    <div className="text-3xl font-bold text-green-600 mb-2">
                      恭喜！赢得 {lastResult.totalWin} 金币
                    </div>
                    {lastResult.winLines.length > 0 && (
                      <div className="mt-4 text-sm text-gray-600">
                        <div>中奖线：</div>
                        {lastResult.winLines.map((win, idx) => (
                          <div key={idx} className="mt-1">
                            线 {win.line + 1}: {win.symbols.join(" ")} - {win.payout} 金币
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="text-center text-gray-600">很遗憾，未中奖</div>
                )}
                <div className="mt-4 pt-4 border-t border-gray-200 text-center text-sm text-gray-500">
                  新余额：{lastResult.newBalance.toLocaleString()} 金币
                </div>
              </div>
            )}
          </div>
        </div>
      </Layout>
    </ConfigProvider>
  );
}

