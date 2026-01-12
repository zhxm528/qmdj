-- =========================================================
-- DELETE statements for all tables from 11_bazi.sql to 30_bazi_result_cache.sql
-- Generated automatically
-- =========================================================
-- 
-- Note: Execute these DELETE statements in reverse dependency order
-- (child tables first, then parent tables)
-- 
-- Warning: These DELETE statements will remove ALL data from the tables!
-- Use with caution!
-- =========================================================

BEGIN;

-- =========================================================
-- From 30_bazi_result_cache.sql
-- =========================================================
DELETE FROM public.bazi_chart_result_tbl;

-- =========================================================
-- From 29_dayun.sql
-- =========================================================
DELETE FROM public.bazi_dayun_result_tbl;
DELETE FROM public.bazi_dayun_meta_tbl;

-- =========================================================
-- From 28_tenshen_profile.sql
-- =========================================================
DELETE FROM public.bazi_tenshen_evidence_tbl;
DELETE FROM public.bazi_tenshen_profile_static_item_tbl;
DELETE FROM public.bazi_tenshen_profile_static_tbl;

-- =========================================================
-- From 27_check.sql
-- =========================================================
DELETE FROM public.bazi_check_rule_config_tbl;
DELETE FROM public.bazi_check_issue_tbl;
DELETE FROM public.bazi_check_result_tbl;

-- =========================================================
-- From 26_yongshen.sql
-- =========================================================
DELETE FROM public.bazi_yongshen_rule_config_tbl;
DELETE FROM public.bazi_element_score_tbl;
DELETE FROM public.bazi_yongshen_result_tbl;

-- =========================================================
-- From 25_geju.sql
-- =========================================================
DELETE FROM public.bazi_poqing_summary_tbl;
DELETE FROM public.bazi_chengju_result_tbl;
DELETE FROM public.bazi_geju_candidate_result_tbl;

-- =========================================================
-- From 24_han_zao.sql
-- =========================================================
DELETE FROM public.bazi_han_zao_summary_tbl;
DELETE FROM public.bazi_han_zao_detail_tbl;

-- =========================================================
-- From 23_ke_xie.sql
-- =========================================================
DELETE FROM public.bazi_ke_xie_summary_tbl;
DELETE FROM public.bazi_ke_xie_detail_tbl;

-- =========================================================
-- From 22_dezhu.sql
-- =========================================================
DELETE FROM public.bazi_support_summary_tbl;
DELETE FROM public.bazi_support_detail_tbl;

-- =========================================================
-- From 21_rootqi.sql
-- =========================================================
DELETE FROM public.bazi_root_qi_summary_tbl;
DELETE FROM public.bazi_root_qi_detail_tbl;

-- =========================================================
-- From 20_deling.sql
-- =========================================================
DELETE FROM public.bazi_deling_result_tbl;
DELETE FROM public.bazi_season_element_state_snapshot_tbl;

-- =========================================================
-- From 19_tougan.sql
-- =========================================================
DELETE FROM public.bazi_tougan_result_tbl;

-- =========================================================
-- From 18_tonggen.sql
-- =========================================================
DELETE FROM public.bazi_stem_root_dict;

-- =========================================================
-- From 17_shishen.sql
-- =========================================================
DELETE FROM public.bazi_tenshen_summary_tbl;

-- =========================================================
-- From 15_hehua.sql
-- =========================================================
DELETE FROM public.chart_hehua_result;


-- =========================================================
-- From 11_bazi.sql
-- =========================================================
DELETE FROM public.bazi_special_structure_member_tbl;
DELETE FROM public.bazi_special_structure_tbl;
DELETE FROM public.bazi_stem_relation_tbl;
DELETE FROM public.bazi_branch_relation_tbl;
DELETE FROM public.bazi_reveal_tbl;
DELETE FROM public.bazi_hidden_stem_tbl;
DELETE FROM public.bazi_pillar_tbl;
DELETE FROM public.bazi_chart_tbl;

COMMIT;

-- =========================================================
-- End of DELETE statements
-- =========================================================