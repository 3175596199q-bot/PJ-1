// src/db.js
export async function getDB(env) {
  if (process.env.NODE_ENV === 'local') {
    // 本地开发时使用 D1 模拟接口（你可以用 SQLite 本地开发）
    const sqlite = require('sqlite3').verbose();
    const db = new sqlite.Database('./dev.db');  // 本地数据库文件
    return db;
  } else {
    // 云端环境使用 Cloudflare D1
    return env.DB;
  }
}
