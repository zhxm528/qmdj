-- 透干结果表：每个 chart 的每柱地支藏干，判断是否透到四柱天干
DROP TABLE IF EXISTS public.bazi_tougan_result_tbl CASCADE;

CREATE TABLE public.bazi_tougan_result_tbl (
  chart_id        UUID NOT NULL REFERENCES public.bazi_chart_tbl(chart_id) ON DELETE CASCADE,

  pillar          public.bazi_pillar_enum NOT NULL,  -- year/month/day/hour
  sort_order      SMALLINT NOT NULL CHECK (sort_order BETWEEN 1 AND 4),

  branch_code     VARCHAR(1) NOT NULL CHECK (char_length(branch_code) = 1),

  hidden_stem     VARCHAR(1) NOT NULL CHECK (char_length(hidden_stem) = 1),
  hidden_position SMALLINT NOT NULL CHECK (hidden_position BETWEEN 1 AND 3),
  hidden_role     TEXT NOT NULL CHECK (hidden_role IN ('主气','中气','余气')),
  hidden_weight   NUMERIC(6,4),

  is_tougan       BOOLEAN NOT NULL DEFAULT FALSE,
  tougan_pillars  public.bazi_pillar_enum[] NULL,
  tougan_count    SMALLINT NOT NULL DEFAULT 0,

  evidence_json   JSONB NULL,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),

  CONSTRAINT pk_bazi_tougan_result
    PRIMARY KEY (chart_id, pillar, hidden_stem, hidden_position)
);

CREATE INDEX IF NOT EXISTS idx_tougan_chart
ON public.bazi_tougan_result_tbl(chart_id);

CREATE INDEX IF NOT EXISTS idx_tougan_chart_is
ON public.bazi_tougan_result_tbl(chart_id, is_tougan);

-- =========================
-- 注释（COMMENT）
-- =========================

COMMENT ON TABLE public.bazi_tougan_result_tbl IS
'透干计算结果表：按四柱（year/month/day/hour）逐柱展开地支藏干，并判断该藏干是否在本盘四柱天干中“透出”。透干属于计算结果（非固定字典），通常用于合化/用神/格局等判定中的证据项。';

COMMENT ON COLUMN public.bazi_tougan_result_tbl.chart_id IS
'排盘ID（外键到 bazi_chart_tbl.chart_id）。同一 chart 会有 4 柱 × 每柱藏干(1~3) 的记录。';

COMMENT ON COLUMN public.bazi_tougan_result_tbl.pillar IS
'柱位枚举：year/month/day/hour。表示当前记录对应哪一柱的地支藏干展开结果。';

COMMENT ON COLUMN public.bazi_tougan_result_tbl.sort_order IS
'柱位排序：1=year, 2=month, 3=day, 4=hour。用于稳定排序与数组聚合顺序。';

COMMENT ON COLUMN public.bazi_tougan_result_tbl.branch_code IS
'地支（子丑寅卯辰巳午未申酉戌亥）。来自 bazi_pillar_tbl.branch（此处用 branch_code 命名以与字典表字段一致）。';

COMMENT ON COLUMN public.bazi_tougan_result_tbl.hidden_stem IS
'藏干天干（甲乙丙丁戊己庚辛壬癸）。来自 bazi_branch_hidden_stem_dict.stem_code。';

COMMENT ON COLUMN public.bazi_tougan_result_tbl.hidden_position IS
'藏干顺序位置：1=主气，2=中气，3=余气。来自 bazi_branch_hidden_stem_dict.position。';

COMMENT ON COLUMN public.bazi_tougan_result_tbl.hidden_role IS
'藏干角色：主气/中气/余气。来自 bazi_branch_hidden_stem_dict.role，用于直接阅读与规则判断。';

COMMENT ON COLUMN public.bazi_tougan_result_tbl.hidden_weight IS
'藏干权重（可空）。来自 bazi_branch_hidden_stem_dict.weight，用于后续强弱加权或流派差异。';

COMMENT ON COLUMN public.bazi_tougan_result_tbl.is_tougan IS
'是否透干：当 hidden_stem 出现在本 chart 的四柱天干（年干/月干/日干/时干）中，则为 true。';

COMMENT ON COLUMN public.bazi_tougan_result_tbl.tougan_pillars IS
'透出位置列表：若透干，给出该天干出现在四柱的哪些柱位（如 {month,day}）。为空表示未透干。';

COMMENT ON COLUMN public.bazi_tougan_result_tbl.tougan_count IS
'透出次数：该 hidden_stem 在四柱天干中出现的次数（0~4）。用于评估“透干力度”或规则打分。';

COMMENT ON COLUMN public.bazi_tougan_result_tbl.evidence_json IS
'证据JSON（可选）：建议记录四柱天干数组、匹配规则、其他计算上下文，便于审计与回溯。例如 {four_stems:[...], match_rule:"..."}。';

COMMENT ON COLUMN public.bazi_tougan_result_tbl.created_at IS
'记录生成/刷新时间戳。一般在 upsert 刷新时更新，用于追踪计算批次。';

COMMENT ON CONSTRAINT pk_bazi_tougan_result ON public.bazi_tougan_result_tbl IS
'主键：同一 chart + 同一柱位 + 同一藏干（按天干+position区分）唯一。避免同柱多藏干冲突。';

COMMENT ON INDEX idx_tougan_chart IS
'索引：按 chart_id 查询透干结果时加速（常见访问模式）。';

COMMENT ON INDEX idx_tougan_chart_is IS
'索引：按 chart_id + is_tougan 过滤透干(true)记录时加速。';
