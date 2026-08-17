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
    status: { type: String, default: 'pending' }
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

module.exports = {
  Message: mongoose.model('Message', messageSchema),
  QuickRequest: mongoose.model('QuickRequest', quickRequestSchema),
  RoomServiceOrder: mongoose.model('RoomServiceOrder', roomServiceOrderSchema),
  Feedback: mongoose.model('Feedback', feedbackSchema),
  toDTO
};
