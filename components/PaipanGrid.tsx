"use client";

interface GridCell {
  id: number;
  name: string;
  diGan: string;
  tianGan: string;
  diShen: string;
  tianShen: string;
  star: string;
  door: string;
  kongWang: boolean;
  yiMa: boolean;
  jiGong?: { diGan?: string; tianGan?: string };
}

interface PaipanGridProps {
  data: {
    grid: GridCell[];
    meta?: {
      date?: string;
      time?: string;
      season?: string;
      dunType?: string;
      ju?: number;
    };
  };
}

// 九宫格顺序：从左到右从上到下分别是：4、9、2、3、5、7、8、1、6
const GRID_ORDER = [4, 9, 2, 3, 5, 7, 8, 1, 6];

// 八卦顺序：从左到右从上到下分别是：巽、离、坤、震、中、兑、艮、坎、乾
const BAGUA_ORDER = ["巽", "离", "坤", "震", "中", "兑", "艮", "坎", "乾"];

export default function PaipanGrid({ data }: PaipanGridProps) {
  const { grid, meta } = data;

  // 按照指定顺序排列九宫格
  const orderedGrid = GRID_ORDER.map((order) => {
    return grid.find((cell) => cell.id === order) || grid[order - 1];
  });

  const renderCell = (cell: GridCell, index: number) => {
    const bagua = BAGUA_ORDER[index];

    return (
      <div
        key={cell.id}
        className="border-2 border-[var(--color-border)] bg-[var(--color-card-bg)]"
        style={{ minWidth: "200px", minHeight: "200px" }}
      >
        {/* 12格布局：4行×3列 */}
        <div className="grid grid-cols-3 grid-rows-4 h-full w-full">
          {/* 1-1格：九宫对应的数字 */}
          <div className="border border-[var(--color-border)] p-1 text-center text-sm font-bold bg-[var(--color-surface)]">
            {cell.id}
          </div>
          {/* 1-2格：天八神 */}
          <div className="border border-[var(--color-border)] p-1 text-center text-xs">
            {cell.tianShen || ""}
          </div>
          {/* 1-3格：驿马或空亡 */}
          <div className="border border-[var(--color-border)] p-1 text-center text-xs">
            {cell.yiMa ? "驿马" : cell.kongWang ? "空亡" : ""}
          </div>
          {/* 2-1格：天芮星同宫的天禽星 */}
          <div className="border border-[var(--color-border)] p-1 text-center text-xs">
            {cell.star?.includes("天芮") || cell.star?.includes("天禽")
              ? cell.star
              : ""}
          </div>
          {/* 2-2格：九星 */}
          <div className="border border-gray-200 p-1 text-center text-xs font-semibold">
            {cell.star || ""}
          </div>
          {/* 2-3格：天盘干 */}
          <div className="border border-[var(--color-border)] p-1 text-center text-xs font-semibold text-[var(--color-link)]">
            {cell.tianGan || ""}
          </div>
          {/* 3-1格：填空 */}
          <div className="border border-gray-200 p-1"></div>
          {/* 3-2格：八门 */}
          <div className="border border-[var(--color-border)] p-1 text-center text-xs font-semibold text-[var(--color-success)]">
            {cell.door || ""}
          </div>
          {/* 3-3格：地盘干 */}
          <div className="border border-[var(--color-border)] p-1 text-center text-xs font-semibold text-[var(--color-danger)]">
            {cell.diGan || ""}
          </div>
          {/* 4-1格：九宫对应的八卦 */}
          <div className="border border-gray-200 p-1 text-center text-xs font-bold bg-gray-50">
            {bagua}
          </div>
          {/* 4-2格：地八神 */}
          <div className="border border-[var(--color-border)] p-1 text-center text-xs">
            {cell.diShen || ""}
          </div>
          {/* 4-3格：填空 */}
          <div className="border border-gray-200 p-1"></div>
        </div>
      </div>
    );
  };

  return (
    <div className="bg-[var(--color-card-bg)] rounded-lg shadow-md p-6">
      <h2 className="text-2xl font-bold text-[var(--color-text-strong)] mb-6 text-center">排盘结果</h2>
      {meta && (
        <div className="mb-4 text-center text-sm text-[var(--color-text)]">
          {meta.season && <span className="mr-2">{meta.season}</span>}
          {meta.dunType && <span className="mr-2">{meta.dunType}</span>}
          {meta.ju && <span>{meta.ju}局</span>}
        </div>
      )}
      {/* 九宫格布局：3行×3列 */}
      <div className="grid grid-cols-3 gap-2 max-w-4xl mx-auto">
        {orderedGrid.map((cell, index) => renderCell(cell, index))}
      </div>
    </div>
  );
}

