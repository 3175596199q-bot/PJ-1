import { Hono } from 'hono';
import { getDB } from '../db.js';

const router = new Hono();

router.get('/products', async (c) => {
  const db = await getDB(c.env);
  const { results } = await db.prepare('SELECT * FROM products').all();
  return c.json(results);
});

export default router;
