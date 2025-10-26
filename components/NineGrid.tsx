interface NineGridProps {
  data: any;
}

export default function NineGrid({ data }: NineGridProps) {
  // 默认九宫格数据（占位）
  const defaultGrid = Array.from({ length: 9 }, (_, i) => ({
    id: i + 1,
    name: `宫${i + 1}`,
    content: "占位符",
  }));

  const gridData = data?.grid || defaultGrid;

  return (
    <div className="grid grid-cols-3 gap-4">
      {gridData.map((cell: any) => (
        <div
          key={cell.id}
          className="aspect-square bg-gradient-to-br from-amber-50 to-orange-100 border-2 border-amber-200 rounded-lg p-4 flex flex-col items-center justify-center text-center"
        >
          <div className="text-sm font-bold text-amber-900 mb-2">
            {cell.name}
          </div>
          <div className="text-xs text-gray-700">{cell.content}</div>
        </div>
      ))}
    </div>
  );
}

