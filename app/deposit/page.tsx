"use client";

import { useState, useEffect, useCallback } from "react";
import { Modal, ConfigProvider, Pagination, Input, Button as AntdButton } from "antd";
import zhCN from "antd/locale/zh_CN";
import Layout from "@/components/Layout";
import Button from "@/components/Button";
import { useRouter } from "next/navigation";

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

interface DepositData {
  member: {
    memberId: number;
    memberCode: string | null;
    fullName: string | null;
    mobile: string | null;
    email: string;
    gender: string | null;
    birthDate: string | null;
    status: number;
    levelId: number | null;
    totalPoints: number;
    availablePoints: number;
    remark: string | null;
    registeredAt: string;
    updatedAt: string;
  };
  level: {
    levelId: number;
    levelCode: string;
    levelName: string;
    minPoints: number;
    maxPoints: number | null;
    discountRate: number;
  } | null;
  rechargeRecords: Array<{
    rechargeId: number;
    memberId: number;
    cardId: number | null;
    amount: number;
    bonusPoints: number;
    paymentMethod: string;
    status: number;
    externalOrderNo: string | null;
    operatorId: string | null;
    remark: string | null;
    createdAt: string;
  }>;
  rechargePagination: {
    total: number;
    page: number;
    pageSize: number;
  };
}

export default function Deposit() {
  const router = useRouter();
  const [depositData, setDepositData] = useState<DepositData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [rechargeAmount, setRechargeAmount] = useState<string>("");
  const [rechargeLoading, setRechargeLoading] = useState(false);
  const [rechargePage, setRechargePage] = useState<number>(1);
  const [rechargePageSize] = useState<number>(10);

  const loadDepositData = useCallback((page: number = rechargePage) => {
    setLoading(true);
    fetch(`/api/deposit?page=${page}&pageSize=${rechargePageSize}`)
      .then((res) => res.json())
      .then((data) => {
        if (data.success && data.data) {
          setDepositData(data.data);
          setRechargePage(data.data.rechargePagination?.page || page);
          setLoading(false);
        } else {
          setError(data.error || "获取会员信息失败");
          setLoading(false);
        }
      })
      .catch((err) => {
        console.error("获取会员信息失败:", err);
        setError("获取会员信息失败");
        setLoading(false);
      });
  }, [rechargePage, rechargePageSize]);

  useEffect(() => {
    loadDepositData(1);
  }, [loadDepositData]);

  const handleRecharge = async () => {
    const amount = parseFloat(rechargeAmount);
    if (!amount || amount <= 0) {
      Modal.warning({
        title: "提示",
        content: "请输入有效的充值金额",
        centered: true,
      });
      return;
    }

    setRechargeLoading(true);
    try {
      const response = await fetch("/api/deposit", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ amount }),
      });

      const data = await response.json();
      if (data.success) {
        Modal.success({
          title: "充值成功",
          content: (
            <div>
              <p>充值金额：¥{amount.toFixed(2)}</p>
              <p>获得积分：{data.data.pointsAdded}</p>
            </div>
          ),
          centered: true,
          onOk: () => {
            setRechargeAmount("");
            // 重新加载会员数据，回到第一页
            setRechargePage(1);
            loadDepositData(1);
          },
        });
      } else {
        Modal.error({
          title: "充值失败",
          content: data.error || "充值失败，请重试",
          centered: true,
        });
      }
    } catch (err) {
      console.error("充值失败:", err);
      Modal.error({
        title: "充值失败",
        content: "充值失败，请重试",
        centered: true,
      });
    } finally {
      setRechargeLoading(false);
    }
  };

  if (loading) {
    return (
      <ConfigProvider locale={zhCN}>
        <Layout>
          <div className="min-h-screen flex items-center justify-center">
            <p>加载中...</p>
          </div>
        </Layout>
      </ConfigProvider>
    );
  }

  if (error) {
    return (
      <ConfigProvider locale={zhCN}>
        <Layout>
          <div className="min-h-screen bg-gradient-to-b from-amber-50 to-white py-12 px-4">
            <div className="max-w-4xl mx-auto">
              <div className="bg-white rounded-lg shadow-md p-8">
                <h1 className="text-3xl font-bold text-gray-900 mb-4">充值页面</h1>
                <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
                  <p className="text-red-800">{error}</p>
                </div>
                <Button onClick={() => router.push("/account")} className="w-full">
                  返回账户页面
                </Button>
              </div>
            </div>
          </div>
        </Layout>
      </ConfigProvider>
    );
  }

  if (!depositData) {
    return (
      <ConfigProvider locale={zhCN}>
        <Layout>
          <div className="min-h-screen flex items-center justify-center">
            <p>未找到会员信息</p>
          </div>
        </Layout>
      </ConfigProvider>
    );
  }

  const { member, level, rechargeRecords, rechargePagination } = depositData;

  return (
    <ConfigProvider locale={zhCN}>
      <Layout>
        <div className="min-h-screen bg-gradient-to-b from-amber-50 to-white py-12 px-4">
          <div className="max-w-4xl mx-auto">
            <div className="bg-white rounded-lg shadow-md p-8">
              <h1 className="text-3xl font-bold text-gray-900 mb-8">充值页面</h1>

              <div className="space-y-6">
                {/* 会员基本信息 */}
                <div className="border-b pb-6">
                  <h2 className="text-xl font-bold mb-4">会员基本信息</h2>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        姓名
                      </label>
                      <p className="text-gray-900">{member.fullName || "-"}</p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        邮箱
                      </label>
                      <p className="text-gray-900">{member.email}</p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        手机号
                      </label>
                      <p className="text-gray-900">{member.mobile || "-"}</p>
                    </div>
                    {level && (
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          会员等级
                        </label>
                        <p className="inline-block px-4 py-2 bg-amber-500 text-white font-bold rounded-lg text-lg">
                          {level.levelName}
                        </p>
                      </div>
                    )}
                  </div>
                </div>

                {/* 积分信息 */}
                <div className="border-b pb-6">
                  <h2 className="text-xl font-bold mb-4">积分信息</h2>
                  <div className="bg-amber-50 p-4 rounded-lg grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-gray-600 mb-1">历史累计积分</p>
                      <p className="font-medium text-gray-900 text-2xl">
                        {member.totalPoints}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600 mb-1">当前可用积分</p>
                      <p className="font-medium text-gray-900 text-2xl">
                        {member.availablePoints}
                      </p>
                    </div>
                  </div>
                </div>

                {/* 充值输入框和提交按钮 */}
                <div className="border-b pb-6">
                  <h2 className="text-xl font-bold mb-4">充值</h2>
                  <div className="bg-white p-4 rounded-lg border border-amber-200">
                    <div className="mb-4">
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        充值金额（元）
                      </label>
                      <Input
                        type="number"
                        step="0.01"
                        min="0.01"
                        value={rechargeAmount}
                        onChange={(e) => setRechargeAmount(e.target.value)}
                        placeholder="请输入充值金额"
                        size="large"
                        style={{ width: "100%" }}
                      />
                    </div>
                    <AntdButton
                      type="primary"
                      size="large"
                      onClick={handleRecharge}
                      loading={rechargeLoading}
                      disabled={!rechargeAmount || parseFloat(rechargeAmount) <= 0}
                      className="w-full bg-amber-600 hover:bg-amber-700"
                    >
                      {rechargeLoading ? "充值中..." : "提交充值"}
                    </AntdButton>
                  </div>
                </div>

                {/* 充值记录 */}
                <div className="border-b pb-6">
                  <h2 className="text-xl font-bold mb-4">充值记录</h2>
                  {rechargeRecords && rechargeRecords.length > 0 ? (
                    <>
                      <div className="space-y-3">
                        {rechargeRecords.map((record) => (
                          <div
                            key={record.rechargeId}
                            className="bg-gray-50 p-4 rounded-lg border border-gray-200"
                          >
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                              <div>
                                <p className="text-sm text-gray-600 mb-1">充值金额</p>
                                <p className="font-medium text-gray-900 text-lg">
                                  ¥{record.amount.toFixed(2)}
                                </p>
                              </div>
                              <div>
                                <p className="text-sm text-gray-600 mb-1">支付方式</p>
                                <p className="font-medium text-gray-900">
                                  {record.paymentMethod === "ONLINE" ? "在线支付" : record.paymentMethod}
                                </p>
                              </div>
                              <div>
                                <p className="text-sm text-gray-600 mb-1">充值时间</p>
                                <p className="font-medium text-gray-900">
                                  {formatDateTime(record.createdAt)}
                                </p>
                              </div>
                              <div>
                                <p className="text-sm text-gray-600 mb-1">状态</p>
                                <p className="font-medium text-gray-900">
                                  {record.status === 1 ? "成功" : "失败"}
                                </p>
                              </div>
                              {record.remark && (
                                <div>
                                  <p className="text-sm text-gray-600 mb-1">备注</p>
                                  <p className="font-medium text-gray-900">{record.remark}</p>
                                </div>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                      {rechargePagination && rechargePagination.total > 0 && (
                        <div className="mt-4 flex justify-center">
                          <Pagination
                            current={rechargePagination.page}
                            pageSize={rechargePagination.pageSize}
                            total={rechargePagination.total}
                            onChange={(page) => {
                              setRechargePage(page);
                              loadDepositData(page);
                            }}
                            showSizeChanger={false}
                            showQuickJumper={false}
                            showTotal={(total) => `共 ${total} 条记录`}
                          />
                        </div>
                      )}
                    </>
                  ) : (
                    <div className="text-center py-8 text-gray-500">
                      <p>暂无充值记录</p>
                    </div>
                  )}
                </div>

                {/* 操作按钮 */}
                <div>
                  <Button onClick={() => router.push("/account")} className="w-full">
                    返回账户页面
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </Layout>
    </ConfigProvider>
  );
}
