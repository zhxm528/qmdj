"use client";

import Link from "next/link";
import { useState, useEffect } from "react";
import { useTheme } from "./ThemeProvider";

export default function Layout({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const { theme, toggleTheme } = useTheme();
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

  // 点击外部关闭用户菜单
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      if (userMenuOpen && !target.closest('.user-menu-container')) {
        setUserMenuOpen(false);
      }
    };

    if (userMenuOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [userMenuOpen]);

  return (
    <div className="min-h-screen flex flex-col bg-[var(--color-bg)] text-[var(--color-text)]">
      {/* 顶栏 */}
      <header className="bg-[var(--color-surface)] shadow-sm border-b border-[var(--color-border)]">
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
                    className="inline-flex items-center justify-center rounded-md p-2 text-[var(--color-text)] hover:text-[var(--color-link)] hover:bg-[var(--color-hover)] transition-colors"
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
              <Link href="/qimen" className="text-[var(--color-text)] hover:text-[var(--color-link)] transition-colors">
              问问
              </Link>
              <Link href="/bazi" className="text-[var(--color-text)] hover:text-[var(--color-link)] transition-colors">
              看看
              </Link>
              <Link href="/products" className="text-[var(--color-text)] hover:text-[var(--color-link)] transition-colors">
              更多
              </Link>
              {!loading && user && user.role === 'qmdj' && (
                <>
                  <Link
                    href="/community"
                    className="text-[var(--color-text)] hover:text-[var(--color-link)] transition-colors"
                  >
                    交流
                  </Link>
                  <Link
                    href="/game"
                    className="text-[var(--color-text)] hover:text-[var(--color-link)] transition-colors"
                  >
                    游戏
                  </Link>
                  <Link
                    href="/admin"
                    className="text-[var(--color-text)] hover:text-[var(--color-link)] transition-colors"
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
                      className="px-3 py-1.5 text-sm border border-[var(--color-primary)] text-[var(--color-primary)] rounded-full hover:bg-[var(--color-hover)] transition-colors"
                    >
                      升级
                    </Link>
                  )}
                  {/* 用户下拉菜单 */}
                  <div className="relative user-menu-container">
                    <button
                      onClick={() => setUserMenuOpen(!userMenuOpen)}
                      className="flex items-center space-x-2 px-3 py-2 text-[var(--color-text)] hover:text-[var(--color-link)] hover:bg-[var(--color-hover)] rounded-md transition-colors"
                      aria-label="用户菜单"
                      aria-expanded={userMenuOpen}
                    >
                      <span>{user?.name || "账户"}</span>
                      <svg
                        className={`w-4 h-4 transition-transform ${userMenuOpen ? 'transform rotate-180' : ''}`}
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M19 9l-7 7-7-7"
                        />
                      </svg>
                    </button>
                    {userMenuOpen && (
                      <div className="absolute right-0 mt-2 w-48 bg-[var(--color-card-bg)] border border-[var(--color-border)] rounded-md shadow-lg z-50">
                        <div className="py-1">
                          <Link
                            href="/account"
                            className="block px-4 py-2 text-sm text-[var(--color-text)] hover:bg-[var(--color-hover)] transition-colors"
                            onClick={() => setUserMenuOpen(false)}
                          >
                            账户
                          </Link>
                          <button
                            onClick={() => {
                              toggleTheme();
                              setUserMenuOpen(false);
                            }}
                            className="w-full text-left px-4 py-2 text-sm text-[var(--color-text)] hover:bg-[var(--color-hover)] transition-colors flex items-center space-x-2"
                          >
                            <span>{theme === "dark" ? "白天" : "晚上"}</span>
                            <span>{theme === "dark" ? "☀️" : "🌙"}</span>
                          </button>
                          <form action="/api/auth/logout" method="POST">
                            <button
                              type="submit"
                              className="w-full text-left px-4 py-2 text-sm text-[var(--color-text)] hover:bg-[var(--color-hover)] transition-colors"
                              onClick={() => setUserMenuOpen(false)}
                            >
                              退出
                            </button>
                          </form>
                        </div>
                      </div>
                    )}
                  </div>
                </>
              ) : (
                <>
                  <Link
                    href="/login"
                    className="text-[var(--color-text)] hover:text-[var(--color-link)] transition-colors"
                  >
                    登录
                  </Link>
                  <Link
                    href="/register"
                    className="px-4 py-2 bg-[var(--color-primary)] text-white rounded-lg hover:bg-[var(--color-primary-strong)] transition-colors"
                  >
                    注册
                  </Link>
                </>
              )}
            </div>
          </div>
          <div
            className={`md:hidden border-t border-[var(--color-border)] overflow-hidden transition-all duration-200 ease-out ${
              mobileNavOpen ? "max-h-96 opacity-100 py-3" : "max-h-0 opacity-0 py-0"
            }`}
            aria-hidden={!mobileNavOpen}
          >
            <div className="space-y-2">
              <Link
                href="/qimen"
                className="block px-2 py-2 text-[var(--color-text)] hover:text-[var(--color-link)] transition-colors"
                onClick={() => setMobileNavOpen(false)}
              >
                问问
              </Link>
              <Link
                href="/bazi"
                className="block px-2 py-2 text-[var(--color-text)] hover:text-[var(--color-link)] transition-colors"
                onClick={() => setMobileNavOpen(false)}
              >
                看看
              </Link>
              <Link
                href="/products"
                className="block px-2 py-2 text-[var(--color-text)] hover:text-[var(--color-link)] transition-colors"
                onClick={() => setMobileNavOpen(false)}
              >
                更多
              </Link>
              {!loading && user && user.role === "qmdj" && (
                <>
                  <Link
                    href="/community"
                    className="block px-2 py-2 text-[var(--color-text)] hover:text-[var(--color-link)] transition-colors"
                    onClick={() => setMobileNavOpen(false)}
                  >
                    交流
                  </Link>
                  <Link
                    href="/game"
                    className="block px-2 py-2 text-[var(--color-text)] hover:text-[var(--color-link)] transition-colors"
                    onClick={() => setMobileNavOpen(false)}
                  >
                    游戏
                  </Link>
                  <Link
                    href="/admin"
                    className="block px-2 py-2 text-[var(--color-text)] hover:text-[var(--color-link)] transition-colors"
                    onClick={() => setMobileNavOpen(false)}
                  >
                    管理
                  </Link>
                </>
              )}
              <div className="border-t border-[var(--color-border)] pt-2">
                {!loading && user ? (
                  <>
                    {user.role === 'qmdj' && (
                      <Link
                        href="/pricing"
                        className="block px-2 py-2 text-[var(--color-text)] hover:text-[var(--color-link)] transition-colors"
                        onClick={() => setMobileNavOpen(false)}
                      >
                        升级
                      </Link>
                    )}
                    <Link
                      href="/account"
                      className="block px-2 py-2 text-[var(--color-text)] hover:text-[var(--color-link)] transition-colors"
                      onClick={() => setMobileNavOpen(false)}
                    >
                      {user?.name || "账户"}
                    </Link>
                    <button
                      onClick={() => {
                        toggleTheme();
                        setMobileNavOpen(false);
                      }}
                      className="w-full text-left px-2 py-2 text-[var(--color-text)] hover:text-[var(--color-link)] transition-colors flex items-center space-x-2"
                    >
                      <span>{theme === "dark" ? "☀️" : "🌙"}</span>
                      <span>{theme === "dark" ? "白天模式" : "黑夜模式"}</span>
                    </button>
                    <form action="/api/auth/logout" method="POST">
                      <button
                        type="submit"
                        className="w-full text-left px-2 py-2 text-[var(--color-text)] hover:text-[var(--color-link)] transition-colors"
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
                      className="block px-2 py-2 text-[var(--color-text)] hover:text-[var(--color-link)] transition-colors"
                      onClick={() => setMobileNavOpen(false)}
                    >
                      登录
                    </Link>
                    <Link
                      href="/register"
                      className="block px-2 py-2 text-[var(--color-link)] hover:text-[var(--color-link-hover)] transition-colors"
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
      <footer className="bg-[var(--color-elevated)] text-[var(--color-text)] border-t border-[var(--color-border)]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div>
              <h3 className="text-lg font-bold mb-4">缘来</h3>
              <p className="text-[var(--color-muted)] text-sm">
                专业的在线运势咨询服务平台
              </p>
            </div>
            <div>
              <h4 className="font-bold mb-4">产品</h4>
              <ul className="space-y-2 text-sm text-[var(--color-muted)]">
                <li>
                  <Link href="/products" className="hover:text-[var(--color-text-strong)] transition-colors">
                    功能展示
                  </Link>
                </li>
                {!loading && user && user.role === 'qmdj' && (
                  <li>
                    <Link href="/pricing" className="hover:text-[var(--color-text-strong)] transition-colors">
                      价格方案
                    </Link>
                  </li>
                )}
              </ul>
            </div>
            <div>
              <h4 className="font-bold mb-4">法律</h4>
              <ul className="space-y-2 text-sm text-[var(--color-muted)]">
                <li>
                  <Link href="/terms" className="hover:text-[var(--color-text-strong)] transition-colors">
                    服务条款
                  </Link>
                </li>
                <li>
                  <Link href="/privacy" className="hover:text-[var(--color-text-strong)] transition-colors">
                    隐私政策
                  </Link>
                </li>
              </ul>
            </div>
          </div>
          <div className="border-t border-[var(--color-border)] mt-8 pt-8 text-center text-sm text-[var(--color-muted)]">
            <p>&copy; 2026 缘来. 保留所有权利 All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}

