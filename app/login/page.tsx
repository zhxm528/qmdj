"use client";

import { useState } from "react";
import { ConfigProvider, Modal } from "antd";
import zhCN from "antd/locale/zh_CN";
import Layout from "@/components/Layout";
import Button from "@/components/Button";
import { useRouter } from "next/navigation";

export default function Login() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      if (response.ok) {
        router.push("/");
      } else {
        const errorData = await response.json().catch(() => ({}));
        Modal.error({
          title: "登录失败",
          content: errorData.error || "请检查邮箱和密码",
        });
      }
    } catch (error) {
      console.error("Login error:", error);
      Modal.error({
        title: "登录失败",
        content: "登录时发生错误，请重试",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <ConfigProvider locale={zhCN}>
      <Layout>
        <div className="min-h-screen bg-gradient-to-b from-amber-50 to-white flex items-center justify-center py-12 px-4">
        <div className="max-w-md w-full bg-white rounded-lg shadow-md p-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-6 text-center">登录</h1>

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                邮箱
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                密码
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500"
              />
            </div>

            <div className="flex items-center">
              <input
                type="checkbox"
                id="remember"
                className="h-4 w-4 text-amber-600 focus:ring-amber-500 border-gray-300 rounded"
              />
              <label htmlFor="remember" className="ml-2 block text-sm text-gray-700">
                记住我
              </label>
            </div>

            <Button type="submit" className="w-full" loading={loading}>
              登录
            </Button>
          </form>

          <div className="mt-6 text-center">
            <p className="text-gray-600">
              还没有账号？{" "}
              <a href="/register" className="text-amber-600 hover:underline">
                立即注册
              </a>
            </p>
          </div>
        </div>
      </div>
    </Layout>
    </ConfigProvider>
  );
}

