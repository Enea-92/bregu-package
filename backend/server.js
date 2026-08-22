// Hotel Bregu — backend API + realtime chat, backed by MongoDB (Atlas).
// Run locally:   npm install && npm start   (serves on http://localhost:3001)
// Requires MONGODB_URI in a .env file — see .env.example.

require('dotenv').config();
const express = require('express');
const cors = require('cors');
const http = require('http');
const mongoose = require('mongoose');
const { Server } = require('socket.io');
const rateLimit = require('express-rate-limit');
const { Message, QuickRequest, RoomServiceOrder, Feedback, HotelContent, Recommendation, toDTO } = require('./models');

const app = express();
app.use(cors());
app.use(express.json());

const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'bregu-admin';
const STAFF_PASSWORD = process.env.STAFF_PASSWORD || 'bregu-staff';
const FOLLOWUP_HOURS = Number(process.env.FOLLOWUP_HOURS || 2); // hours after delivery to ask for feedback

function requireAdmin(req, res, next) {
  if (req.headers['x-admin-password'] !== ADMIN_PASSWORD) {
    return res.status(401).json({ error: 'Fjalëkalim admin i pasaktë' });
  }
  next();
}

function requireStaff(req, res, next) {
  const provided = req.headers['x-staff-password'];
  if (provided !== STAFF_PASSWORD && provided !== ADMIN_PASSWORD) {
    return res.status(401).json({ error: 'Fjalëkalim stafi i pasaktë' });
  }
  next();
}

// --- Rate limiting: guests can only send so many writes per minute per IP ---
const writeLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 20, // 20 writes/minute/IP is generous for a real guest, blocks spam scripts
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Shumë kërkesa njëherësh, provo përsëri pas pak.' }
});
app.use('/api/messages', writeLimiter);
app.use('/api/quick-requests', writeLimiter);
app.use('/api/room-service', writeLimiter);
app.use('/api/feedback', writeLimiter);

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

// Guest-facing: read your own room's history — no auth (guests have no login)
app.get('/api/messages/:room', async (req, res) => {
  const docs = await Message.find({ room_number: req.params.room }).sort({ created_at: 1 });
  res.json(docs.map(toDTO));
});

// Staff-facing: read across all rooms — requires staff password
app.get('/api/messages', requireStaff, async (req, res) => {
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

app.get('/api/quick-requests', requireStaff, async (req, res) => {
  const docs = await QuickRequest.find({ status: 'pending' }).sort({ created_at: -1 });
  res.json(docs.map(toDTO));
});

app.patch('/api/quick-requests/:id', requireStaff, async (req, res) => {
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

app.get('/api/room-service', requireStaff, async (req, res) => {
  const docs = await RoomServiceOrder.find({ status: { $ne: 'delivered' } }).sort({ created_at: -1 });
  res.json(docs.map(toDTO));
});

app.patch('/api/room-service/:id', requireStaff, async (req, res) => {
  const changes = { status: req.body.status };
  if (req.body.status === 'delivered') changes.delivered_at = new Date();
  const doc = await RoomServiceOrder.findByIdAndUpdate(req.params.id, changes, { new: true });
  const order = toDTO(doc);
  io.to(roomChannel(order.room_number)).emit('order_updated', order);
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

app.get('/api/feedback', requireStaff, async (req, res) => {
  const docs = await Feedback.find().sort({ created_at: -1 }).limit(100);
  res.json(docs.map(toDTO));
});

// ============ HOTEL CONTENT (editable via admin panel) ============

app.get('/api/content', async (req, res) => {
  let content = await HotelContent.findOne();
  if (!content) content = await HotelContent.create({});
  res.json(toDTO(content));
});

app.put('/api/content', requireAdmin, async (req, res) => {
  let content = await HotelContent.findOne();
  if (!content) content = new HotelContent({});
  Object.assign(content, req.body);
  await content.save();
  io.emit('content_updated');
  res.json(toDTO(content));
});

// ============ RECOMMENDATIONS ============

app.get('/api/recommendations', async (req, res) => {
  const docs = await Recommendation.find();
  res.json(docs.map(toDTO));
});

app.post('/api/recommendations', requireAdmin, async (req, res) => {
  const doc = await Recommendation.create(req.body);
  io.emit('content_updated');
  res.status(201).json(toDTO(doc));
});

app.put('/api/recommendations/:id', requireAdmin, async (req, res) => {
  const doc = await Recommendation.findByIdAndUpdate(req.params.id, req.body, { new: true });
  io.emit('content_updated');
  res.json(toDTO(doc));
});

app.delete('/api/recommendations/:id', requireAdmin, async (req, res) => {
  await Recommendation.findByIdAndDelete(req.params.id);
  io.emit('content_updated');
  res.json({ deleted: true });
});

// ============ STATS (staff dashboard) ============

app.get('/api/stats', requireStaff, async (req, res) => {
  const startOfDay = new Date();
  startOfDay.setHours(0, 0, 0, 0);

  const [requestsToday, ordersToday, feedbackToday, allFeedback] = await Promise.all([
    QuickRequest.countDocuments({ created_at: { $gte: startOfDay } }),
    RoomServiceOrder.countDocuments({ created_at: { $gte: startOfDay } }),
    Feedback.countDocuments({ created_at: { $gte: startOfDay } }),
    Feedback.find()
  ]);

  const avgRating = allFeedback.length
    ? (allFeedback.reduce((sum, f) => sum + f.rating, 0) / allFeedback.length).toFixed(1)
    : null;

  const hourCounts = new Array(24).fill(0);
  const [reqsToday, ordsToday] = await Promise.all([
    QuickRequest.find({ created_at: { $gte: startOfDay } }),
    RoomServiceOrder.find({ created_at: { $gte: startOfDay } })
  ]);
  [...reqsToday, ...ordsToday].forEach(doc => { hourCounts[new Date(doc.created_at).getHours()]++; });
  const busiestHour = hourCounts.indexOf(Math.max(...hourCounts));

  res.json({
    requests_today: requestsToday,
    orders_today: ordersToday,
    feedback_today: feedbackToday,
    avg_rating: avgRating,
    busiest_hour: hourCounts.some(c => c > 0) ? busiestHour : null
  });
});

// ============ CSV EXPORT ============

function toCsv(rows, columns) {
  const header = columns.join(',');
  const lines = rows.map(row => columns.map(col => {
    let val = row[col];
    if (val === undefined || val === null) val = '';
    val = String(val).replace(/"/g, '""');
    return /[",\n]/.test(val) ? `"${val}"` : val;
  }).join(','));
  return [header, ...lines].join('\n');
}

app.get('/api/export/feedback.csv', requireStaff, async (req, res) => {
  const docs = await Feedback.find().sort({ created_at: -1 });
  const csv = toCsv(docs.map(toDTO), ['id', 'room_number', 'rating', 'comment', 'created_at']);
  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', 'attachment; filename="feedback.csv"');
  res.send(csv);
});

app.get('/api/export/orders.csv', requireStaff, async (req, res) => {
  const docs = await RoomServiceOrder.find().sort({ created_at: -1 });
  const rows = docs.map(d => {
    const dto = toDTO(d);
    return { ...dto, items: dto.items.map(i => i.name).join(' | ') };
  });
  const csv = toCsv(rows, ['id', 'room_number', 'items', 'total', 'status', 'created_at']);
  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', 'attachment; filename="orders.csv"');
  res.send(csv);
});

// ============ health check ============
app.get('/api/health', (req, res) => {
  res.json({ ok: true, db: mongoose.connection.readyState === 1 ? 'connected' : 'not connected' });
});

// ============ follow-up scheduler ============
async function runFollowUpCheck() {
  try {
    const cutoff = new Date(Date.now() - FOLLOWUP_HOURS * 60 * 60 * 1000);
    const dueOrders = await RoomServiceOrder.find({
      status: 'delivered',
      followed_up: false,
      delivered_at: { $ne: null, $lte: cutoff }
    });
    for (const order of dueOrders) {
      const text = 'Shpresojmë t\'ju ketë pëlqyer porosia! Nëse ju duhet diçka tjetër, jemi këtu. 🙂';
      const msgDoc = await Message.create({ room_number: order.room_number, sender: 'staff', text });
      const message = toDTO(msgDoc);
      io.to(roomChannel(order.room_number)).emit('new_message', message);
      io.to('staff').emit('new_message', message);
      order.followed_up = true;
      await order.save();
    }
  } catch (err) {
    console.error('Follow-up check failed:', err.message);
  }
}
setInterval(runFollowUpCheck, 5 * 60 * 1000);

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
    runFollowUpCheck();
  })
  .catch((err) => {
    console.error('MongoDB connection failed:', err.message);
    process.exit(1);
  });
