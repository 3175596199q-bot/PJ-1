import { Hono } from 'hono';
import { getDB } from '../db.js';

const router = new Hono();

router.post('/register', async (c) => {
  const { username, password } = await c.req.json();
  const db = await getDB(c.env);
  await db.prepare('INSERT INTO users (username, password) VALUES (?, ?)').bind(username, password).run();
  return c.text('User registered');
});

export default router;
