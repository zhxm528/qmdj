"use client";

import { useState, useEffect, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Layout from "@/components/Layout";
import { Modal } from "antd";
import Link from "next/link";

function VerifyEmailContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [result, setResult] = useState<{
    success: boolean;
    message: string;
    error?: string;
    canResend?: boolean;
    alreadyVerified?: boolean;
  } | null>(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [resending, setResending] = useState(false);

  useEffect(() => {
    const token = searchParams.get("token");
    if (!token) {
      setResult({
        success: false,
        message: "缺少验证Token",
        error: "链接无效",
        canResend: false,
      });
      setLoading(false);
      return;
    }

    verifyEmail(token);
  }, [searchParams]);

  const verifyEmail = async (token: string) => {
    try {
      const response = await fetch(`/api/verify-email?token=${encodeURIComponent(token)}`);
      const data = await response.json();

      if (response.ok) {
        setResult({
          success: true,
          message: data.message || "邮箱验证成功",
          alreadyVerified: data.alreadyVerified || false,
        });
        setModalVisible(true);
      } else {
        setResult({
          success: false,
          message: data.error || "验证失败",
          error: data.error,
          canResend: data.canResend || false,
        });
        setModalVisible(true);
      }
    } catch (error) {
      console.error("Verify email error:", error);
      setResult({
        success: false,
        message: "验证时发生错误",
        error: "网络错误，请稍后重试",
        canResend: true,
      });
      setModalVisible(true);
    } finally {
      setLoading(false);
    }
  };

  const handleResendEmail = async () => {
    setResending(true);
    try {
      // 从URL中获取token，然后从验证记录中获取邮箱
      const token = searchParams.get("token");
      if (!token) {
        alert("无法获取验证信息");
        return;
      }

      // 先获取验证信息以获取邮箱
      const verifyResponse = await fetch(`/api/verify-email?token=${encodeURIComponent(token)}`);
      const verifyData = await verifyResponse.json();

      // 如果验证记录存在但已失效，尝试重新发送
      // 需要用户输入邮箱或从验证记录中获取
      const email = prompt("请输入您的注册邮箱：");
      if (!email) {
        return;
      }

      const response = await fetch("/api/resend-verification", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });

      const data = await response.json();
      if (response.ok) {
        alert("验证邮件已重新发送，请查收");
      } else {
        alert(data.error || "发送失败，请重试");
      }
    } catch (error) {
      console.error("Resend email error:", error);
      alert("发送失败，请稍后重试");
    } finally {
      setResending(false);
    }
  };

  return (
    <Layout>
      <div className="min-h-screen bg-gray-50 flex items-center justify-center py-12 px-4">
        <div className="max-w-md w-full bg-white rounded-lg shadow-md p-8 text-center">
          {loading ? (
            <div>
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-amber-600 mx-auto mb-4"></div>
              <p className="text-gray-600">正在验证邮箱...</p>
            </div>
          ) : result ? (
            <div>
              {result.success ? (
                <div>
                  <div className="text-6xl mb-4 text-green-600">✓</div>
                  <h1 className="text-2xl font-bold text-gray-900 mb-4">
                    邮箱验证成功！
                  </h1>
                  <p className="text-gray-600 mb-6">
                    {result.alreadyVerified
                      ? "您的邮箱已验证"
                      : "您的邮箱已验证，现在可以正常使用所有功能"}
                  </p>
                  <div className="space-y-3">
                    <Link
                      href="/"
                      className="block w-full bg-amber-600 text-white py-3 rounded-lg hover:bg-amber-700 transition-colors"
                    >
                      进入首页
                    </Link>
                    <Link
                      href="/login"
                      className="block w-full border border-amber-600 text-amber-600 py-3 rounded-lg hover:bg-amber-50 transition-colors"
                    >
                      立即登录
                    </Link>
                  </div>
                </div>
              ) : (
                <div>
                  <div className="text-6xl mb-4 text-red-600">✗</div>
                  <h1 className="text-2xl font-bold text-gray-900 mb-4">
                    验证失败
                  </h1>
                  <p className="text-gray-600 mb-6">{result.error || result.message}</p>
                  {result.canResend && (
                    <button
                      onClick={handleResendEmail}
                      disabled={resending}
                      className="w-full bg-amber-600 text-white py-3 rounded-lg hover:bg-amber-700 transition-colors disabled:opacity-50"
                    >
                      {resending ? "发送中..." : "重新发送验证邮件"}
                    </button>
                  )}
                  <Link
                    href="/register"
                    className="block w-full mt-3 border border-gray-300 text-gray-700 py-3 rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    返回注册
                  </Link>
                </div>
              )}
            </div>
          ) : null}
        </div>
      </div>

      <Modal
        open={modalVisible}
        onCancel={() => setModalVisible(false)}
        footer={null}
        centered
        width={400}
        style={{ height: 200 }}
        bodyStyle={{
          height: 200,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: "20px",
        }}
      >
        <div className="text-center">
          {result?.success ? (
            <div>
              <div className="text-6xl mb-4 text-green-600">✓</div>
              <div className="text-xl font-semibold text-green-600">
                {result.message}
              </div>
            </div>
          ) : (
            <div>
              <div className="text-6xl mb-4 text-red-600">✗</div>
              <div className="text-xl font-semibold text-red-600">
                {result?.error || result?.message || "验证失败"}
              </div>
            </div>
          )}
        </div>
      </Modal>
    </Layout>
  );
}

export default function VerifyEmailPage() {
  return (
    <Suspense fallback={
      <Layout>
        <div className="min-h-screen bg-gray-50 flex items-center justify-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-amber-600"></div>
        </div>
      </Layout>
    }>
      <VerifyEmailContent />
    </Suspense>
  );
}
