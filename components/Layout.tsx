"use client";

import Link from "next/link";
import { useState, useEffect } from "react";

export default function Layout({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // 尝试获取用户信息
    fetch("/api/user/me")
      .then((res) => {
        if (res.ok) return res.json();
        return null;
      })
      .then((data) => {
        setUser(data);
        setLoading(false);
        // 登录后将关键信息写入后台日志
        if (data && data.id) {
          try {
            fetch("/api/user/log", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                id: data.id,
                email: data.email,
                name: data.name,
              }),
            }).catch(() => {});
          } catch {}
        }
      })
      .catch(() => setLoading(false));
  }, []);

  return (
    <div className="min-h-screen flex flex-col">
      {/* 顶栏 */}
      <header className="bg-white shadow-sm border-b">
        <nav className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <Link href="/" className="text-2xl font-bold text-amber-600">
              缘来运势
              </Link>
            </div>
            <div className="hidden md:flex items-center space-x-8">
              <Link href="/qimen" className="text-gray-700 hover:text-amber-600">
              问问
              </Link>
              <Link href="/bazi" className="text-gray-700 hover:text-amber-600">
              看看
              </Link>
              <Link href="/products" className="text-gray-700 hover:text-amber-600">
              更多
              </Link>
              {!loading && user && user.role === 'qmdj' && (
                <>
                  <Link
                    href="/community"
                    className="text-gray-700 hover:text-amber-600"
                  >
                    交流
                  </Link>
                  <Link
                    href="/game"
                    className="text-gray-700 hover:text-amber-600"
                  >
                    游戏
                  </Link>
                  <Link
                    href="/admin"
                    className="text-gray-700 hover:text-amber-600"
                  >
                    管理
                  </Link>
                </>
              )}
            </div>
            <div className="flex items-center space-x-4">
              {!loading && user ? (
                <>
                  {/* 升级按钮：登录后显示在用户名左侧，跳转到价格页 */}
                  <Link
                    href="/pricing"
                    className="px-3 py-1.5 text-sm border border-amber-600 text-amber-600 rounded-full hover:bg-amber-50 transition-colors"
                  >
                    升级
                  </Link>
                  <Link href="/account" className="text-gray-700 hover:text-amber-600">
                    {user?.name || "账户"}
                  </Link>
                  <form action="/api/auth/logout" method="POST">
                    <button
                      type="submit"
                      className="px-4 py-2 text-sm text-gray-700 hover:text-amber-600"
                    >
                      退出
                    </button>
                  </form>
                </>
              ) : (
                <>
                  <Link
                    href="/pricing"
                    className="text-gray-700 hover:text-amber-600"
                  >
                    价格
                  </Link>
                  <Link
                    href="/login"
                    className="text-gray-700 hover:text-amber-600"
                  >
                    登录
                  </Link>
                  <Link
                    href="/register"
                    className="px-4 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700"
                  >
                    注册
                  </Link>
                </>
              )}
            </div>
          </div>
        </nav>
      </header>

      {/* 内容 */}
      <main className="flex-1">{children}</main>

      {/* 页脚 */}
      <footer className="bg-gray-900 text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div>
              <h3 className="text-lg font-bold mb-4">缘来</h3>
              <p className="text-gray-400 text-sm">
                专业的在线运势咨询服务平台
              </p>
            </div>
            <div>
              <h4 className="font-bold mb-4">产品</h4>
              <ul className="space-y-2 text-sm text-gray-400">
                <li>
                  <Link href="/products" className="hover:text-white">
                    功能展示
                  </Link>
                </li>
                <li>
                  <Link href="/pricing" className="hover:text-white">
                    价格方案
                  </Link>
                </li>
              </ul>
            </div>
            <div>
              <h4 className="font-bold mb-4">法律</h4>
              <ul className="space-y-2 text-sm text-gray-400">
                <li>
                  <Link href="/terms" className="hover:text-white">
                    服务条款
                  </Link>
                </li>
                <li>
                  <Link href="/privacy" className="hover:text-white">
                    隐私政策
                  </Link>
                </li>
              </ul>
            </div>
          </div>
          <div className="border-t border-gray-800 mt-8 pt-8 text-center text-sm text-gray-400">
            <p>&copy; 2026 缘来运势. 保留所有权利 All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}

