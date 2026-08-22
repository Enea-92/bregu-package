// Mongoose models — one collection per data type, mirroring the shape
// we used in the JSON-file version so the rest of the API stays the same.

const mongoose = require('mongoose');

const messageSchema = new mongoose.Schema(
  {
    room_number: { type: String, required: true, index: true },
    sender: { type: String, required: true, enum: ['guest', 'staff'] },
    text: { type: String, required: true }
  },
  { timestamps: { createdAt: 'created_at', updatedAt: false } }
);
// Auto-delete messages 45 minutes after they're created (MongoDB TTL index).
// MongoDB's background cleanup runs about once a minute, so deletion happens
// within ~45-46 minutes, not to-the-second.
messageSchema.index({ created_at: 1 }, { expireAfterSeconds: 45 * 60 });

const quickRequestSchema = new mongoose.Schema(
  {
    room_number: { type: String, required: true },
    request_type: { type: String, required: true },
    status: { type: String, default: 'pending' }
  },
  { timestamps: { createdAt: 'created_at', updatedAt: false } }
);

const roomServiceOrderSchema = new mongoose.Schema(
  {
    room_number: { type: String, required: true },
    items: [{ name: String, price: Number }],
    total: { type: Number, required: true },
    status: { type: String, default: 'pending' }, // pending | preparing | delivered
    delivered_at: { type: Date, default: null },
    followed_up: { type: Boolean, default: false }
  },
  { timestamps: { createdAt: 'created_at', updatedAt: false } }
);

const feedbackSchema = new mongoose.Schema(
  {
    room_number: { type: String, required: true },
    rating: { type: Number, required: true, min: 1, max: 5 },
    comment: { type: String, default: '' }
  },
  { timestamps: { createdAt: 'created_at', updatedAt: false } }
);

// Turn a Mongo document into the same plain shape the frontend already expects
// (id instead of _id, created_at as ISO string).
function toDTO(doc) {
  if (!doc) return null;
  const obj = doc.toObject ? doc.toObject() : doc;
  const { _id, __v, ...rest } = obj;
  return { id: _id.toString(), ...rest, created_at: obj.created_at ? obj.created_at.toISOString() : undefined };
}

// --- Editable hotel content (one singleton document holds it all) ---
const langText = { sq: String, en: String, it: String, de: String };

const hotelContentSchema = new mongoose.Schema({
  location: {
    lat: { type: Number, default: 39.7669 },
    lng: { type: Number, default: 19.9903 }
  },
  wifi: {
    ssid: { type: String, default: 'Bregu_Guest' },
    password: { type: String, default: 'bregu2026sun' }
  },
  amenities: [{ name: langText, note: langText }],
  locations: [{ name: langText, desc: langText, time: langText }],
  room_service: [{ name: langText, price: Number }]
});

// --- Recommendations (restaurants / bars / beaches), each with real coordinates ---
const recommendationSchema = new mongoose.Schema({
  category: { type: String, required: true, enum: ['restorante', 'bare', 'plazhe'] },
  name: { type: String, required: true },
  price_type: { type: String, enum: ['free', 'mid', 'high'], default: 'mid' },
  meta: langText,
  tip: langText,
  staff_pick: { type: Boolean, default: false },
  image_url: { type: String, default: '' },
  lat: Number,
  lng: Number
});

module.exports = {
  Message: mongoose.model('Message', messageSchema),
  QuickRequest: mongoose.model('QuickRequest', quickRequestSchema),
  RoomServiceOrder: mongoose.model('RoomServiceOrder', roomServiceOrderSchema),
  Feedback: mongoose.model('Feedback', feedbackSchema),
  HotelContent: mongoose.model('HotelContent', hotelContentSchema),
  Recommendation: mongoose.model('Recommendation', recommendationSchema),
  toDTO
};
