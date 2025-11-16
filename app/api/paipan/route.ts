import { NextResponse } from "next/server";

type GridCell = {
  id: number;
  name: string;
  content: string;
};

type PlaceholderResponse = {
  grid: GridCell[];
};

const PALACE_NAME: Record<number, string> = {
  1: "东南",
  2: "南",
  3: "西南",
  4: "东",
  5: "中",
  6: "西",
  7: "东北",
  8: "北",
  9: "西北",
};

function buildPlaceholderGrid(): GridCell[] {
  return Array.from({ length: 9 }, (_, index) => {
    const id = index + 1;
    const name = PALACE_NAME[id] || `宫${id}`;
    return {
      id,
      name,
      content: `宫位 ${id} · ${name}`,
    };
  });
}

export async function POST(): Promise<NextResponse<PlaceholderResponse>> {
  const grid = buildPlaceholderGrid();
  return NextResponse.json({ grid });
}


