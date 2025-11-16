interface NineGridProps {
  data: any;
}

// 九宫从左到右从上到下的“九宫数字”与“八卦”映射
const PALACE_NUMBERS = [4, 9, 2, 3, 5, 7, 8, 1, 6];
const PALACE_GUA = ["巽", "离", "坤", "震", "中", "兑", "艮", "坎", "乾"];

export default function NineGrid({ data }: NineGridProps) {
  // 默认九宫格数据（占位）
  const defaultGrid = Array.from({ length: 9 }, (_, i) => ({
    id: i + 1,
    name: `宫${i + 1}`,
    content: "",
    diGan: "",
    tianGan: "",
    diShen: "",
    tianShen: "",
    star: "",
    door: "",
    kongWang: false,
    yiMa: false,
    jiGong: null,
  }));

  const gridData = data?.grid || defaultGrid;

  return (
    <div className="grid grid-cols-3 gap-4">
      {gridData.map((cell: any, idx: number) => {
        const palaceNumber = PALACE_NUMBERS[idx] ?? "";
        const gua = PALACE_GUA[idx] ?? "";
        const diGan: string = cell?.diGan || extractDiGan(cell?.content);
        const tianGan: string = cell?.tianGan || "";
        const diShen: string = cell?.diShen || ""; // 地八神
        const tianShen: string = cell?.tianShen || ""; // 天八神
        const star: string = cell?.star || ""; // 九星
        const door: string = cell?.door || ""; // 八门
        const kongWang: boolean = cell?.kongWang || false; // 空亡
        const yiMa: boolean = cell?.yiMa || false; // 驿马
        const jiGongInfo: { diGan?: string; tianGan?: string } | null = cell?.jiGong || null; // 寄宫信息
        
        // 1-3 格仅显示空亡
        const kongWangText = kongWang ? "空亡" : "";

        // 2-1 格显示天禽或寄宫信息（天芮星所在宫）
        // 如果九星包含天芮，显示天禽（因为天芮和天禽同宫）
        // 如果有寄宫信息（中宫寄来的天干），也显示
        const tianQinOrJiGong = [];
        if (star.includes("天芮")) {
          tianQinOrJiGong.push("天禽");
        }
        if (jiGongInfo) {
          // 显示寄宫的地盘干和天盘干（中宫寄来的）
          const jiGongParts = [];
          if (jiGongInfo.diGan) jiGongParts.push(jiGongInfo.diGan);
          if (jiGongInfo.tianGan) jiGongParts.push(jiGongInfo.tianGan);
          if (jiGongParts.length > 0) {
            tianQinOrJiGong.push(jiGongParts.join("/"));
          }
        }
        const tianQinJiGongText = tianQinOrJiGong.join(" ");

        return (
          <div
            key={cell.id}
            className="aspect-square bg-white border-2 border-amber-200 rounded-lg p-2"
          >
            {/* 宫标题 */}
            <div className="text-xs font-bold text-amber-900 mb-1 text-center">{cell.name}</div>
            {/* 4x3 子格 */}
            <div className="grid grid-cols-3 grid-rows-4 gap-1 h-full">
              {/* 1-1 驿马 */}
              <div className="flex items-center justify-center text-[14px] text-orange-700 font-medium border rounded-sm bg-orange-50">
                {yiMa ? "驿马" : ""}
              </div>
              {/* 1-2 天八神 */}
              <div className="flex items-center justify-center text-[14px] text-blue-700 font-medium border rounded-sm bg-blue-50">
                {tianShen}
              </div>
              {/* 1-3 空亡 */}
              <div className="flex items-center justify-center text-[14px] text-orange-700 font-medium border rounded-sm bg-orange-50">
                {kongWangText}
              </div>

              {/* 2-1 天禽（与天芮同宫）或寄宫信息 */}
              <div className="flex items-center justify-center text-[14px] text-teal-700 font-medium border rounded-sm bg-teal-50">
                {tianQinJiGongText}
              </div>
              {/* 2-2 九星 */}
              <div className="flex items-center justify-center text-[14px] text-green-700 font-medium border rounded-sm bg-green-50">
                {star}
              </div>
              {/* 2-3 天盘干 */}
              <div className="flex items-center justify-center text-[14px] text-sky-900 font-semibold border rounded-sm bg-sky-50">
                {tianGan}
              </div>

              {/* 3-1 空 */}
              <div className="flex items-center justify-center text-[14px] text-gray-600 border rounded-sm"></div>
              {/* 3-2 八门 */}
              <div className="flex items-center justify-center text-[14px] text-rose-700 font-medium border rounded-sm bg-rose-50">{door}</div>
              {/* 3-3 地盘干 */}
              <div className="flex items-center justify-center text-[14px] text-amber-900 font-semibold border rounded-sm bg-amber-50">
                {diGan}
              </div>

              {/* 4-1 八卦+宫位数 */}
              <div className="flex items-center justify-center text-[14px] text-gray-800 font-semibold border rounded-sm bg-gray-50">
                {gua}{palaceNumber}
              </div>
              {/* 4-2 地八神（第八神） */}
              <div className="flex items-center justify-center text-[14px] text-purple-700 font-medium border rounded-sm bg-purple-50">
                {diShen}
              </div>
              {/* 4-3 空 */}
              <div className="flex items-center justify-center text-[14px] text-gray-600 border rounded-sm"></div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

function extractDiGan(content?: string): string {
  if (!content) return "";
  // 简单从 “地盘干：X” 中提取 X
  const m = content.match(/地盘干[:：]\s*([甲乙丙丁戊己庚辛壬癸])/);
  return m ? m[1] : "";
}

