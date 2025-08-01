import { Hono } from 'hono';
const router = new Hono();
// 购物车逻辑待添加
router.get('/cart', (c) => {
    c.text('Cart placeholder');
    console.log('aaaaaaaaaaaaa')
});
export default router;
