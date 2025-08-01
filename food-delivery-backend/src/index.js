import { Hono } from 'hono';
import users from './routes/users.js';
import products from './routes/products.js';
import cart from './routes/cart.js';
import orders from './routes/orders.js';

const app = new Hono();
app.route('/api', users);
app.route('/api', products);
app.route('/api', cart);
app.route('/api', orders);
export default app;
