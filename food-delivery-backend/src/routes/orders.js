import { Hono } from 'hono';
const router = new Hono();
// 订单逻辑待添加
router.get('/orders', (c) => c.text('Orders placeholder'));
export default router;
