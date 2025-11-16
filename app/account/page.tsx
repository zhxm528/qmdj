"use client";

import { useState, useEffect } from "react";
import Layout from "@/components/Layout";
import Button from "@/components/Button";
import { useRouter } from "next/navigation";

export default function Account() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/user/me")
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
      <div className="min-h-screen bg-gradient-to-b from-amber-50 to-white py-12 px-4">
        <div className="max-w-4xl mx-auto">
          <div className="bg-white rounded-lg shadow-md p-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-8">账户信息</h1>

            <div className="space-y-6">
              <div className="border-b pb-6">
                <h2 className="text-xl font-bold mb-4">个人信息</h2>
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
                    <p className="text-gray-900">{user?.email || "-"}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      注册日期
                    </label>
                    <p className="text-gray-900">{user?.createdAt || "-"}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      最近更新
                    </label>
                    <p className="text-gray-900">{user?.updatedAt || "-"}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      邮箱验证
                    </label>
                    <p className="text-gray-900">
                      {user?.isEmailVerified ? "已验证" : "未验证"}
                    </p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      账户状态
                    </label>
                    <p className="text-gray-900">{user?.status || "-"}</p>
                  </div>
                </div>
              </div>

              <div className="border-b pb-6">
                <h2 className="text-xl font-bold mb-4">会员信息</h2>
                <div className="bg-amber-50 p-4 rounded-lg grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-gray-600 mb-1">会员等级</p>
                    <p className="font-medium text-gray-900">
                      {user?.membership?.level || "-"}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600 mb-1">会员号</p>
                    <p className="font-medium text-gray-900">
                      {user?.membership?.no || "-"}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600 mb-1">是否付款</p>
                    <p className="font-medium text-gray-900">
                      {user?.membership?.isPaid ? "已付款" : "未付款"}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600 mb-1">最后付款时间</p>
                    <p className="font-medium text-gray-900">
                      {user?.membership?.lastPaidAt || "-"}
                    </p>
                  </div>
                </div>
                <div className="mt-4" />
              </div>

              <div>
                <Button variant="danger" onClick={handleLogout} className="w-full">
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

