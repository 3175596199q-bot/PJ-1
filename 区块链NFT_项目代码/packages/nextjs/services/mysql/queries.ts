// queries.ts

import pool from './dbConfig';

// 插入数据方法
export const insertData = async (name: string, description: string, image: string, owner: string, Token_ID: string) => {
    try {
        // const {
        //     NFT_name,
        //     Description,
        //     Image_URL,
        //     Owner_Address,
        //     Token_ID
        //   } = nftData;

        const connection = await pool.getConnection();
        // 将attributes对象转换为JSON字符串
        const query = `INSERT INTO nfts (NFT_name, Description, Image_URL, Owner_Address, Token_ID) VALUES 
        ('${name}', '${description}', '${image}', ${owner}, '${Token_ID}')`;
        const result = await connection.query(query);
        console.log('成功插入数据：', result);
        connection.release(); // 释放连接
        return  result;
    } catch (err) {
        console.error('插入数据出错：', err);
    }
};




// 查询所有数据方法
export const getAllData = async () => {
    try {
        const connection = await pool.getConnection();
        const query = 'SELECT * FROM nfts';
        const [result] = await connection.query(query);
        connection.release(); // 释放连接
        return result;
    } catch (err) {
        console.error('查询数据出错：', err);
        throw err;
    }
};