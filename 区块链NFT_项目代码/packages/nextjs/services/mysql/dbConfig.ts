// dbConfig.ts

// utils/db.ts
import mysql from 'mysql2/promise';

const pool = mysql.createPool({
  host: 'localhost',
  user: 'root',
  password: '123456',
  database: 'nft',
  dateStrings: true,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});

export const connectToDatabase = async () => {
    try {
        const connection = await pool.getConnection();
        console.log('成功获取到MySQL连接');
        return connection;
    } catch (error) {
        console.error('获取MySQL连接出错：', error);
        throw error;
    }
};


export default pool;



const fetchFromApi = ({ path, method, body }: { path: string; method: string; body?: object }) =>
  fetch(path, {
    method,
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  })
    .then(response => response.json())
    .catch(error => console.error("Error:", error));

export const saveNFTToDB = (data: object) => {
  return fetchFromApi({
    path: `/api/nfts/data`, 
    method: 'POST', 
    body: { data }
  });
};