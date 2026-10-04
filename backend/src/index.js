import 'dotenv/config';
import http from 'http';
import express from 'express';
import cors from 'cors';
import { Server } from 'socket.io';
import { connectDB } from './config/db.js';
import authRoutes from './routes/auth.js';
import roomRoutes from './routes/rooms.js';
import { registerSocket } from './socket/main.js';
import { startSweeper } from './rooms/store.js';

const app = express();
const origins = (process.env.CLIENT_URL || '').split(',').map((s) => s.trim());
app.use(cors({ origin: origins }));
app.use(express.json());

app.get('/api/health', (_, res) => res.json({ ok: true })); // to check if server is alive
app.use('/api/auth', authRoutes);
app.use('/api/rooms', roomRoutes);

const server = http.createServer(app);
const io = new Server(server, { cors: { origin: origins } });
registerSocket(io);
startSweeper();

await connectDB();
const PORT = process.env.PORT || 5000;
server.listen(PORT, () => console.log(`Server on :${PORT}`));