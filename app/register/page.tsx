"use client";

import { useState } from "react";
import Layout from "@/components/Layout";
import Button from "@/components/Button";
import { useRouter } from "next/navigation";

export default function Register() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();

    if (password !== confirmPassword) {
      alert("两次输入的密码不一致");
      return;
    }

    setLoading(true);

    try {
      const response = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      if (response.ok) {
        router.push("/login");
      } else {
        alert("注册失败，邮箱可能已被使用");
      }
    } catch (error) {
      console.error("Register error:", error);
      alert("注册时发生错误");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Layout>
      <div className="min-h-screen bg-gradient-to-b from-amber-50 to-white flex items-center justify-center py-12 px-4">
        <div className="max-w-md w-full bg-white rounded-lg shadow-md p-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-6 text-center">注册</h1>

          <form onSubmit={handleRegister} className="space-y-4">
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
                minLength={6}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                确认密码
              </label>
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                minLength={6}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500"
              />
            </div>

            <div className="flex items-start">
              <input
                type="checkbox"
                id="terms"
                required
                className="h-4 w-4 text-amber-600 focus:ring-amber-500 border-gray-300 rounded mt-1"
              />
              <label htmlFor="terms" className="ml-2 block text-sm text-gray-700">
                我已阅读并同意{" "}
                <a href="/terms" className="text-amber-600 hover:underline">
                  服务条款
                </a>{" "}
                和{" "}
                <a href="/privacy" className="text-amber-600 hover:underline">
                  隐私政策
                </a>
              </label>
            </div>

            <Button type="submit" className="w-full" loading={loading}>
              注册
            </Button>
          </form>

          <div className="mt-6 text-center">
            <p className="text-gray-600">
              已有账号？{" "}
              <a href="/login" className="text-amber-600 hover:underline">
                立即登录
              </a>
            </p>
          </div>
        </div>
      </div>
    </Layout>
  );
}

