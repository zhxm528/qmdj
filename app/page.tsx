"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Layout from "@/components/Layout";
import DateSelector from "@/components/DateSelector";
import HourSelector from "@/components/HourSelector";
import MinuteSelector from "@/components/MinuteSelector";
import NineGrid from "@/components/NineGrid";
import { getFourPillars } from "@/lib/ganzhi";
import { Button, ConfigProvider, Input } from "antd";
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
  const [question, setQuestion] = useState<string>("");
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

  // 从日期字符串解析年月日（使用 useMemo 而不是状态）
  const dateParts = date ? date.split("-") : null;
  const year = dateParts && dateParts.length === 3 ? dateParts[0] : "";
  const month = dateParts && dateParts.length === 3 ? dateParts[1] : "";
  const day = dateParts && dateParts.length === 3 ? dateParts[2] : "";

  // 当日期和小时都选择后，自动获取日期信息
  useEffect(() => {
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

      // 获取提示词模板
      let systemPrompt: string | null = null;
      try {
        const chartJson = {
          dateInfo,
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
          grid: paipanResult.grid,
        };

        const promptContextResponse = await fetch("/api/prompt_context", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            envCode: "dev",
            logicalKey: "qmdj.master.analyze_chart",
            scope: "scene",
            projectCode: "qmdj",
            sceneCode: "analyze_chart",
            role: "system",
            language: "zh-CN",
            variables: {
              chart_json: JSON.stringify(chartJson),
              question: refinedQuestionData?.short_prompt_zh || refinedQuestion,
              ask_time: new Date().toISOString(),
            },
          }),
        });

        if (promptContextResponse.ok) {
          const promptContextData = await promptContextResponse.json();
          if (promptContextData.success && promptContextData.messages) {
            const systemMessage = promptContextData.messages.find(
              (msg: any) => msg.role === "system"
            );
            if (systemMessage) {
              systemPrompt = systemMessage.content;
            }
          }
        }
      } catch (promptContextError: any) {
        console.warn("获取提示词模板时出错:", promptContextError);
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
          ...(systemPrompt ? { systemPrompt } : {}),
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
      const response = await fetch("/api/conversations?project_code=qmdj");
      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          setConversations(data.conversations || []);
        }
      }
    } catch (error) {
      console.error("加载对话列表失败:", error);
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
        }
      }
    } catch (error) {
      console.error("加载对话记录失败:", error);
    }
  };

  // 选择对话
  const handleSelectConversation = (convId: number) => {
    setSelectedConversationId(convId);
    setCurrentConversationId(convId);
    loadConversationRecords(convId);
  };

  // 创建新对话
  const handleNewConversation = () => {
    setCurrentConversationId(null);
    setSelectedConversationId(null);
    setConversationRecords([]);
    setAiKanpanResult(null);
    setCurrentQuestion("");
  };

  // 组件加载时获取对话列表
  useEffect(() => {
    loadConversations();
  }, []);

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
                value={date}
                onChange={setDate}
                required
              />
              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  时辰 <span className="text-red-500">*</span>
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <HourSelector
                    value={hour}
                    onChange={setHour}
                    year={year}
                    month={month}
                    day={day}
                    required
                  />
                  <MinuteSelector
                    value={minute}
                    onChange={setMinute}
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
                排盘
              </Button>
            </div>
          </div>

          {/* 看盘分析结果区域（左右布局） */}
          <div className="bg-white rounded-lg shadow-md p-6 mb-6">
            <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
              {/* 左侧：对话标题列表 */}
              <div className="lg:col-span-1 border-r border-gray-200 pr-6">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-lg font-bold text-gray-900">对话历史</h2>
                  <Button
                    size="small"
                    onClick={handleNewConversation}
                    className="text-xs"
                  >
                    新对话
                  </Button>
                </div>
                <div className="space-y-2 max-h-[600px] overflow-y-auto">
                  {conversations.length === 0 ? (
                    <p className="text-sm text-gray-500 text-center py-4">暂无对话记录</p>
                  ) : (
                    conversations.map((conv: any) => (
                      <button
                        key={conv.id}
                        onClick={() => handleSelectConversation(conv.id)}
                        className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors ${
                          selectedConversationId === conv.id
                            ? "bg-amber-100 text-amber-900 border border-amber-300"
                            : "bg-gray-50 text-gray-700 hover:bg-gray-100 border border-gray-200"
                        }`}
                      >
                        <div className="font-medium truncate">{conv.title || "未命名对话"}</div>
                        <div className="text-xs text-gray-500 mt-1">
                          {new Date(conv.last_question_at || conv.updated_at).toLocaleDateString()}
                        </div>
                      </button>
                    ))
                  )}
                </div>
              </div>

              {/* 右侧：AI分析结果内容区 */}
              <div className="lg:col-span-3">
                {aiKanpanLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-amber-600"></div>
                    <span className="ml-3 text-gray-600">AI正在分析中...</span>
                  </div>
                ) : (selectedConversationId && conversationRecords.length > 0) || (aiKanpanResult && currentConversationId) ? (
                  <div className="space-y-6">
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
                  </div>
                ) : aiKanpanResult ? (
                  <div className="space-y-6">
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
                  </div>
                ) : (
                  <div className="text-center py-12 text-gray-500">
                    <p>点击&ldquo;看盘&rdquo;按钮开始分析</p>
                    <p className="text-sm mt-2">或从左侧选择一个历史对话查看</p>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* 问事输入框和看盘按钮 */}
          <div className="bg-white rounded-lg shadow-md p-6 mb-6">
            <div className="w-full">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                问事：
              </label>
              <Input
                value={question}
                onChange={(e) => setQuestion(e.target.value)}
                placeholder="请输入要问的事情"
                size="large"
                className="w-full"
                style={{ height: '48px' }}
              />
            </div>
            <div className="mt-4 flex justify-center">
              <Button
                type="primary"
                size="large"
                onClick={handleKanpan}
                loading={aiKanpanLoading}
                disabled={!paipanResult || !question || question.trim().length === 0}
                className="bg-blue-600 hover:bg-blue-700"
              >
                看盘
              </Button>
            </div>
          </div>

          {/* 排盘结果面板 */}
          {paipanResult && (
            <div className="bg-white rounded-lg shadow-md p-6 mb-6">
              <h2 className="text-xl font-bold text-gray-900 mb-4">奇门排盘</h2>
              <NineGrid data={paipanResult} />
            </div>
          )}

          {/* 日期信息面板 */}
          {dateInfo && (
            <div className="bg-white rounded-lg shadow-md p-6">
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

          {/* 奇盘一览 - 可折叠面板 */}
          {(dipangan || tianpangan || dibashen || tianbashen || jiuxing || bamen || kongwang || yima) && (
            <div className="bg-white rounded-lg shadow-md mt-6">
              <button
                type="button"
                onClick={() => setIsQipanExpanded(!isQipanExpanded)}
                className="w-full px-6 py-4 flex items-center justify-between hover:bg-gray-50 transition-colors rounded-t-lg"
              >
                <h2 className="text-xl font-bold text-gray-900">奇盘一览</h2>
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

