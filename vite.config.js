// Phase 2:本機開發時,Vite dev server(5173)與 Worker(wrangler pages dev,8788)是
// 兩個獨立埠。用 proxy 把 /api/* 轉給 Worker,讓瀏覽器端看到單一同源,
// statsClient.js / voteStub.js 可直接打相對路徑 /api/...,不必處理跨埠 CORS。
// 詳見 開發設計方針.md > Phase 2 > 本機開發方式。
export default {
  server: {
    proxy: {
      "/api": "http://localhost:8788",
    },
  },
};
