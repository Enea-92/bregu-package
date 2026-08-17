// Hotel Bregu — backend API + realtime chat, backed by MongoDB (Atlas).
// Run locally:   npm install && npm start   (serves on http://localhost:3001)
// Requires MONGODB_URI in a .env file — see .env.example.

require('dotenv').config();
const express = require('express');
const cors = require('cors');
const http = require('http');
const mongoose = require('mongoose');
const { Server } = require('socket.io');
const { Message, QuickRequest, RoomServiceOrder, Feedback, toDTO } = require('./models');

const app = express();
app.use(cors());
app.use(express.json());

const server = http.createServer(app);
const io = new Server(server, { cors: { origin: '*' } });

function roomChannel(room) { return 'room:' + room; }

io.on('connection', (socket) => {
  socket.on('join_room', (room) => socket.join(roomChannel(room)));
  socket.on('join_staff', () => socket.join('staff'));
});

// ============ CHAT ============

app.post('/api/messages', async (req, res) => {
  const { room_number, sender, text } = req.body;
  if (!room_number || !sender || !text) return res.status(400).json({ error: 'room_number, sender, text required' });
  const doc = await Message.create({ room_number, sender, text });
  const message = toDTO(doc);

  io.to(roomChannel(room_number)).emit('new_message', message);
  io.to('staff').emit('new_message', message);
  res.status(201).json(message);
});

app.get('/api/messages/:room', async (req, res) => {
  const docs = await Message.find({ room_number: req.params.room }).sort({ created_at: 1 });
  res.json(docs.map(toDTO));
});

app.get('/api/messages', async (req, res) => {
  const docs = await Message.find().sort({ created_at: -1 }).limit(200);
  res.json(docs.map(toDTO));
});

// ============ QUICK REQUESTS ============

app.post('/api/quick-requests', async (req, res) => {
  const { room_number, request_type } = req.body;
  if (!room_number || !request_type) return res.status(400).json({ error: 'room_number, request_type required' });
  const doc = await QuickRequest.create({ room_number, request_type });
  const item = toDTO(doc);
  io.to('staff').emit('new_request', item);
  res.status(201).json(item);
});

app.get('/api/quick-requests', async (req, res) => {
  const docs = await QuickRequest.find({ status: 'pending' }).sort({ created_at: -1 });
  res.json(docs.map(toDTO));
});

app.patch('/api/quick-requests/:id', async (req, res) => {
  const doc = await QuickRequest.findByIdAndUpdate(req.params.id, { status: req.body.status || 'done' }, { new: true });
  const item = toDTO(doc);
  io.to('staff').emit('request_updated', item);
  res.json(item);
});

// ============ ROOM SERVICE ORDERS ============

app.post('/api/room-service', async (req, res) => {
  const { room_number, items } = req.body;
  if (!room_number || !Array.isArray(items) || items.length === 0) {
    return res.status(400).json({ error: 'room_number and non-empty items[] required' });
  }
  const total = items.reduce((sum, i) => sum + (Number(i.price) || 0), 0);
  const doc = await RoomServiceOrder.create({ room_number, items, total });
  const order = toDTO(doc);
  io.to('staff').emit('new_order', order);
  res.status(201).json(order);
});

app.get('/api/room-service', async (req, res) => {
  const docs = await RoomServiceOrder.find({ status: { $ne: 'delivered' } }).sort({ created_at: -1 });
  res.json(docs.map(toDTO));
});

app.patch('/api/room-service/:id', async (req, res) => {
  const doc = await RoomServiceOrder.findByIdAndUpdate(req.params.id, { status: req.body.status }, { new: true });
  const order = toDTO(doc);
  io.to('staff').emit('order_updated', order);
  res.json(order);
});

// ============ FEEDBACK ============

app.post('/api/feedback', async (req, res) => {
  const { room_number, rating, comment } = req.body;
  if (!room_number || !rating) return res.status(400).json({ error: 'room_number, rating required' });
  const doc = await Feedback.create({ room_number, rating, comment: comment || '' });
  res.status(201).json(toDTO(doc));
});

app.get('/api/feedback', async (req, res) => {
  const docs = await Feedback.find().sort({ created_at: -1 }).limit(100);
  res.json(docs.map(toDTO));
});

// ============ health check ============
app.get('/api/health', (req, res) => {
  res.json({ ok: true, db: mongoose.connection.readyState === 1 ? 'connected' : 'not connected' });
});

const PORT = process.env.PORT || 3001;
const MONGODB_URI = process.env.MONGODB_URI;

if (!MONGODB_URI) {
  console.error('Missing MONGODB_URI. Copy .env.example to .env and fill in your connection string.');
  process.exit(1);
}

mongoose.connect(MONGODB_URI)
  .then(() => {
    console.log('Connected to MongoDB');
    server.listen(PORT, () => console.log('Hotel Bregu backend running on port ' + PORT));
  })
  .catch((err) => {
    console.error('MongoDB connection failed:', err.message);
    process.exit(1);
  });
