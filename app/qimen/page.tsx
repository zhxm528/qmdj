"use client";

import { useState, useEffect, useRef, startTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import Layout from "@/components/Layout";
import DateSelector from "@/components/DateSelector";
import HourSelector from "@/components/HourSelector";
import MinuteSelector from "@/components/MinuteSelector";
import NineGrid from "@/components/NineGrid";
import { getFourPillars } from "@/lib/ganzhi";
import { Button, ConfigProvider, Input, Radio, Dropdown, MenuProps, Tooltip, Modal } from "antd";
import {
  MoreOutlined,
  EditOutlined,
  InboxOutlined,
  DeleteOutlined,
  StarOutlined,
  StarFilled,
  PlusOutlined,
} from "@ant-design/icons";
import zhCN from "antd/locale/zh_CN";

const DISPLAY_ORDER = [4, 9, 2, 3, 5, 7, 8, 1, 6];

// 时柱到旬首的映射表
const HOUR_PILLAR_TO_XUN: Record<string, string> = {
  甲子: "戊", 乙丑: "戊", 丙寅: "戊", 丁卯: "戊", 戊辰: "戊",
  己巳: "戊", 庚午: "戊", 辛未: "戊", 壬申: "戊", 癸酉: "戊",
  甲戌: "己", 乙亥: "己", 丙子: "己", 丁丑: "己", 戊寅: "己",
  己卯: "己", 庚辰: "己", 辛巳: "己", 壬午: "己", 癸未: "己",
  甲申: "庚", 乙酉: "庚", 丙戌: "庚", 丁亥: "庚", 戊子: "庚",
  己丑: "庚", 庚寅: "庚", 辛卯: "庚", 壬辰: "庚", 癸巳: "庚",
  甲午: "辛", 乙未: "辛", 丙申: "辛", 丁酉: "辛", 戊戌: "辛",
  己亥: "辛", 庚子: "辛", 辛丑: "辛", 壬寅: "辛", 癸卯: "辛",
  甲辰: "壬", 乙巳: "壬", 丙午: "壬", 丁未: "壬", 戊申: "壬",
  己酉: "壬", 庚戌: "壬", 辛亥: "壬", 壬子: "壬", 癸丑: "壬",
  甲寅: "癸", 乙卯: "癸", 丙辰: "癸", 丁巳: "癸", 戊午: "癸",
  己未: "癸", 庚申: "癸", 辛酉: "癸", 壬戌: "癸", 癸亥: "癸",
};

// 根据时柱计算旬首
function getXunShou(hourPillar: string): string {
  return HOUR_PILLAR_TO_XUN[hourPillar] || "—";
}

interface DateInfo {
  gregorian: string;
  lunar: string;
  season: string;
  startShijie?: string;
  endShijie?: string;
  fourPillars: {
    year: string;
    month: string;
    day: string;
    hour: string;
  };
  dunType: "阳遁" | "阴遁";
  ju: number;
}

interface PaipanResult {
  grid: any[];
  meta?: {
    date?: string;
    time?: string;
    season?: string;
    dunType?: string;
    ju?: number;
  };
}

// 获取当前日期的格式化字符串 (YYYY-MM-DD)
function getCurrentDate(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

// 获取当前小时的格式化字符串 (HH)
function getCurrentHour(): string {
  const now = new Date();
  return String(now.getHours()).padStart(2, "0");
}

// 获取当前分钟的格式化字符串 (MM)
function getCurrentMinute(): string {
  const now = new Date();
  return String(now.getMinutes()).padStart(2, "0");
}

export default function HomePage() {
  const router = useRouter();
  const [date, setDate] = useState(getCurrentDate());
  const [hour, setHour] = useState(getCurrentHour());
  const [minute, setMinute] = useState(getCurrentMinute());
  const [dateInfo, setDateInfo] = useState<DateInfo | null>(null);
  const isRestoringPaipanRef = useRef(false); // 使用 ref 来跟踪是否正在恢复盘面数据，避免触发重新渲染
  const [isRestoringPaipan, setIsRestoringPaipan] = useState(false); // 用于阻止子组件的自动更新
  const [restoreKey, setRestoreKey] = useState(0); // 用于强制重新渲染日期和时间选择器
  const [paipanResult, setPaipanResult] = useState<PaipanResult | null>(null);
  const [dipangan, setDipangan] = useState<Record<number, string> | null>(null);
  const [tianpangan, setTianpangan] = useState<Record<number, string> | null>(null);
  const [dibashen, setDibashen] = useState<Record<number, string> | null>(null);
  const [tianbashen, setTianbashen] = useState<Record<number, string> | null>(null);
  const [jiuxing, setJiuxing] = useState<Record<number, string> | null>(null);
  const [bamen, setBamen] = useState<Record<number, string> | null>(null);
  const [zhiShiDoor, setZhiShiDoor] = useState<string>("");
  const [zhiFuPalace, setZhiFuPalace] = useState<number | null>(null);
  const [kongwang, setKongwang] = useState<Record<number, boolean> | null>(null);
  const [yima, setYima] = useState<Record<number, boolean> | null>(null);
  const [jigong, setJigong] = useState<Record<number, { diGan?: string; tianGan?: string }> | null>(null);
  const [loading, setLoading] = useState(false);
  const [isQipanExpanded, setIsQipanExpanded] = useState(false);
  const [isPaipanExpanded, setIsPaipanExpanded] = useState(true);
  const [question, setQuestion] = useState<string>("");
  const questionInputRef = useRef<any>(null); // 问事输入框的引用
  const [aiKanpanResult, setAiKanpanResult] = useState<string | null>(null);
  const [aiKanpanLoading, setAiKanpanLoading] = useState(false);
  const [promptWenshiResult, setPromptWenshiResult] = useState<any>(null);
  
  // 对话和记录相关状态
  const [conversations, setConversations] = useState<any[]>([]);
  const [selectedConversationId, setSelectedConversationId] = useState<number | null>(null);
  const [conversationRecords, setConversationRecords] = useState<any[]>([]);
  const [currentPanId, setCurrentPanId] = useState<number | null>(null);
  const [currentPanUid, setCurrentPanUid] = useState<string | null>(null);
  const [currentConversationId, setCurrentConversationId] = useState<number | null>(null);
  const [currentQuestion, setCurrentQuestion] = useState<string>(""); // 保存当前问事的原始文本
  const [conversationPage, setConversationPage] = useState<number>(1); // 对话列表当前页码
  const CONVERSATIONS_PER_PAGE = 7; // 每页显示7条对话记录
  const [sceneCode, setSceneCode] = useState<string>("flow.qmdj.kanpan.default"); // 场景代码，默认选择"综合"
  const [editingConversationId, setEditingConversationId] = useState<number | null>(null); // 正在编辑的对话ID
  const [editingTitle, setEditingTitle] = useState<string>(""); // 正在编辑的标题
  const [isLoggedIn, setIsLoggedIn] = useState<boolean>(false); // 用户登录状态
  const [loadingMessageIndex, setLoadingMessageIndex] = useState<number>(0); // 加载提示语索引
  const [showFavoritesOnly, setShowFavoritesOnly] = useState<boolean>(false); // 是否只显示收藏的对话
  const [favoriteConversationIds, setFavoriteConversationIds] = useState<Set<number>>(new Set()); // 收藏的对话ID集合
  
  // AI分析时的轮播提示语
  const loadingMessages = [
    "我正在认真整理你的情况，请稍等片刻。",
    "我在这里，正在为你梳理关键点。",
    "先深呼吸一下，我正在把信息理清，马上给你更清晰的方向。",
    "我正在仔细分析，不会敷衍你。",
    "你的问题很重要，我正在认真看，马上回复你。",
    "我正在把你的感受与重点逐一整理，请稍等。",
    "我在思考最适合你的建议，马上就好。",
  ];

  // 从日期字符串解析年月日（使用 useMemo 而不是状态）
  const dateParts = date ? date.split("-") : null;
  const year = dateParts && dateParts.length === 3 ? dateParts[0] : "";
  const month = dateParts && dateParts.length === 3 ? dateParts[1] : "";
  const day = dateParts && dateParts.length === 3 ? dateParts[2] : "";

  // 当日期和小时都选择后，自动获取日期信息
  useEffect(() => {
    // 如果正在恢复盘面数据，不自动获取日期信息
    if (isRestoringPaipanRef.current) {
      return;
    }

    if (!date || !hour) return;

    const parts = date.split("-");
    if (parts.length !== 3) return;
    const [yearStr, monthStr, dayStr] = parts;
    if (!yearStr || !monthStr || !dayStr) return;

    const yearNum = parseInt(yearStr, 10);
    const monthNum = parseInt(monthStr, 10);
    const dayNum = parseInt(dayStr, 10);
    const hourNum = parseInt(hour, 10);

    if (Number.isNaN(yearNum) || Number.isNaN(monthNum) || Number.isNaN(dayNum) || Number.isNaN(hourNum)) {
      return;
    }

    // 创建 AbortController 来管理请求
    const abortController = new AbortController();
    const signal = abortController.signal;

    const fetchDateInfo = async () => {
      try {
        setLoading(true);

        const [nongliRes, yinyangdunRes] = await Promise.all([
          fetch("/api/nongli", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              year: yearNum,
              month: monthNum,
              day: dayNum,
            }),
            signal, // 添加 signal 以支持取消
          }),
          fetch("/api/yinyangdun", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ date, time: `${hour}:00` }),
            signal, // 添加 signal 以支持取消
          }),
        ]);

        // 检查请求是否已被取消
        if (signal.aborted) return;

        // 检查响应是否有效
        if (!nongliRes.ok) {
          const errorText = await nongliRes.text().catch(() => "未知错误");
          throw new Error(`获取农历信息失败: ${nongliRes.status} ${errorText}`);
        }

        // 解析 JSON 响应，添加错误处理
        let nongliData;
        try {
          const nongliText = await nongliRes.text();
          if (!nongliText || nongliText.trim().length === 0) {
            throw new Error("农历 API 返回空响应");
          }
          nongliData = JSON.parse(nongliText);
        } catch (parseError: any) {
          console.error("解析农历数据失败:", parseError);
          // 如果是请求被取消，直接返回
          if (signal.aborted) return;
          throw new Error(`农历 API 返回格式错误: ${parseError.message || "无法解析 JSON"}`);
        }

        const shijieRes = await fetch("/api/shijie", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            date,
            time: `${hour}:00`,
            lunarYear: nongliData.lunar?.year,
            lunarMonth: nongliData.lunar?.month || nongliData.lunar?.monthAlias,
            lunarDay: nongliData.lunar?.day,
          }),
          signal, // 添加 signal 以支持取消
        });

        // 检查请求是否已被取消
        if (signal.aborted) return;

        // 检查请求是否已被取消
        if (signal.aborted) return;

        // 解析 shijie 响应
        if (!shijieRes.ok) {
          const errorText = await shijieRes.text().catch(() => "未知错误");
          throw new Error(`获取时节信息失败: ${shijieRes.status} ${errorText}`);
        }
        let shijieData;
        try {
          const shijieText = await shijieRes.text();
          if (!shijieText || shijieText.trim().length === 0) {
            throw new Error("时节 API 返回空响应");
          }
          shijieData = JSON.parse(shijieText);
        } catch (parseError: any) {
          console.error("解析时节数据失败:", parseError);
          if (signal.aborted) return;
          throw new Error(`时节 API 返回格式错误: ${parseError.message || "无法解析 JSON"}`);
        }

        // 检查请求是否已被取消
        if (signal.aborted) return;

        // 解析 yinyangdun 响应
        if (!yinyangdunRes.ok) {
          const errorText = await yinyangdunRes.text().catch(() => "未知错误");
          throw new Error(`获取阴阳遁信息失败: ${yinyangdunRes.status} ${errorText}`);
        }
        let yinyangdunData;
        try {
          const yinyangdunText = await yinyangdunRes.text();
          if (!yinyangdunText || yinyangdunText.trim().length === 0) {
            throw new Error("阴阳遁 API 返回空响应");
          }
          yinyangdunData = JSON.parse(yinyangdunText);
        } catch (parseError: any) {
          console.error("解析阴阳遁数据失败:", parseError);
          if (signal.aborted) return;
          throw new Error(`阴阳遁 API 返回格式错误: ${parseError.message || "无法解析 JSON"}`);
        }

        // 再次检查请求是否已被取消
        if (signal.aborted) return;

        const pillars = getFourPillars(yearNum, monthNum, dayNum, hourNum);

        setDateInfo({
          gregorian: date,
          lunar: nongliData.lunar?.display || "",
          season: shijieData.shijie || "",
          startShijie: shijieData.startShijie || shijieData.shijie || "",
          endShijie: shijieData.endShijie || "",
          fourPillars: pillars,
          dunType: yinyangdunData.dunType || "",
          ju: yinyangdunData.ju || 0,
        });
      } catch (error: any) {
        // 忽略因请求取消导致的错误
        if (error.name === "AbortError") {
          console.log("请求已取消");
          return;
        }
        console.error("获取日期信息失败:", error);
      } finally {
        // 只有在请求未被取消时才更新 loading 状态
        if (!signal.aborted) {
          setLoading(false);
        }
      }
    };

    fetchDateInfo();

    // 清理函数：当组件卸载或依赖项变化时，取消正在进行的请求
    return () => {
      abortController.abort();
    };
  }, [date, hour]);

  // 排盘（不需要登录）
  const handlePaipan = async () => {
    if (!date || !hour || !dateInfo) {
      alert("请先选择日期和小时");
      return;
    }

    try {
      setLoading(true);
      // 排地盘干
      const dipanganResponse = await fetch("/api/dipangan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          dunType: dateInfo.dunType,
          ju: dateInfo.ju,
        }),
      });

      if (!dipanganResponse.ok) {
        const err = await dipanganResponse.json().catch(() => ({}));
        throw new Error(err.error || "排地盘干失败");
      }

      const dipanganData = await dipanganResponse.json();
      const dipanganMap: Record<number, string> = dipanganData.dipangan || {};
      setDipangan(dipanganMap);

      // 排天盘干
      const tianpanganResponse = await fetch("/api/tianpangan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          dunType: dateInfo.dunType,
          hourPillar: dateInfo.fourPillars.hour,
          dipangan: dipanganMap,
        }),
      });

      if (!tianpanganResponse.ok) {
        const err = await tianpanganResponse.json().catch(() => ({}));
        throw new Error(err.error || "排天盘干失败");
      }

      const tianpanganData = await tianpanganResponse.json();
      const tianpanganMap: Record<number, string> = tianpanganData.tianpangan || {};
      setTianpangan(tianpanganMap);

      // 排地八神
      const dibashenResponse = await fetch("/api/dibashen", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          dunType: dateInfo.dunType,
          hourPillar: dateInfo.fourPillars.hour,
          dipangan: dipanganMap,
        }),
      });

      if (!dibashenResponse.ok) {
        const err = await dibashenResponse.json().catch(() => ({}));
        throw new Error(err.error || "排地八神失败");
      }

      const dibashenData = await dibashenResponse.json();
      const dibashenMap: Record<number, string> = dibashenData.dibashen || {};
      setDibashen(dibashenMap);
      
      // 从地八神中找到值符所在的宫位
      let zhiFuPalaceFound: number | null = null;
      for (const [key, value] of Object.entries(dibashenMap)) {
        const palace = Number(key);
        if (!Number.isNaN(palace) && value === "值符") {
          zhiFuPalaceFound = palace;
          break;
        }
      }
      setZhiFuPalace(zhiFuPalaceFound);

      // 排天八神
      const tianbashenResponse = await fetch("/api/tianbashen", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          dunType: dateInfo.dunType,
          hourPillar: dateInfo.fourPillars.hour,
          tianpangan: tianpanganMap,
        }),
      });

      if (!tianbashenResponse.ok) {
        const err = await tianbashenResponse.json().catch(() => ({}));
        throw new Error(err.error || "排天八神失败");
      }

      const tianbashenData = await tianbashenResponse.json();
      const tianbashenMap: Record<number, string> = tianbashenData.tianbashen || {};
      setTianbashen(tianbashenMap);

      // 排九星
      const jiuxingResponse = await fetch("/api/jiuxing", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          dunType: dateInfo.dunType,
          dibashen: dibashenMap,
          tianbashen: tianbashenMap,
        }),
      });

      if (!jiuxingResponse.ok) {
        const err = await jiuxingResponse.json().catch(() => ({}));
        throw new Error(err.error || "排九星失败");
      }

      const jiuxingData = await jiuxingResponse.json();
      const jiuxingMap: Record<number, string> = jiuxingData.jiuxing || {};
      setJiuxing(jiuxingMap);

      // 排八门
      const bamenResponse = await fetch("/api/bamen", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          dunType: dateInfo.dunType,
          hourPillar: dateInfo.fourPillars.hour,
          dibashen: dibashenMap,
        }),
      });

      if (!bamenResponse.ok) {
        const err = await bamenResponse.json().catch(() => ({}));
        throw new Error(err.error || "排八门失败");
      }

      const bamenData = await bamenResponse.json();
      const bamenMap: Record<number, string> = bamenData.bamen || {};
      setBamen(bamenMap);
      setZhiShiDoor(bamenData.zhiShiDoor || "");

      // 排空亡
      const kongwangResponse = await fetch("/api/kongwang", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          hourPillar: dateInfo.fourPillars.hour,
        }),
      });

      if (!kongwangResponse.ok) {
        const err = await kongwangResponse.json().catch(() => ({}));
        throw new Error(err.error || "排空亡失败");
      }

      const kongwangData = await kongwangResponse.json();
      const kongwangMap: Record<number, boolean> = kongwangData.kongwang || {};
      setKongwang(kongwangMap);

      // 排驿马
      const yimaResponse = await fetch("/api/yima", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          hourPillar: dateInfo.fourPillars.hour,
        }),
      });

      if (!yimaResponse.ok) {
        const err = await yimaResponse.json().catch(() => ({}));
        throw new Error(err.error || "排驿马失败");
      }

      const yimaData = await yimaResponse.json();
      const yimaMap: Record<number, boolean> = yimaData.yima || {};
      setYima(yimaMap);

      // 排寄宫
      const jigongResponse = await fetch("/api/jigong", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          dipangan: dipanganMap,
          tianpangan: tianpanganMap,
          jiuxing: jiuxingMap,
        }),
      });

      if (!jigongResponse.ok) {
        const err = await jigongResponse.json().catch(() => ({}));
        throw new Error(err.error || "排寄宫失败");
      }

      const jigongData = await jigongResponse.json();
      const jigongMap: Record<number, { diGan?: string; tianGan?: string }> = jigongData.jigong || {};
      setJigong(jigongMap);

      const grid = DISPLAY_ORDER.map((palaceNo) => {
        const diGan = dipanganMap[palaceNo] || "";
        const tianGan = tianpanganMap[palaceNo] || "";
        const diShen = dibashenMap[palaceNo] || "";
        const tianShen = tianbashenMap[palaceNo] || "";
        const star = jiuxingMap[palaceNo] || "";
        const door = bamenMap[palaceNo] || "";
        const kongWang = kongwangMap[palaceNo] || false;
        const yiMa = yimaMap[palaceNo] || false;
        const jiGongInfo = jigongMap[palaceNo] || null;
        const parts: string[] = [];
        if (diGan) parts.push(`地盘干：${diGan}`);
        if (tianGan) parts.push(`天盘干：${tianGan}`);
        if (diShen) parts.push(`地八神：${diShen}`);
        if (tianShen) parts.push(`天八神：${tianShen}`);
        if (star) parts.push(`九星：${star}`);
        if (door) parts.push(`八门：${door}`);
        return {
          id: palaceNo,
          name: ``, // 宫位名称
          diGan,
          tianGan,
          diShen,
          tianShen,
          star,
          door,
          kongWang,
          yiMa,
          jiGong: jiGongInfo,
          content: parts.join(" · ") || "暂无排盘数据",
        };
      });

      setPaipanResult({ grid });

      // 保存排盘结果到数据库（可选，如果用户已登录则保存）
      let savedPanId: number | null = null;
      let savedPanUid: string | null = null;
      try {
        // 检查用户是否登录，如果登录了则保存排盘结果
        const userCheckResponse = await fetch("/api/user/me");
        if (userCheckResponse.ok) {
          const saveResponse = await fetch("/api/qimen_pan", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              date,
              hour,
              minute,
              dateInfo,
              dipangan: dipanganMap,
              tianpangan: tianpanganMap,
              dibashen: dibashenMap,
              tianbashen: tianbashenMap,
              jiuxing: jiuxingMap,
              bamen: bamenMap,
              kongwang: kongwangMap,
              yima: yimaMap,
              jigong: jigongMap,
              zhiShiDoor,
              zhiFuPalace: zhiFuPalaceFound,
            }),
          });

          if (saveResponse.ok) {
            const saveData = await saveResponse.json();
            savedPanId = saveData.id;
            savedPanUid = saveData.uid;
            setCurrentPanId(saveData.id);
            setCurrentPanUid(saveData.uid);
            console.log("排盘结果已保存:", saveData);
          } else {
            const err = await saveResponse.json().catch(() => ({}));
            console.warn("保存排盘结果失败:", err.error || "未知错误");
            // 不阻止用户查看排盘结果，仅记录警告
          }
        } else {
          // 用户未登录，不保存排盘结果，但允许继续查看排盘结果
          console.log("用户未登录，排盘结果不保存到数据库");
        }
      } catch (saveError: any) {
        console.warn("保存排盘结果时出错:", saveError);
        // 不阻止用户查看排盘结果，仅记录警告
      }
    } catch (error: any) {
      console.error("排盘失败:", error);
      alert(error.message || "排盘失败，请重试");
    } finally {
      setLoading(false);
    }
  };

  // 看盘（包含AI分析和保存）
  const handleKanpan = async () => {
    if (!paipanResult || !dateInfo) {
      alert("请先进行排盘");
      return;
    }

    if (!question || question.trim().length === 0) {
      alert("请输入问事内容");
      return;
    }

    // 检查用户是否登录
    try {
      const userCheckResponse = await fetch("/api/user/me");
      if (!userCheckResponse.ok) {
        router.push("/login");
        return;
      }
    } catch (error) {
      console.error("检查登录状态失败:", error);
      router.push("/login");
      return;
    }

    try {
      setAiKanpanLoading(true);
      setAiKanpanResult(null);

      // 调用问事提炼 API
      let refinedQuestionData: any = null;
      let refinedQuestion: string = question;
      try {
        console.log("=== 开始问事提炼 ===");
        const promptWenshiResponse = await fetch("/api/prompt_wenshi", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ text: question }),
        });

        if (promptWenshiResponse.ok) {
          const promptWenshiData = await promptWenshiResponse.json();
          if (promptWenshiData.success && promptWenshiData.data) {
            setPromptWenshiResult(promptWenshiData.data);
            refinedQuestionData = promptWenshiData.data;
            refinedQuestion = JSON.stringify(promptWenshiData.data, null, 2);
            console.log("=== 问事提炼成功 ===");
          }
        }
      } catch (promptWenshiError: any) {
        console.warn("问事提炼时出错:", promptWenshiError);
      }

      // 调用看盘 API
      const kanpanResponse = await fetch("/api/kanpan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          question: refinedQuestionData || refinedQuestion,
          dateInfo,
          paipanResult,
          dipangan: dipangan || {},
          tianpangan: tianpangan || {},
          dibashen: dibashen || {},
          tianbashen: tianbashen || {},
          jiuxing: jiuxing || {},
          bamen: bamen || {},
          kongwang: kongwang || {},
          yima: yima || {},
          jigong: jigong || {},
          zhiShiDoor,
          zhiFuPalace,
          sceneCode: sceneCode, // 传递场景代码
        }),
      });

      // 保存当前问事的原始文本
      const originalQuestionText = question;
      setCurrentQuestion(originalQuestionText);

      let aiAnalysisResult: string = "";
      if (kanpanResponse.ok) {
        const kanpanData = await kanpanResponse.json();
        if (kanpanData.success) {
          aiAnalysisResult = kanpanData.result || "无法生成分析结果";
          setAiKanpanResult(aiAnalysisResult);
        } else {
          aiAnalysisResult = `AI看盘失败：${kanpanData.error || "未知错误"}`;
          setAiKanpanResult(aiAnalysisResult);
        }
      } else {
        const err = await kanpanResponse.json().catch(() => ({}));
        aiAnalysisResult = `AI看盘失败：${err.error || "未知错误"}`;
        setAiKanpanResult(aiAnalysisResult);
      }

      // 保存到数据库
      try {
        const saveResponse = await fetch("/api/conversations", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            pan_id: currentPanId,
            pan_uid: currentPanUid,
            original_question: question,
            refined_question_json: refinedQuestionData,
            question_category_code: refinedQuestionData?.category_code || null,
            question_subcategory_code: refinedQuestionData?.subcategory_code || null,
            ai_analysis: aiAnalysisResult,
            ai_analysis_metadata: {
              timestamp: new Date().toISOString(),
            },
            conversation_id: currentConversationId, // 如果已有对话，在同一对话中添加
            project_code: "qmdj",
          }),
        });

        if (saveResponse.ok) {
          const saveData = await saveResponse.json();
          console.log("对话记录已保存:", saveData);
          
          // 更新当前对话ID（如果是新对话）
          if (!currentConversationId && saveData.conversation?.id) {
            setCurrentConversationId(saveData.conversation.id);
          }

          // 刷新对话列表和记录
          await loadConversations();
          const finalConversationId = currentConversationId || saveData.conversation?.id;
          if (finalConversationId) {
            setCurrentConversationId(finalConversationId);
            setSelectedConversationId(finalConversationId);
            // 加载记录后，清空当前显示的结果（因为已经保存到记录中了）
            await loadConversationRecords(finalConversationId);
            // 延迟清空当前结果，让用户看到保存成功后再更新显示
            setTimeout(() => {
              setAiKanpanResult(null);
              setCurrentQuestion("");
            }, 500);
          }
        } else {
          const err = await saveResponse.json().catch(() => ({}));
          console.warn("保存对话记录失败:", err.error || "未知错误");
        }
      } catch (saveError: any) {
        console.warn("保存对话记录时出错:", saveError);
      }

      // 清空问事文本框
      setQuestion("");
    } catch (kanpanError: any) {
      console.error("看盘失败:", kanpanError);
      setAiKanpanResult(`看盘失败：${kanpanError.message || "请重试"}`);
    } finally {
      setAiKanpanLoading(false);
    }
  };

  // 加载对话列表
  const loadConversations = async () => {
    try {
      const url = showFavoritesOnly 
        ? "/api/conversations?project_code=qmdj&favorites_only=true"
        : "/api/conversations?project_code=qmdj";
      const response = await fetch(url);
      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          const newConversations = data.conversations || [];
          setConversations(newConversations);
          // 如果当前页没有数据了，重置到第一页
          const totalPages = Math.ceil(newConversations.length / CONVERSATIONS_PER_PAGE);
          if (conversationPage > totalPages && totalPages > 0) {
            setConversationPage(1);
          }
        }
      }
    } catch (error) {
      console.error("加载对话列表失败:", error);
    }
  };

  // 加载收藏状态
  const loadFavoriteStatus = async () => {
    try {
      const response = await fetch("/api/conversations/favorites");
      if (response.ok) {
        const data = await response.json();
        if (data.success && data.favorite_ids) {
          setFavoriteConversationIds(new Set(data.favorite_ids));
        }
      }
    } catch (error) {
      console.error("加载收藏状态失败:", error);
    }
  };

  // 加载对话记录
  const loadConversationRecords = async (convId: number) => {
    try {
      const response = await fetch(`/api/conversations?conversation_id=${convId}`);
      if (response.ok) {
        const data = await response.json();
        if (data.success && data.conversation) {
          setConversationRecords(data.conversation.records || []);
          setSelectedConversationId(convId);
          // 返回对话数据，包含 pan_id 和 pan_uid
          return data.conversation;
        }
      }
    } catch (error) {
      console.error("加载对话记录失败:", error);
    }
    return null;
  };

  // 从 pan_json 解析并回显盘面数据
  const restorePaipanFromJson = (panJson: any) => {
    try {
      // 先设置标志，阻止自动获取日期信息和子组件的自动更新
      isRestoringPaipanRef.current = true;
      setIsRestoringPaipan(true);
      
      // 解析 dateInfo
      if (panJson.input?.calendar) {
        const calendar = panJson.input.calendar;
        const gregorianTime = calendar.gregorian || "";
        
        // 解析日期时间：格式可能是 "2024-01-01 12:00:00" 或 "2024-01-01T12:00:00"
        let dateStr = "";
        let timeStr = "";
        
        if (gregorianTime) {
          if (gregorianTime.includes("T")) {
            // ISO 格式：2024-01-01T12:00:00
            const parts = gregorianTime.split("T");
            dateStr = parts[0] || "";
            timeStr = parts[1] || "";
            // 移除时区信息（如果有）
            if (timeStr) {
              timeStr = timeStr.split("+")[0].split("Z")[0];
            }
          } else if (gregorianTime.includes(" ")) {
            // 空格分隔格式：2024-01-01 12:00:00
            const parts = gregorianTime.split(" ");
            dateStr = parts[0] || "";
            timeStr = parts[1] || "";
          } else {
            // 只有日期
            dateStr = gregorianTime;
          }
        }
        
        // 构建 dateInfo（先构建，避免依赖 useEffect）
        const dunInfo = panJson.input.dun || {};
        const dateInfoData: DateInfo = {
          gregorian: calendar.gregorian || "",
          lunar: calendar.lunar || "",
          season: calendar.jieqi || "",
          fourPillars: {
            year: calendar.yearGanzhi || "",
            month: calendar.monthGanzhi || "",
            day: calendar.dayGanzhi || "",
            hour: calendar.hourGanzhi || "",
          },
          dunType: dunInfo.yinYang === "yang" ? "阳遁" : "阴遁",
          ju: dunInfo.juNumber || 0,
        };
        
        // 解析日期和时间字符串
        let formattedDate = date;
        let hourStr = hour;
        let minuteStr = minute;
        
        if (dateStr) {
          const dateParts = dateStr.split("-");
          if (dateParts.length >= 3) {
            const year = dateParts[0]?.trim() || "";
            const month = dateParts[1]?.trim() || "";
            const day = dateParts[2]?.trim() || "";
            
            if (year && month && day) {
              // 确保日期格式正确：YYYY-MM-DD（补零）
              formattedDate = `${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`;
            }
          }
        }
        
        if (timeStr) {
          // 解析时间：格式可能是 "12:00:00" 或 "12:00"
          const timeParts = timeStr.split(":");
          if (timeParts.length >= 2) {
            const hourRaw = timeParts[0]?.trim() || "0";
            const minuteRaw = timeParts[1]?.trim() || "0";
            
            // 确保时间格式正确：HH 和 MM（补零）
            hourStr = hourRaw.padStart(2, "0");
            minuteStr = minuteRaw.padStart(2, "0");
            
            // 验证范围
            const hourNum = parseInt(hourStr, 10);
            const minuteNum = parseInt(minuteStr, 10);
            
            if (!(hourNum >= 0 && hourNum <= 23 && minuteNum >= 0 && minuteNum <= 59)) {
              console.warn("时间范围无效:", hourStr, minuteStr);
              hourStr = "00";
              minuteStr = "00";
            }
          } else {
            console.warn("时间格式不正确:", timeStr);
            hourStr = "00";
            minuteStr = "00";
          }
        } else {
          console.warn("没有时间信息，使用默认值");
          hourStr = "00";
          minuteStr = "00";
        }
        
        // 先设置 dateInfo（不触发 useEffect，因为 useEffect 只依赖 date 和 hour）
        setDateInfo(dateInfoData);
        
        // 检查是否需要更新日期和时间（避免不必要的状态更新）
        const needUpdateDate = formattedDate !== date;
        const needUpdateHour = hourStr !== hour;
        const needUpdateMinute = minuteStr !== minute;
        
        // 只有在值真正改变时才更新，避免触发不必要的 useEffect
        if (needUpdateDate || needUpdateHour || needUpdateMinute) {
          // 使用 requestAnimationFrame 确保在下一个渲染周期更新
          // 这样可以确保 isRestoringPaipanRef.current 已经设置为 true
          requestAnimationFrame(() => {
            // 批量更新日期和时间状态
            if (needUpdateDate) {
              setDate(formattedDate);
            }
            if (needUpdateHour) {
              setHour(hourStr);
            }
            if (needUpdateMinute) {
              setMinute(minuteStr);
            }
            
            // 更新 key 以强制重新渲染日期和时间选择器
            // 这样可以避免它们内部的 useEffect 被触发
            setRestoreKey(prev => prev + 1);
            
            // 延迟重置标志，确保所有 useEffect 检查都完成
            // 使用较长的延迟，确保所有相关的 useEffect 都能检查到标志
            setTimeout(() => {
              isRestoringPaipanRef.current = false;
              setIsRestoringPaipan(false);
            }, 500);
          });
        } else {
          // 如果不需要更新，直接重置标志
          isRestoringPaipanRef.current = false;
          setIsRestoringPaipan(false);
        }
      }

      // 解析盘面数据
      if (panJson.chart?.palaces) {
        const palaces = panJson.chart.palaces;
        // 宫位编号到 palaceId 的映射（palaceId 格式为 "row-col"）
        // 根据 PALACE_TO_ROW_COL 映射：{4: {row:1, col:1}, 9: {row:1, col:2}, ...}
        const palaceIdToNo: Record<string, number> = {
          "1-1": 4, "1-2": 9, "1-3": 2,
          "2-1": 3, "2-2": 5, "2-3": 7,
          "3-1": 8, "3-2": 1, "3-3": 6,
        };

        const dipanganMap: Record<number, string> = {};
        const tianpanganMap: Record<number, string> = {};
        const dibashenMap: Record<number, string> = {};
        const tianbashenMap: Record<number, string> = {};
        const jiuxingMap: Record<number, string> = {};
        const bamenMap: Record<number, string> = {};
        const kongwangMap: Record<number, boolean> = {};
        const yimaMap: Record<number, boolean> = {};
        const jigongMap: Record<number, { diGan?: string; tianGan?: string }> = {};

        palaces.forEach((palace: any) => {
          const palaceNo = palaceIdToNo[palace.palaceId];
          if (palaceNo) {
            if (palace.earthPlateStem) dipanganMap[palaceNo] = palace.earthPlateStem;
            if (palace.heavenPlateStem) tianpanganMap[palaceNo] = palace.heavenPlateStem;
            if (palace.star) {
              // 移除"星"字
              jiuxingMap[palaceNo] = palace.star.replace("星", "");
            }
            if (palace.door) {
              // 移除"门"字
              bamenMap[palaceNo] = palace.door.replace("门", "");
            }
            if (palace.deity) {
              // 判断是天八神还是地八神（这里简化处理，优先使用天八神）
              tianbashenMap[palaceNo] = palace.deity;
            }
            if (palace.isVoid) kongwangMap[palaceNo] = true;
            if (palace.isHorse) yimaMap[palaceNo] = true;
            if (palace.hiddenStems && palace.hiddenStems.length > 0) {
              jigongMap[palaceNo] = {
                diGan: palace.hiddenStems[0] || undefined,
                tianGan: palace.hiddenStems[1] || undefined,
              };
            }
          }
        });

        setDipangan(dipanganMap);
        setTianpangan(tianpanganMap);
        setDibashen(dibashenMap);
        setTianbashen(tianbashenMap);
        setJiuxing(jiuxingMap);
        setBamen(bamenMap);
        setKongwang(kongwangMap);
        setYima(yimaMap);
        setJigong(jigongMap);

        // 解析值符位置
        if (panJson.chart.specialPositions?.zhiFu) {
          const zhiFuPalaceId = panJson.chart.specialPositions.zhiFu.palaceId;
          const zhiFuPalaceNo = palaceIdToNo[zhiFuPalaceId];
          if (zhiFuPalaceNo) {
            setZhiFuPalace(zhiFuPalaceNo);
          }
        }

        // 构建 grid 数据用于显示
        const DISPLAY_ORDER = [4, 9, 2, 3, 5, 7, 8, 1, 6];
        const grid = DISPLAY_ORDER.map((palaceNo) => {
          const diGan = dipanganMap[palaceNo] || "";
          const tianGan = tianpanganMap[palaceNo] || "";
          return {
            palaceNo,
            diGan,
            tianGan,
          };
        });
        setPaipanResult({ grid });
      }
      
      // 注意：标志的重置已经在日期时间设置的回调中处理
    } catch (error) {
      console.error("解析盘面数据失败:", error);
      // 即使出错也要重置标志
      isRestoringPaipanRef.current = false;
      setIsRestoringPaipan(false);
    }
  };

  // 选择对话
  const handleSelectConversation = async (convId: number) => {
    setSelectedConversationId(convId);
    setCurrentConversationId(convId);
    const conversation = await loadConversationRecords(convId);
    
    // 如果对话有 pan_id 或 pan_uid，获取盘面数据并回显
    if (conversation && (conversation.pan_id || conversation.pan_uid)) {
      try {
        // 通过 API 获取盘面数据
        const panId = conversation.pan_id;
        const panUid = conversation.pan_uid;
        
        // 查询数据库获取 pan_json
        const response = await fetch(`/api/qimen_pan?pan_id=${panId || ""}&pan_uid=${panUid || ""}`);
        if (response.ok) {
          const data = await response.json();
          if (data.success && data.pan_json) {
            // 解析并回显盘面数据
            restorePaipanFromJson(data.pan_json);
          }
        }
      } catch (error) {
        console.error("获取盘面数据失败:", error);
      }
    }
  };

  // 创建新对话
  const handleNewConversation = () => {
    setCurrentConversationId(null);
    setSelectedConversationId(null);
    setConversationRecords([]);
    setAiKanpanResult(null);
    setCurrentQuestion("");
    
    // 将焦点转移到问事输入框
    // 使用 setTimeout 确保状态更新完成后再设置焦点
    setTimeout(() => {
      if (questionInputRef.current) {
        // Ant Design Input 组件的 ref 需要通过 input 属性访问原生 input 元素
        const inputElement = questionInputRef.current?.input || questionInputRef.current;
        if (inputElement) {
          inputElement.focus();
        }
      }
    }, 100);
  };

  // 开始编辑对话标题（重命名）
  const handleStartEditTitle = (convId: number, currentTitle: string) => {
    setEditingConversationId(convId);
    setEditingTitle(currentTitle || "");
  };

  // 收藏/取消收藏对话
  const handleToggleFavorite = async (convId: number) => {
    try {
      const isFavorite = favoriteConversationIds.has(convId);
      const response = await fetch("/api/conversations/favorites", {
        method: isFavorite ? "DELETE" : "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          conversation_id: convId,
        }),
      });

      const data = await response.json();
      if (data.success) {
        // 更新本地收藏状态
        setFavoriteConversationIds((prev) => {
          const newSet = new Set(prev);
          if (isFavorite) {
            newSet.delete(convId);
          } else {
            newSet.add(convId);
          }
          return newSet;
        });
        // 如果当前只显示收藏的对话，且取消了收藏，需要重新加载列表
        if (showFavoritesOnly && isFavorite) {
          await loadConversations();
        }
      } else {
        alert(data.error || "操作失败");
      }
    } catch (error) {
      console.error("收藏/取消收藏失败:", error);
      alert("操作失败，请重试");
    }
  };

  // 处理菜单项点击
  const handleMenuClick = (key: string, convId: number, convTitle: string) => {
    switch (key) {
      case "rename":
        handleStartEditTitle(convId, convTitle);
        break;
      case "favorite":
        handleToggleFavorite(convId);
        break;
      case "delete":
        if (confirm("确定要删除这个对话吗？此操作不可恢复。")) {
          handleDeleteConversation(convId);
        }
        break;
    }
  };

  // 删除对话
  const handleDeleteConversation = async (convId: number) => {
    try {
      const response = await fetch(`/api/conversations?conversation_id=${convId}`, {
        method: "DELETE",
      });

      const data = await response.json();
      if (data.success) {
        // 更新本地列表
        setConversations((prev) => prev.filter((conv: any) => conv.id !== convId));
        if (selectedConversationId === convId) {
          setSelectedConversationId(null);
          setCurrentConversationId(null);
          setConversationRecords([]);
        }
      } else {
        alert(data.error || "删除失败");
      }
    } catch (error) {
      console.error("删除对话失败:", error);
      alert("删除失败，请重试");
    }
  };

  // 取消编辑
  const handleCancelEditTitle = () => {
    setEditingConversationId(null);
    setEditingTitle("");
  };

  // 保存编辑的标题
  const handleSaveTitle = async (convId: number) => {
    const trimmedTitle = editingTitle.trim();
    if (!trimmedTitle) {
      alert("标题不能为空");
      return;
    }

    try {
      const response = await fetch("/api/conversations", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          conversation_id: convId,
          title: trimmedTitle,
        }),
      });

      const data = await response.json();
      if (data.success) {
        // 更新本地对话列表
        setConversations((prev) =>
          prev.map((conv: any) =>
            conv.id === convId
              ? { ...conv, title: trimmedTitle }
              : conv
          )
        );
        // 关闭编辑模式
        setEditingConversationId(null);
        setEditingTitle("");
      } else {
        alert(data.error || "保存失败");
      }
    } catch (error) {
      console.error("保存标题失败:", error);
      alert("保存失败，请重试");
    }
  };

  // 检查用户登录状态
  const checkLoginStatus = async () => {
    try {
      const response = await fetch("/api/user/me");
      setIsLoggedIn(response.ok);
    } catch (error) {
      setIsLoggedIn(false);
    }
  };

  // 组件加载时获取对话列表和检查登录状态
  useEffect(() => {
    loadConversations();
    checkLoginStatus();
    loadFavoriteStatus();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // 当 showFavoritesOnly 改变时重新加载对话列表
  useEffect(() => {
    if (isLoggedIn) {
      // 切换过滤模式时重置到第一页
      setConversationPage(1);
      loadConversations();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showFavoritesOnly]);

  // 监听页面可见性变化，当页面重新可见时检查登录状态（用于登录后返回页面时更新状态）
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        checkLoginStatus();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, []);

  // AI分析时轮播提示语
  useEffect(() => {
    if (!aiKanpanLoading) {
      setLoadingMessageIndex(0);
      return;
    }

    const interval = setInterval(() => {
      setLoadingMessageIndex((prev) => (prev + 1) % loadingMessages.length);
    }, 5000); // 每2秒切换一次

    return () => clearInterval(interval);
  }, [aiKanpanLoading, loadingMessages.length]);

  const displayOrder = DISPLAY_ORDER;

  return (
    <ConfigProvider locale={zhCN}>
      <Layout>
        <div className="min-h-screen bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* 日期选择框和小时选择框 */}
          <div className="bg-white rounded-lg shadow-md p-6 mb-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <DateSelector
                key={`date-${restoreKey}`}
                value={date}
                onChange={(newDate) => {
                  // 如果正在恢复盘面数据，阻止更新
                  if (!isRestoringPaipan) {
                    setDate(newDate);
                  }
                }}
                required
              />
              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  时辰 <span className="text-red-500">*</span>
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <HourSelector
                    key={`hour-${restoreKey}`}
                    value={hour}
                    onChange={(newHour) => {
                      // 如果正在恢复盘面数据，阻止更新
                      if (!isRestoringPaipan) {
                        setHour(newHour);
                      }
                    }}
                    year={year}
                    month={month}
                    day={day}
                    required
                  />
                  <MinuteSelector
                    key={`minute-${restoreKey}`}
                    value={minute}
                    onChange={(newMinute) => {
                      // 如果正在恢复盘面数据，阻止更新
                      if (!isRestoringPaipan) {
                        setMinute(newMinute);
                      }
                    }}
                  />
                </div>
              </div>
            </div>

            {/* 排盘按钮 */}
            <div className="mt-6 flex justify-center">
              <Button
                type="primary"
                size="large"
                onClick={handlePaipan}
                loading={loading}
                disabled={!date || !hour}
                className="bg-amber-600 hover:bg-amber-700"
              >
                起局排盘
              </Button>
            </div>
          </div>

          {/* 日期信息面板 */}
          {dateInfo && (
            <div className="bg-white rounded-lg shadow-md p-6 mb-6">
              <h2 className="text-xl font-bold text-gray-900 mb-4"></h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                <div>
                  <span className="text-sm text-gray-600">公历（阳历）：</span>
                  <span className="ml-2 font-medium text-gray-900">
                    {date && hour && minute
                      ? `${date} ${hour.padStart(2, "0")}:${minute.padStart(2, "0")}`
                      : dateInfo.gregorian}
                  </span>
                </div>
                <div>
                  <span className="text-sm text-gray-600">农历（阴历）：</span>
                  <span className="ml-2 font-medium text-gray-900">
                    {dateInfo.lunar}
                  </span>
                </div>
                <div>
                  <span className="text-sm text-gray-600">时节：</span>
                  <span className="ml-2 font-medium text-gray-900">
                    {dateInfo.startShijie && dateInfo.endShijie
                      ? `${dateInfo.startShijie} → ${dateInfo.endShijie}`
                      : dateInfo.season || "—"}
                  </span>
                </div>
                <div>
                  <span className="text-sm text-gray-600">干支四柱：</span>
                  <span className="ml-2 font-medium text-gray-900">
                    {dateInfo.fourPillars.year}年 {dateInfo.fourPillars.month}月{" "}
                    {dateInfo.fourPillars.day}日 {dateInfo.fourPillars.hour}时
                  </span>
                </div>
                <div>
                  <span className="text-sm text-gray-600">旬首：</span>
                  <span className="ml-2 font-medium text-gray-900">
                    {getXunShou(dateInfo.fourPillars.hour)}
                  </span>
                </div>
                <div>
                  <span className="text-sm text-gray-600">阴阳遁：</span>
                  <span className="ml-2 font-medium text-gray-900">
                    {dateInfo.dunType}{dateInfo.ju}局
                  </span>
                </div>
                {zhiShiDoor && (
                  <div>
                    <span className="text-sm text-gray-600">值使门：</span>
                    <span className="ml-2 font-medium text-gray-900">
                      {zhiShiDoor}门
                    </span>
                  </div>
                )}
                {zhiFuPalace !== null && (
                  <div>
                    <span className="text-sm text-gray-600">值符：</span>
                    <span className="ml-2 font-medium text-gray-900">
                      宫{zhiFuPalace}
                    </span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* 看盘分析结果区域（左右布局） */}
          <div className="bg-white rounded-lg shadow-md p-6 mb-6">
            <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
              {/* 左侧：对话标题列表 */}
              <div className="lg:col-span-1 border-r border-gray-200 pr-6">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-lg font-bold text-gray-900">对话历史</h2>
                  <div className="flex items-center gap-2">
                    <Tooltip 
                      title={!isLoggedIn ? "请先登录才能查看收藏" : (showFavoritesOnly ? "显示所有对话" : "只显示收藏的对话")} 
                      placement="top"
                    >
                      <Button
                        size="small"
                        type={showFavoritesOnly ? "primary" : "default"}
                        icon={showFavoritesOnly ? <StarFilled /> : <StarOutlined />}
                        onClick={() => setShowFavoritesOnly(!showFavoritesOnly)}
                        disabled={!isLoggedIn}
                        className="text-xs"
                      />
                    </Tooltip>
                    <Tooltip 
                      title={
                        !isLoggedIn 
                          ? "请先登录才能创建新对话" 
                          : `你可以从这三件事开始写：
- 你想问的主题（事业/感情/财运/学业/健康/官司…）
- 现在最困扰你的点是什么
- 你更希望得到：方向、时机、还是具体做法`
                      } 
                      placement="top"
                      overlayInnerStyle={{ width: '400px', whiteSpace: 'pre-line' }}
                    >
                      <Button
                        size="small"
                        type="primary"
                        icon={<PlusOutlined />}
                        onClick={handleNewConversation}
                        disabled={!isLoggedIn}
                        className="text-xs"
                      />
                    </Tooltip>
                  </div>
                </div>
                <div className="space-y-2 max-h-[600px] overflow-y-auto mb-4">
                  {conversations.length === 0 ? (
                    <p className="text-sm text-gray-500 text-center py-4">暂无对话记录</p>
                  ) : (() => {
                    // 计算分页数据
                    const totalPages = Math.ceil(conversations.length / CONVERSATIONS_PER_PAGE);
                    const startIndex = (conversationPage - 1) * CONVERSATIONS_PER_PAGE;
                    const endIndex = startIndex + CONVERSATIONS_PER_PAGE;
                    const currentPageConversations = conversations.slice(startIndex, endIndex);
                    
                    return (
                      <>
                        {currentPageConversations.map((conv: any) => (
                          <div
                            key={conv.id}
                            className={`w-full px-3 py-2 rounded-lg text-sm transition-colors ${
                              selectedConversationId === conv.id
                                ? "bg-amber-100 text-amber-900 border border-amber-300"
                                : "bg-gray-50 text-gray-700 hover:bg-gray-100 border border-gray-200"
                            }`}
                          >
                            {editingConversationId === conv.id ? (
                              <div className="space-y-2">
                                <Input
                                  value={editingTitle}
                                  onChange={(e) => setEditingTitle(e.target.value)}
                                  onPressEnter={() => handleSaveTitle(conv.id)}
                                  autoFocus
                                  className="text-sm"
                                  size="small"
                                />
                                <div className="flex gap-1">
                                  <Button
                                    size="small"
                                    type="primary"
                                    onClick={() => handleSaveTitle(conv.id)}
                                    onMouseDown={(e) => e.preventDefault()}
                                    className="text-xs"
                                  >
                                    保存
                                  </Button>
                                  <Button
                                    size="small"
                                    onClick={handleCancelEditTitle}
                                    onMouseDown={(e) => e.preventDefault()}
                                    className="text-xs"
                                  >
                                    取消
                                  </Button>
                                </div>
                              </div>
                            ) : (
                              <div
                                className="flex items-center justify-between group"
                                onClick={() => handleSelectConversation(conv.id)}
                              >
                                <div className="flex-1 min-w-0">
                                  <div className="font-medium truncate flex items-center gap-1">
                                    {favoriteConversationIds.has(conv.id) && (
                                      <StarFilled className="text-yellow-500 flex-shrink-0" />
                                    )}
                                    <span className="truncate">{conv.title || "未命名对话"}</span>
                                  </div>
                                  <div className="text-xs text-gray-500 mt-1">
                                    {new Date(conv.last_question_at || conv.updated_at).toLocaleDateString()}
                                  </div>
                                </div>
                                <Dropdown
                                  menu={{
                                    items: [
                                      {
                                        key: "rename",
                                        label: "重命名",
                                        icon: <EditOutlined />,
                                      },
                                      {
                                        key: "favorite",
                                        label: favoriteConversationIds.has(conv.id) ? "取消收藏" : "收藏",
                                        icon: favoriteConversationIds.has(conv.id) ? <StarFilled /> : <StarOutlined />,
                                      },
                                      {
                                        key: "delete",
                                        label: "删除",
                                        icon: <DeleteOutlined />,
                                        danger: true,
                                      },
                                    ],
                                    onClick: ({ key }) =>
                                      handleMenuClick(key, conv.id, conv.title),
                                  }}
                                  trigger={["click"]}
                                  placement="bottomRight"
                                >
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                    }}
                                    className="ml-2 opacity-0 group-hover:opacity-100 transition-opacity text-gray-500 hover:text-gray-700"
                                    title="更多操作"
                                  >
                                    <MoreOutlined />
                                  </button>
                                </Dropdown>
                              </div>
                            )}
                          </div>
                        ))}
                      </>
                    );
                  })()}
                </div>
                {/* 分页控件 */}
                {conversations.length > CONVERSATIONS_PER_PAGE && (() => {
                  const totalPages = Math.ceil(conversations.length / CONVERSATIONS_PER_PAGE);
                  return (
                    <div className="flex items-center justify-between pt-2 border-t border-gray-200">
                      <Button
                        size="small"
                        onClick={() => setConversationPage(Math.max(1, conversationPage - 1))}
                        disabled={conversationPage === 1}
                        className="text-xs"
                      >
                        上一页
                      </Button>
                      <span className="text-xs text-gray-600">
                        第 {conversationPage} / {totalPages} 页
                      </span>
                      <Button
                        size="small"
                        onClick={() => setConversationPage(Math.min(totalPages, conversationPage + 1))}
                        disabled={conversationPage === totalPages}
                        className="text-xs"
                      >
                        下一页
                      </Button>
                    </div>
                  );
                })()}
              </div>

              {/* 右侧：AI分析结果内容区 */}
              <div className="lg:col-span-3">
                <div className="space-y-6">
                  {/* 显示对话内容（如果有） */}
                  {(selectedConversationId && conversationRecords.length > 0) || (aiKanpanResult && currentConversationId) ? (
                    <>
                      {(selectedConversationId || currentConversationId) && (
                        <h2 className="text-xl font-bold text-gray-900 mb-4">
                          {conversations.find((c: any) => c.id === (selectedConversationId || currentConversationId))?.title || "对话详情"}
                        </h2>
                      )}
                      
                      {/* 显示所有历史记录（从旧到新排序） */}
                      {conversationRecords.length > 0 && (
                        <>
                          {conversationRecords
                            .sort((a: any, b: any) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())
                            .map((record: any) => (
                              <div key={record.id} className="border border-gray-200 rounded-lg p-4 space-y-3">
                                {/* 问题 - 靠右对齐，显示原始输入的问题 */}
                                <div className="flex justify-end">
                                  <div className="bg-blue-50 rounded-lg px-4 py-2 max-w-[80%]">
                                    <div className="text-gray-800 text-right">{record.original_question || record.question_title}</div>
                                  </div>
                                </div>
                                {/* AI回答 */}
                                <div className="bg-gray-50 rounded-lg p-4">
                                  <div className="prose prose-sm max-w-none text-gray-700 leading-relaxed whitespace-pre-wrap">
                                    {record.ai_analysis}
                                  </div>
                                </div>
                                <div className="text-xs text-gray-500 text-right">
                                  {new Date(record.created_at).toLocaleString()}
                                </div>
                              </div>
                            ))}
                        </>
                      )}
                      
                      {/* 显示当前最新的问事和AI分析（如果有且尚未保存到记录中） */}
                      {aiKanpanResult && (
                        <div className="border border-gray-200 rounded-lg p-4 space-y-3">
                          {/* 问题 - 靠右对齐，显示原始输入的问题 */}
                          <div className="flex justify-end">
                            <div className="bg-blue-50 rounded-lg px-4 py-2 max-w-[80%]">
                              <div className="text-gray-800 text-right">{currentQuestion || question}</div>
                            </div>
                          </div>
                          {/* AI回答 */}
                          <div className="bg-gray-50 rounded-lg p-4">
                            <div className="prose prose-sm max-w-none text-gray-700 leading-relaxed whitespace-pre-wrap">
                              {aiKanpanResult}
                            </div>
                          </div>
                        </div>
                      )}
                      
                      {/* AI分析时，在最下方显示轮播提示语 */}
                      {aiKanpanLoading && (
                        <div className="flex items-center justify-center py-4 bg-amber-50 border border-amber-200 rounded-lg">
                          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-amber-600"></div>
                          <span className="ml-3 text-gray-700 font-medium">{loadingMessages[loadingMessageIndex]}</span>
                        </div>
                      )}
                    </>
                  ) : aiKanpanResult ? (
                    <>
                      {/* 如果没有对话ID，只显示当前结果 */}
                      <div className="border border-gray-200 rounded-lg p-4 space-y-3">
                        {/* 问题 - 靠右对齐，显示原始输入的问题 */}
                        <div className="flex justify-end">
                          <div className="bg-blue-50 rounded-lg px-4 py-2 max-w-[80%]">
                            <div className="text-gray-800 text-right">{currentQuestion || question}</div>
                          </div>
                        </div>
                        {/* AI回答 */}
                        <div className="bg-gray-50 rounded-lg p-4">
                          <div className="prose prose-sm max-w-none text-gray-700 leading-relaxed whitespace-pre-wrap">
                            {aiKanpanResult}
                          </div>
                        </div>
                      </div>
                      
                      {/* AI分析时，在最下方显示轮播提示语 */}
                      {aiKanpanLoading && (
                        <div className="flex items-center justify-center py-4 bg-amber-50 border border-amber-200 rounded-lg">
                          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-amber-600"></div>
                          <span className="ml-3 text-gray-700 font-medium">{loadingMessages[loadingMessageIndex]}</span>
                        </div>
                      )}
                    </>
                  ) : !aiKanpanLoading && (
                    /* 只有在不加载且没有内容时才显示提示 */
                    <div className="text-center py-12 text-gray-500">
                      <p>你的感受很重要，我们从最想解决的地方开始</p>
                      <p className="text-sm mt-2">点击&ldquo;看盘&rdquo;获取解读；也可以打开左侧&ldquo;历史对话&rdquo;接着聊</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* 问事输入框和看盘按钮 */}
          <div className="bg-white rounded-lg shadow-md p-6 mb-6">
            <div className="w-full">
              <div className="mb-4">
                <div className="flex items-center justify-between mb-2">
                  <label className="block text-sm font-medium text-gray-700">
                    问事：
                    {!isLoggedIn && (
                      <span className="ml-2 text-xs text-amber-600 font-normal">
                        （先登录 再问事）
                      </span>
                    )}
                  </label>
                  <span className="text-xs text-gray-500">
                    {question.length}/200
                  </span>
                </div>
                <Input
                  ref={questionInputRef}
                  value={question}
                  onChange={(e) => {
                    if (e.target.value.length <= 200) {
                      setQuestion(e.target.value);
                    }
                  }}
                  placeholder="请输入要问的事情"
                  size="large"
                  className="w-full"
                  style={{ height: '48px' }}
                  maxLength={200}
                />
                <p className="mt-2 text-sm text-gray-500">
                 用你最舒服的方式写，别担心措辞，只需要说重点，简短也没关系，200 字以内我们先从这里开始。。
                </p>
              </div>
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  问哪方面：
                </label>
                <Radio.Group
                  value={sceneCode}
                  onChange={(e) => setSceneCode(e.target.value)}
                  size="large"
                  className="flex flex-wrap gap-2"
                >
                  <Radio value="flow.qmdj.kanpan.default">综合</Radio>
                  <Radio value="flow.qmdj.kanpan.career">事业</Radio>
                  <Radio value="flow.qmdj.kanpan.wealth">财运</Radio>
                  <Radio value="flow.qmdj.kanpan.relationship">感情</Radio>
                  <Radio value="flow.qmdj.kanpan.study">学业</Radio>
                  <Radio value="flow.qmdj.kanpan.health">健康</Radio>
                  <Radio value="flow.qmdj.kanpan.lawsuit">官司</Radio>
                </Radio.Group>
              </div>
            </div>
            <div className="mt-4 flex justify-center">
              {(() => {
                const isButtonDisabled = !paipanResult || !question || question.trim().length === 0 || !isLoggedIn;
                const tooltipTitle = isButtonDisabled && !isLoggedIn ? (
                  <div>
                    <div className="mb-2 text-left">我已经准备好为你看盘了，登录后即可开始，还能一键查看历史盘与收藏哦。</div>
                    <div className="text-center">
                      <Link href="/login" className="text-blue-400 hover:text-blue-300 underline">
                        登录
                      </Link>
                    </div>
                  </div>
                ) : "";
                
                return (
                  <div className="flex items-center gap-3">
                    <Tooltip 
                      title={tooltipTitle} 
                      placement="top"
                      overlayInnerStyle={{ width: '300px' }}
                    >
                      <Button
                        type="primary"
                        size="large"
                        onClick={() => {
                          if (isButtonDisabled && isLoggedIn) {
                            Modal.info({
                              title: '使用流程',
                              content: (
                                <div className="space-y-2 mt-4">
                                  <p>1. 选择日期和时间</p>
                                  <p>2. 点击&ldquo;起局排盘&rdquo;按钮完成排盘</p>
                                  <p>3. 在&ldquo;问事&rdquo;输入框中输入要问的事情</p>
                                  <p>4. 点击&ldquo;看盘&rdquo;按钮进行分析</p>
                                </div>
                              ),
                              okText: '我知道了',
                              centered: true,
                            });
                          } else if (!isButtonDisabled) {
                            handleKanpan();
                          }
                        }}
                        loading={aiKanpanLoading}
                        className={`bg-blue-600 hover:bg-blue-700 ${isButtonDisabled ? 'opacity-50 cursor-not-allowed' : ''}`}
                        style={isButtonDisabled ? { pointerEvents: 'auto' } : {}}
                      >
                        看盘
                      </Button>
                    </Tooltip>
                    {!isLoggedIn && (
                      <Button
                        type="default"
                        size="large"
                        onClick={() => router.push("/login")}
                        className="border-amber-600 text-amber-600 hover:bg-amber-50"
                      >
                        登录
                      </Button>
                    )}
                  </div>
                );
              })()}
            </div>
          </div>

          {/* 排盘结果面板 - 可折叠面板 */}
          {paipanResult && (
            <div className="bg-white rounded-lg shadow-md mb-6">
              <button
                type="button"
                onClick={() => setIsPaipanExpanded(!isPaipanExpanded)}
                className="w-full px-6 py-4 flex items-center justify-between hover:bg-gray-50 transition-colors rounded-t-lg"
              >
                <h2 className="text-xl font-bold text-gray-900">九宫</h2>
                <svg
                  className={`w-5 h-5 text-gray-500 transition-transform ${isPaipanExpanded ? "transform rotate-180" : ""}`}
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>
              {isPaipanExpanded && (
                <div className="px-6 pb-6">
                  <NineGrid data={paipanResult} />
                </div>
              )}
            </div>
          )}

          {/* 奇盘一览 - 可折叠面板 */}
          {(dipangan || tianpangan || dibashen || tianbashen || jiuxing || bamen || kongwang || yima) && (
            <div className="bg-white rounded-lg shadow-md mt-6">
              <button
                type="button"
                onClick={() => setIsQipanExpanded(!isQipanExpanded)}
                className="w-full px-6 py-4 flex items-center justify-between hover:bg-gray-50 transition-colors rounded-t-lg"
              >
                <h2 className="text-xl font-bold text-gray-900">更多</h2>
                <svg
                  className={`w-5 h-5 text-gray-500 transition-transform ${isQipanExpanded ? "transform rotate-180" : ""}`}
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>
              {isQipanExpanded && (
                <div className="px-6 pb-6 space-y-6">
                  {dipangan && (
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900 mb-3">地盘干一览</h3>
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        {displayOrder.map((palace: number) => (
                          <div
                            key={palace}
                            className="border border-amber-200 rounded-lg px-4 py-3 bg-amber-50 text-sm text-gray-700"
                          >
                            <span className="font-semibold mr-2">宫{palace}</span>
                            <span>{dipangan[palace] || "—"}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  {tianpangan && (
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900 mb-3">天盘干一览</h3>
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        {displayOrder.map((palace: number) => (
                          <div
                            key={palace}
                            className="border border-sky-200 rounded-lg px-4 py-3 bg-sky-50 text-sm text-gray-700"
                          >
                            <span className="font-semibold mr-2">宫{palace}</span>
                            <span>{tianpangan[palace] || "—"}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  {dibashen && (
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900 mb-3">地八神一览</h3>
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        {displayOrder.map((palace: number) => (
                          <div
                            key={palace}
                            className="border border-purple-200 rounded-lg px-4 py-3 bg-purple-50 text-sm text-gray-700"
                          >
                            <span className="font-semibold mr-2">宫{palace}</span>
                            <span>{dibashen[palace] || "—"}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  {tianbashen && (
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900 mb-3">天八神一览</h3>
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        {displayOrder.map((palace: number) => (
                          <div
                            key={palace}
                            className="border border-green-200 rounded-lg px-4 py-3 bg-green-50 text-sm text-gray-700"
                          >
                            <span className="font-semibold mr-2">宫{palace}</span>
                            <span>{tianbashen[palace] || "—"}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  {jiuxing && (
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900 mb-3">九星一览</h3>
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        {displayOrder.map((palace: number) => (
                          <div
                            key={palace}
                            className="border border-orange-200 rounded-lg px-4 py-3 bg-orange-50 text-sm text-gray-700"
                          >
                            <span className="font-semibold mr-2">宫{palace}</span>
                            <span>{jiuxing[palace] || "—"}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  {bamen && (
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900 mb-3">八门一览</h3>
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        {displayOrder.map((palace: number) => (
                          <div
                            key={palace}
                            className="border border-rose-200 rounded-lg px-4 py-3 bg-rose-50 text-sm text-gray-700"
                          >
                            <span className="font-semibold mr-2">宫{palace}</span>
                            <span>{bamen[palace] || "—"}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  {kongwang && (
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900 mb-3">空亡一览</h3>
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        {displayOrder.map((palace: number) => (
                          <div
                            key={palace}
                            className="border border-orange-200 rounded-lg px-4 py-3 bg-orange-50 text-sm text-gray-700"
                          >
                            <span className="font-semibold mr-2">宫{palace}</span>
                            <span>{kongwang[palace] ? "空亡" : "—"}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  {yima && (
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900 mb-3">驿马一览</h3>
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        {displayOrder.map((palace: number) => (
                          <div
                            key={palace}
                            className="border border-orange-200 rounded-lg px-4 py-3 bg-orange-50 text-sm text-gray-700"
                          >
                            <span className="font-semibold mr-2">宫{palace}</span>
                            <span>{yima[palace] ? "驿马" : "—"}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
      </Layout>
    </ConfigProvider>
  );
}

