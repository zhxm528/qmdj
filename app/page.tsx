"use client";

import { useState } from "react";
import Layout from "@/components/Layout";
import Button from "@/components/Button";
import NineGrid from "@/components/NineGrid";
import Toast from "@/components/Toast";
import Skeleton from "@/components/Skeleton";
import DateSelector from "@/components/DateSelector";

export default function Home() {
  const [title, setTitle] = useState("");
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);

  const handleQuery = async () => {
    // 校验必填项
    if (!date || !time) {
      setToast({ message: "请填写日期和时间", type: "error" });
      return;
    }

    setLoading(true);
    try {
      const response = await fetch("/api/qimen/query", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ subject: title || "奇门遁甲", date, time }),
      });

      if (!response.ok) {
        throw new Error("查询失败");
      }

      const data = await response.json();
      setResult(data);
      setToast({ message: "排盘成功", type: "success" });
    } catch (error) {
      console.error("Query error:", error);
      setToast({ message: "查询失败，请重试", type: "error" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Layout>
      <div className="min-h-screen bg-gradient-to-b from-amber-50 to-white py-12 px-4">
        <div className="max-w-4xl mx-auto">
          {/* 标题行 */}
          <div className="text-center mb-12">
            <h1 className="text-5xl font-bold text-gray-900 mb-2">奇门遁甲</h1>
            <p className="text-gray-600">在线排盘 · 精准预测</p>
          </div>

          {/* 输入行 */}
          <div className="bg-white rounded-lg shadow-md p-6 mb-6">
            <div className="flex gap-3 mb-4">
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="请输入问题或对象（可选）"
                className="flex-1 px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500"
              />
              <Button
                onClick={handleQuery}
                loading={loading}
                className="px-8 whitespace-nowrap"
              >
                查询
              </Button>
            </div>

            {/* 条件行 */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <DateSelector value={date} onChange={setDate} required />
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  时间
                </label>
                <input
                  type="time"
                  value={time}
                  onChange={(e) => setTime(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500"
                  required
                />
              </div>
            </div>
          </div>

          {/* 结果行 */}
          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-2xl font-bold text-gray-900 mb-6 text-center">
              排盘结果
            </h2>
            {loading ? (
              <Skeleton />
            ) : result ? (
              <NineGrid data={result} />
            ) : (
              <div className="text-center text-gray-400 py-12">
                <p>请输入日期和时间，点击查询按钮开始排盘</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}
    </Layout>
  );
}
