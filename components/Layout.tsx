"use client";

import Link from "next/link";
import { useState, useEffect } from "react";

export default function Layout({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const logoText = process.env.NODE_ENV === "production" ? "缘来" : "测试环境";

  useEffect(() => {
    // 尝试获取用户信息
    fetch("/api/user/me")
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        const loggedIn = Boolean(data && data.loggedIn);
        setUser(loggedIn ? data : null);
        setLoading(false);
        if (loggedIn && data?.id) {
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
              {logoText}
              </Link>
            </div>
            <div className="md:hidden flex items-center">
              <button
                type="button"
                className="inline-flex items-center justify-center rounded-md p-2 text-gray-700 hover:text-amber-600 hover:bg-amber-50"
                aria-expanded={mobileNavOpen}
                aria-label="Toggle navigation"
                onClick={() => setMobileNavOpen((open) => !open)}
              >
                {mobileNavOpen ? (
                  <svg
                    viewBox="0 0 24 24"
                    className="h-6 w-6"
                    aria-hidden="true"
                    stroke="currentColor"
                    strokeWidth="2"
                    fill="none"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M6 6l12 12" />
                    <path d="M18 6l-12 12" />
                  </svg>
                ) : (
                  <svg
                    viewBox="0 0 24 24"
                    className="h-6 w-6"
                    aria-hidden="true"
                    stroke="currentColor"
                    strokeWidth="2"
                    fill="none"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M4 7h16" />
                    <path d="M4 12h16" />
                    <path d="M4 17h16" />
                  </svg>
                )}
              </button>
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
                  {/* 升级按钮：登录后且角色为qmdj时显示在用户名左侧，跳转到价格页 */}
                  {user.role === 'qmdj' && (
                    <Link
                      href="/pricing"
                      className="px-3 py-1.5 text-sm border border-amber-600 text-amber-600 rounded-full hover:bg-amber-50 transition-colors"
                    >
                      升级
                    </Link>
                  )}
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
          <div
            className={`md:hidden border-t border-amber-100 overflow-hidden transition-all duration-200 ease-out ${
              mobileNavOpen ? "max-h-96 opacity-100 py-3" : "max-h-0 opacity-0 py-0"
            }`}
            aria-hidden={!mobileNavOpen}
          >
            <div className="space-y-2">
              <Link
                href="/qimen"
                className="block px-2 py-2 text-gray-700 hover:text-amber-600"
                onClick={() => setMobileNavOpen(false)}
              >
                问问
              </Link>
              <Link
                href="/bazi"
                className="block px-2 py-2 text-gray-700 hover:text-amber-600"
                onClick={() => setMobileNavOpen(false)}
              >
                看看
              </Link>
              <Link
                href="/products"
                className="block px-2 py-2 text-gray-700 hover:text-amber-600"
                onClick={() => setMobileNavOpen(false)}
              >
                更多
              </Link>
              {!loading && user && user.role === "qmdj" && (
                <>
                  <Link
                    href="/community"
                    className="block px-2 py-2 text-gray-700 hover:text-amber-600"
                    onClick={() => setMobileNavOpen(false)}
                  >
                    交流
                  </Link>
                  <Link
                    href="/game"
                    className="block px-2 py-2 text-gray-700 hover:text-amber-600"
                    onClick={() => setMobileNavOpen(false)}
                  >
                    游戏
                  </Link>
                  <Link
                    href="/admin"
                    className="block px-2 py-2 text-gray-700 hover:text-amber-600"
                    onClick={() => setMobileNavOpen(false)}
                  >
                    管理
                  </Link>
                </>
              )}
              <div className="border-t border-amber-100 pt-2">
                {!loading && user ? (
                  <>
                    {user.role === 'qmdj' && (
                      <Link
                        href="/pricing"
                        className="block px-2 py-2 text-gray-700 hover:text-amber-600"
                        onClick={() => setMobileNavOpen(false)}
                      >
                        升级
                      </Link>
                    )}
                    <Link
                      href="/account"
                      className="block px-2 py-2 text-gray-700 hover:text-amber-600"
                      onClick={() => setMobileNavOpen(false)}
                    >
                      {user?.name || "账户"}
                    </Link>
                    <form action="/api/auth/logout" method="POST">
                      <button
                        type="submit"
                        className="w-full text-left px-2 py-2 text-gray-700 hover:text-amber-600"
                        onClick={() => setMobileNavOpen(false)}
                      >
                        退出
                      </button>
                    </form>
                  </>
                ) : (
                  <>
                    <Link
                      href="/login"
                      className="block px-2 py-2 text-gray-700 hover:text-amber-600"
                      onClick={() => setMobileNavOpen(false)}
                    >
                      登录
                    </Link>
                    <Link
                      href="/register"
                      className="block px-2 py-2 text-amber-600 hover:text-amber-700"
                      onClick={() => setMobileNavOpen(false)}
                    >
                      注册
                    </Link>
                  </>
                )}
              </div>
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
                {!loading && user && user.role === 'qmdj' && (
                  <li>
                    <Link href="/pricing" className="hover:text-white">
                      价格方案
                    </Link>
                  </li>
                )}
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
            <p>&copy; 2026 缘来. 保留所有权利 All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}

