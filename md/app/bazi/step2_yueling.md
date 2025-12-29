## 核心功能说明
- 后台程序： `/app/api/bazi/route.ts`
- 后台程序： `/app/api/bazi/step1.ts`
- 后台程序： `/app/api/bazi/step2.ts`
- 后台程序： `/app/api/bazi/dizhicanggan/route.ts`
- 后台程序： `/app/api/bazi/wuxingyinyang/route.ts`
- 后台程序： `/app/api/bazi/ganhe/route.ts`
- 后台程序： `/app/api/bazi/yueling/route.ts`  (如果不存在则创建)
- 前台程序： `/app/bazi/pages.ts`
- 数据库表结构： `/md/database/16_yueling.sql`

## 需要执行的操作
- 目标：要拿到「月令强弱 / 得令」：
    - 第一步：先确定月令（月支）= 你的八字“月柱地支”（注意排月柱通常按节气分月：立春起寅月…）
    - 第二部：用月令把五行映射到：旺/相/休/囚/死，再看“日主五行”落在哪个档位，就得到“得令与否/强弱倾向”。
- 根据step1中获取的信息和数据库中已存在的字典数据，如何获取月令强弱/得令信息，即当前季节对五行的旺相休囚死，然后结果存入数据库
- 月令信息返回到页面 `/app/bazi/pages.ts` 中的step2中








## 已执行完毕、忽略不执行的操作