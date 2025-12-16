"use client";

import { useState, useEffect, useCallback } from "react";
import { Modal, ConfigProvider, Pagination } from "antd";
import zhCN from "antd/locale/zh_CN";
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

interface MemberData {
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
  account: {
    memberId: number;
    balance: number;
    frozenBalance: number;
    updatedAt: string;
  } | null;
  cards: Array<{
    cardId: number;
    cardNo: string;
    memberId: number;
    isPrimary: boolean;
    status: number;
    issuedAt: string;
    expiredAt: string | null;
    remark: string | null;
  }>;
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
  consumptionRecords: Array<{
    consumptionId: number;
    memberId: number;
    cardId: number | null;
    originalAmount: number;
    discountAmount: number;
    payableAmount: number;
    paidAmount: number;
    payChannel: string;
    status: number;
    pointsUsed: number;
    pointsEarned: number;
    externalOrderNo: string | null;
    remark: string | null;
    createdAt: string;
  }>;
  consumptionPagination: {
    total: number;
    page: number;
    pageSize: number;
  };
}

export default function Member() {
  const router = useRouter();
  const [memberData, setMemberData] = useState<MemberData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [rechargeAmount, setRechargeAmount] = useState<string>("");
  const [rechargeLoading, setRechargeLoading] = useState(false);
  const [showRechargeForm, setShowRechargeForm] = useState(false);
  const [rechargePage, setRechargePage] = useState<number>(1);
  const [rechargePageSize] = useState<number>(10);
  const [consumptionPage, setConsumptionPage] = useState<number>(1);
  const [consumptionPageSize] = useState<number>(10);
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState({
    fullName: "",
    mobile: "",
    gender: "",
    birthDate: "",
  });
  const [saveLoading, setSaveLoading] = useState(false);

  const loadMemberData = useCallback((rechargePageNum: number = rechargePage, consumptionPageNum: number = consumptionPage) => {
    setLoading(true);
    fetch(`/api/member?rechargePage=${rechargePageNum}&rechargePageSize=${rechargePageSize}&consumptionPage=${consumptionPageNum}&consumptionPageSize=${consumptionPageSize}`)
      .then((res) => res.json())
      .then((data) => {
        if (data.success && data.data) {
          setMemberData(data.data);
          setRechargePage(data.data.rechargePagination?.page || rechargePageNum);
          setConsumptionPage(data.data.consumptionPagination?.page || consumptionPageNum);
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
  }, [rechargePage, rechargePageSize, consumptionPage, consumptionPageSize]);

  useEffect(() => {
    loadMemberData(1, 1);
  }, [loadMemberData]);

  const handleEdit = () => {
    if (memberData?.member) {
      setEditForm({
        fullName: memberData.member.fullName || "",
        mobile: memberData.member.mobile || "",
        gender: memberData.member.gender || "",
        birthDate: memberData.member.birthDate || "",
      });
      setIsEditing(true);
    }
  };

  const handleCancelEdit = () => {
    setIsEditing(false);
    setEditForm({
      fullName: "",
      mobile: "",
      gender: "",
      birthDate: "",
    });
  };

  const handleSaveEdit = async () => {
    if (!memberData?.member) return;

    setSaveLoading(true);
    try {
      const response = await fetch("/api/member", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          fullName: editForm.fullName || null,
          mobile: editForm.mobile || null,
          gender: editForm.gender || null,
          birthDate: editForm.birthDate || null,
        }),
      });

      const data = await response.json();
      if (data.success) {
        Modal.success({
          title: "保存成功",
          content: "会员信息已更新",
          centered: true,
          onOk: () => {
            setIsEditing(false);
            loadMemberData(rechargePage, consumptionPage);
          },
        });
      } else {
        Modal.error({
          title: "保存失败",
          content: data.error || "保存失败，请重试",
          centered: true,
        });
      }
    } catch (err) {
      console.error("保存会员信息失败:", err);
      Modal.error({
        title: "保存失败",
        content: "保存失败，请重试",
        centered: true,
      });
    } finally {
      setSaveLoading(false);
    }
  };

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
      const response = await fetch("/api/member", {
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
            setShowRechargeForm(false);
            // 重新加载会员数据，回到第一页
            setRechargePage(1);
            loadMemberData(1, consumptionPage);
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
                <h1 className="text-3xl font-bold text-gray-900 mb-4">会员信息</h1>
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

  if (!memberData) {
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

  const { member, account, cards, level, rechargeRecords, rechargePagination, consumptionRecords, consumptionPagination } = memberData;
  
  // 获取主卡的过期时间
  const primaryCard = cards?.find(card => card.isPrimary);
  const cardExpiredAt = primaryCard?.expiredAt || null;

  return (
    <ConfigProvider locale={zhCN}>
      <Layout>
        <div className="min-h-screen bg-gradient-to-b from-amber-50 to-white py-12 px-4">
        <div className="max-w-4xl mx-auto">
          <div className="bg-white rounded-lg shadow-md p-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-8">会员信息</h1>

            <div className="space-y-6">
              {/* 基本信息 */}
              <div className="border-b pb-6">
                <div className="flex justify-between items-center mb-4">
                  <h2 className="text-xl font-bold">基本信息</h2>
                  {!isEditing && (
                    <Button onClick={handleEdit}>编辑</Button>
                  )}
                </div>
                {isEditing ? (
                  <div className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          姓名
                        </label>
                        <input
                          type="text"
                          value={editForm.fullName}
                          onChange={(e) =>
                            setEditForm({ ...editForm, fullName: e.target.value })
                          }
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-amber-500"
                          placeholder="请输入姓名"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          邮箱
                        </label>
                        <p className="text-gray-900 py-2">{member.email}</p>
                        <p className="text-xs text-gray-500">邮箱不可修改</p>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          手机号
                        </label>
                        <input
                          type="text"
                          value={editForm.mobile}
                          onChange={(e) =>
                            setEditForm({ ...editForm, mobile: e.target.value })
                          }
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-amber-500"
                          placeholder="请输入手机号"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          性别
                        </label>
                        <select
                          value={editForm.gender}
                          onChange={(e) =>
                            setEditForm({ ...editForm, gender: e.target.value })
                          }
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-amber-500"
                        >
                          <option value="">请选择</option>
                          <option value="M">男</option>
                          <option value="F">女</option>
                          <option value="O">其他</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          生日
                        </label>
                        <input
                          type="date"
                          value={editForm.birthDate ? editForm.birthDate.split("T")[0] : ""}
                          onChange={(e) =>
                            setEditForm({ ...editForm, birthDate: e.target.value })
                          }
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-amber-500"
                        />
                      </div>
                    </div>
                    <div className="flex gap-2 mt-4">
                      <Button
                        onClick={handleSaveEdit}
                        disabled={saveLoading}
                        className="flex-1"
                      >
                        {saveLoading ? "保存中..." : "保存"}
                      </Button>
                      <Button
                        onClick={handleCancelEdit}
                        variant="danger"
                        className="flex-1"
                        disabled={saveLoading}
                      >
                        取消
                      </Button>
                    </div>
                  </div>
                ) : (
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
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        性别
                      </label>
                      <p className="text-gray-900">
                        {member.gender === "M" ? "男性" : member.gender === "F" ? "女性" : member.gender === "O" ? "其他" : member.gender || "-"}
                      </p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        生日
                      </label>
                      <p className="text-gray-900">{formatDate(member.birthDate)}</p>
                    </div>
                  </div>
                )}
              </div>

              {/* 会员等级 */}
              {level && (
                <div className="border-b pb-6">
                  <h2 className="text-xl font-bold mb-4">会员等级</h2>
                  <div className="bg-amber-50 p-4 rounded-lg grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-gray-600 mb-1">等级名称</p>
                      <p className="font-medium text-gray-900">{level.levelName}</p>
                    </div>
                    {level.discountRate !== 1 && (
                      <div>
                        <p className="text-sm text-gray-600 mb-1">消费折扣</p>
                        <p className="font-medium text-gray-900">
                          {(level.discountRate * 100).toFixed(0)}%
                        </p>
                      </div>
                    )}
                    {member.registeredAt && (
                      <div>
                        <p className="text-sm text-gray-600 mb-1">会员注册日期</p>
                        <p className="font-medium text-gray-900">
                          {formatDate(member.registeredAt)}
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              )}

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

              {/* 账户余额 */}
              {account && (
                <div className="border-b pb-6">
                  <h2 className="text-xl font-bold mb-4">账户余额</h2>
                  <div className="bg-amber-50 p-4 rounded-lg grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-gray-600 mb-1">可用余额</p>
                      <p className="font-medium text-gray-900 text-2xl">
                        ¥{account.balance.toFixed(2)}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600 mb-1">冻结余额</p>
                      <p className="font-medium text-gray-900 text-2xl">
                        ¥{account.frozenBalance.toFixed(2)}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600 mb-1">更新时间</p>
                      <p className="font-medium text-gray-900">
                        {formatDateTime(account.updatedAt)}
                      </p>
                    </div>
                  </div>
                  <div className="mt-4">
                    {!showRechargeForm ? (
                      <Button
                        onClick={() => setShowRechargeForm(true)}
                        className="w-full"
                      >
                        充值
                      </Button>
                    ) : (
                      <div className="bg-white p-4 rounded-lg border border-amber-200">
                        <div className="mb-4">
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            充值金额（元）
                          </label>
                          <input
                            type="number"
                            step="0.01"
                            min="0.01"
                            value={rechargeAmount}
                            onChange={(e) => setRechargeAmount(e.target.value)}
                            placeholder="请输入充值金额"
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-amber-500"
                          />
                        </div>
                        <div className="flex gap-2">
                          <Button
                            onClick={handleRecharge}
                            disabled={rechargeLoading}
                            className="flex-1"
                          >
                            {rechargeLoading ? "充值中..." : "保存"}
                          </Button>
                          <Button
                            onClick={() => {
                              setShowRechargeForm(false);
                              setRechargeAmount("");
                            }}
                            variant="danger"
                            className="flex-1"
                          >
                            取消
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* 会员卡信息 */}
              {cards && cards.length > 0 && (
                <div className="border-b pb-6">
                  <h2 className="text-xl font-bold mb-4">会员卡</h2>
                  <div className="space-y-4">
                    {cards.map((card) => (
                      <div
                        key={card.cardId}
                        className="bg-amber-50 p-4 rounded-lg border border-amber-200"
                      >
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                            <p className="text-sm text-gray-600 mb-1">卡号</p>
                            <p className="font-medium text-gray-900">{card.cardNo}</p>
                          </div>
                          <div>
                            <p className="text-sm text-gray-600 mb-1">状态</p>
                            <p className="font-medium text-gray-900">
                              {card.status === 1 ? "使用中" : "挂失/注销"}
                            </p>
                          </div>
                          <div>
                            <p className="text-sm text-gray-600 mb-1">发卡时间</p>
                            <p className="font-medium text-gray-900">
                              {formatDateTime(card.issuedAt)}
                            </p>
                          </div>
                          {card.expiredAt && (
                            <div>
                              <p className="text-sm text-gray-600 mb-1">过期时间</p>
                              <p className="font-medium text-gray-900">
                                {formatDateTime(card.expiredAt)}
                              </p>
                            </div>
                          )}
                          {card.remark && (
                            <div>
                              <p className="text-sm text-gray-600 mb-1">备注</p>
                              <p className="font-medium text-gray-900">{card.remark}</p>
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* 充值记录 */}
              {rechargeRecords && rechargeRecords.length > 0 && (
                <div className="border-b pb-6">
                  <h2 className="text-xl font-bold mb-4">充值记录</h2>
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
                          loadMemberData(page, consumptionPage);
                        }}
                        showSizeChanger={false}
                        showQuickJumper={false}
                        showTotal={(total) => `共 ${total} 条记录`}
                      />
                    </div>
                  )}
                </div>
              )}

              {/* 消费记录 */}
              {consumptionRecords && consumptionRecords.length > 0 && (
                <div className="border-b pb-6">
                  <h2 className="text-xl font-bold mb-4">消费记录</h2>
                  <div className="space-y-3">
                    {consumptionRecords.map((record) => (
                      <div
                        key={record.consumptionId}
                        className="bg-gray-50 p-4 rounded-lg border border-gray-200"
                      >
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                          <div>
                            <p className="text-sm text-gray-600 mb-1">消费金额</p>
                            <p className="font-medium text-gray-900 text-lg">
                              ¥{record.paidAmount.toFixed(2)}
                            </p>
                          </div>
                          <div>
                            <p className="text-sm text-gray-600 mb-1">原始金额</p>
                            <p className="font-medium text-gray-900">
                              ¥{record.originalAmount.toFixed(2)}
                            </p>
                          </div>
                          <div>
                            <p className="text-sm text-gray-600 mb-1">优惠金额</p>
                            <p className="font-medium text-gray-900">
                              ¥{record.discountAmount.toFixed(2)}
                            </p>
                          </div>
                          <div>
                            <p className="text-sm text-gray-600 mb-1">支付渠道</p>
                            <p className="font-medium text-gray-900">
                              {record.payChannel === "BALANCE" ? "余额" : 
                               record.payChannel === "CASH" ? "现金" :
                               record.payChannel === "WECHAT" ? "微信" :
                               record.payChannel === "ALIPAY" ? "支付宝" : record.payChannel}
                            </p>
                          </div>
                          <div>
                            <p className="text-sm text-gray-600 mb-1">使用积分</p>
                            <p className="font-medium text-gray-900">
                              {record.pointsUsed}
                            </p>
                          </div>
                          <div>
                            <p className="text-sm text-gray-600 mb-1">获得积分</p>
                            <p className="font-medium text-gray-900">
                              {record.pointsEarned}
                            </p>
                          </div>
                          <div>
                            <p className="text-sm text-gray-600 mb-1">消费时间</p>
                            <p className="font-medium text-gray-900">
                              {formatDateTime(record.createdAt)}
                            </p>
                          </div>
                          <div>
                            <p className="text-sm text-gray-600 mb-1">状态</p>
                            <p className="font-medium text-gray-900">
                              {record.status === 1 ? "成功" : "作废/撤销"}
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
                  {consumptionPagination && consumptionPagination.total > 0 && (
                    <div className="mt-4 flex justify-center">
                      <Pagination
                        current={consumptionPagination.page}
                        pageSize={consumptionPagination.pageSize}
                        total={consumptionPagination.total}
                        onChange={(page) => {
                          setConsumptionPage(page);
                          loadMemberData(rechargePage, page);
                        }}
                        showSizeChanger={false}
                        showQuickJumper={false}
                        showTotal={(total) => `共 ${total} 条记录`}
                      />
                    </div>
                  )}
                </div>
              )}

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
