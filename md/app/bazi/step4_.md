修改前端 app/bazi/page.tsx
从 step4 的结果中获取 tonggen、tougan、deling 数据
数据流程：前端 → /api/bazi → step4() → 内部调用 tonggen/tougan/deling → 返回结果

前端调用 /api/bazi
  ↓
route.ts 执行 step4()
  ↓
step4.ts 内部调用：
  - getTonggenFromDB() → 获取通根表
  - calculateAndSaveTougan() + getTouganFromDB() → 计算并获取透干表
  - calculateAndSaveDeling() + getDelingFromDB() → 计算并获取得令结果
  ↓
返回 Step4Result（包含 tonggen、tougan、deling）
  ↓
前端从 step4 结果中提取数据并显示