import { NextResponse } from "next/server";

const GAN_SEQUENCE = ["戊", "己", "庚", "辛", "壬", "癸", "丁", "丙", "乙"] as const;
const YANG_PATH = [1, 2, 3, 4, 5, 6, 7, 8, 9] as const;
const YIN_PATH = [...YANG_PATH].reverse() as number[];
const PATH: Record<string, number[]> = {
  "阳遁": YANG_PATH.slice(),
  "阴遁": YIN_PATH,
};

type DipanganResponse = {
  dipangan: Record<number, string>;
};

type DipanganRequest = {
  dunType?: string;
  ju?: number;
};

function buildDipangan(dunType: "阳遁" | "阴遁", ju: number): Record<number, string> {
  const path = PATH[dunType];
  const startIndex = path.indexOf(ju);

  const placement: Record<number, string> = {};

  if (startIndex === -1) {
    path.forEach((palace, index) => {
      placement[palace] = GAN_SEQUENCE[index];
    });
    return placement;
  }

  for (let i = 0; i < GAN_SEQUENCE.length; i += 1) {
    const palace = path[(startIndex + i) % path.length];
    placement[palace] = GAN_SEQUENCE[i];
  }

  return placement;
}

export async function POST(req: Request): Promise<NextResponse<DipanganResponse | { error: string }>> {
  try {
    const body = (await req.json()) as DipanganRequest;
    const { dunType, ju } = body || {};

    if (!dunType || (dunType !== "阳遁" && dunType !== "阴遁")) {
      return NextResponse.json({ error: "dunType 必须为 '阳遁' 或 '阴遁'" }, { status: 400 });
    }

    if (typeof ju !== "number" || ju < 1 || ju > 9) {
      return NextResponse.json({ error: "ju 必须为 1-9 的数字" }, { status: 400 });
    }

    const dipangan = buildDipangan(dunType, ju);

    return NextResponse.json({ dipangan });
  } catch (error) {
    return NextResponse.json({ error: "解析请求失败" }, { status: 400 });
  }
}
