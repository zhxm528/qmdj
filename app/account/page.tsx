"use client";

import { useState, useEffect } from "react";
import Layout from "@/components/Layout";
import Button from "@/components/Button";
import { useRouter } from "next/navigation";

function formatDate(dateStr?: string | null) {
  if (!dateStr) return "-";
  const d = new Date(dateStr);
  if (Number.isNaN(d.getTime())) return dateStr;
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function formatDateTime(dateStr?: string | null) {
  if (!dateStr) return "-";
  const d = new Date(dateStr);
  if (Number.isNaN(d.getTime())) return dateStr;
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  const hh = String(d.getHours()).padStart(2, "0");
  const mm = String(d.getMinutes()).padStart(2, "0");
  const ss = String(d.getSeconds()).padStart(2, "0");
  return `${y}-${m}-${day} ${hh}:${mm}:${ss}`;
}

export default function Account() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/account")
      .then((res) => res.json())
      .then((data) => {
        setUser(data);
        setLoading(false);
      })
      .catch(() => {
        router.push("/login");
      });
  }, [router]);

  const handleLogout = async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/");
  };

  if (loading) {
    return (
      <Layout>
        <div className="min-h-screen flex items-center justify-center">
          <p>加载中...</p>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="min-h-screen bg-gray-50 py-12 px-4">
        <div className="max-w-4xl mx-auto">
          <div className="bg-white rounded-lg shadow-md p-8">
              <div className="space-y-6">
              <div className="border-b pb-6">
                <h2 className="text-xl font-bold mb-4">账户信息</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      昵称/姓名
                    </label>
                    <p className="text-gray-900">{user?.name || "-"}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      邮箱
                    </label>
                    <p className="text-gray-900">
                      {user?.email || "-"}
                      {user?.email && (
                        <span className={`ml-2 px-2 py-1 rounded text-xs font-medium ${
                          user?.isEmailVerified 
                            ? "bg-green-100 text-green-800" 
                            : "bg-yellow-100 text-yellow-800"
                        }`}>
                          {user?.isEmailVerified ? "已验证" : "未验证"}
                        </span>
                      )}
                    </p>
                  </div>
                  {user?.memberRegisteredAt && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        注册日期
                      </label>
                      <p className="text-gray-900">
                        {formatDate(user.memberRegisteredAt)}
                      </p>
                    </div>
                  )}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      账户状态
                    </label>
                    <p className="inline-block px-4 py-2 bg-amber-50 text-amber-900 font-semibold rounded-lg border border-amber-200">
                      {user?.status === "active" ? "使用中" : user?.status || "-"}
                    </p>
                  </div>
                  {user?.cardExpiredAt && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        会员有效期
                      </label>
                      <p className="inline-block px-4 py-2 bg-amber-50 text-amber-900 font-semibold rounded-lg border border-amber-200">
                        {formatDate(user.cardExpiredAt)}
                      </p>
                    </div>
                  )}
                  {user?.memberLevel && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        会员等级
                      </label>
                      <p className="inline-block px-4 py-2 bg-amber-500 text-white font-bold rounded-lg text-lg">
                        {user.memberLevel.levelName === "银卡" ? "白银会员" : user.memberLevel.levelName}
                      </p>
                    </div>
                  )}
                </div>
              </div>

              <div className="flex gap-4">
                <Button
                  onClick={() => router.push("/member")}
                  className="flex-1"
                >
                  查看账户
                </Button>
                <Button variant="danger" onClick={handleLogout} className="flex-1">
                  退出登录
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
}

