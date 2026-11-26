import express from 'express';
import mongoose from 'mongoose';
import cors from 'cors';
import dotenv from 'dotenv';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { z } from 'zod';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const app = express();
app.use(cors());
app.use(express.json());

// --- Mongoose Models ---
const adminSchema = new mongoose.Schema({
  email: { type: String, required: true, unique: true, lowercase: true },
  passwordHash: { type: String, required: true }
});
const Admin = mongoose.model('Admin', adminSchema);

const feedbackSchema = new mongoose.Schema({
  name: { type: String, trim: true, maxlength: 80, default: 'Anonymous' },
  rating: { type: Number, required: true, min: 1, max: 5 },
  category: {
    type: String,
    required: true,
    enum: ['Product / Service', 'Staff / Support', 'Website / Digital Experience', 'Other']
  },
  message: { type: String, required: true, trim: true, minlength: 10, maxlength: 1200 },
  createdAt: { type: Date, default: Date.now }
});
const Feedback = mongoose.model('Feedback', feedbackSchema);

// --- Validation ---
const feedbackInputSchema = z.object({
  name: z.string().max(80).optional().or(z.literal('')),
  rating: z.coerce.number().int().min(1).max(5),
  category: z.enum(['Product / Service', 'Staff / Support', 'Website / Digital Experience', 'Other']),
  message: z.string().trim().min(10, 'Message must be at least 10 characters').max(1200)
});


// --- Auth Middleware ---
function requireAdmin(req, res, next) {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) return res.status(401).json({ error: 'Unauthorized' });
  try {
    req.admin = jwt.verify(header.slice(7), process.env.JWT_SECRET);
    next();
  } catch {
    res.status(401).json({ error: 'Invalid or expired token' });
  }
}

// --- Routes ---
app.get('/api/config', (req, res) => {
  res.json({ businessName: process.env.BUSINESS_NAME || 'SOFTRATE TECH' });
});

app.post('/api/feedback', async (req, res) => {
  const parsed = feedbackInputSchema.safeParse(req.body);
  if (!parsed.success) {
  return res.status(400).json({ error: parsed.error.issues[0]?.message || JSON.stringify(parsed.error.issues) });
}

  const { name, rating, category, message } = parsed.data;
  const doc = await Feedback.create({
    name: name?.trim() || 'Anonymous',
    rating,
    category,
    message
  });
  res.status(201).json(doc);
});

app.post('/api/auth/login', async (req, res) => {
  const { email, password } = req.body || {};
  const admin = await Admin.findOne({ email: String(email || '').toLowerCase().trim() });
  if (!admin || !(await bcrypt.compare(String(password || ''), admin.passwordHash))) {
    return res.status(401).json({ error: 'Invalid email or password' });
  }
  const token = jwt.sign({ id: admin._id, email: admin.email }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || '8h'
  });
  res.json({ token, email: admin.email });
});

app.get('/api/admin/feedback', requireAdmin, async (req, res) => {
  const filter = {};
  if (req.query.rating) filter.rating = Number(req.query.rating);
  if (req.query.category) filter.category = req.query.category;

  const [items, allStats] = await Promise.all([
    Feedback.find(filter).sort({ createdAt: -1 }),
    Feedback.aggregate([
      {
        $group: {
          _id: null,
          total: { $sum: 1 },
          averageRating: { $avg: '$rating' },
          fiveStarCount: { $sum: { $cond: [{ $eq: ['$rating', 5] }, 1, 0] } }
        }
      }
    ])
  ]);

  const raw = allStats[0] || { total: 0, averageRating: 0, fiveStarCount: 0 };
  res.json({
    items,
    stats: {
      total: raw.total,
      averageRating: Number((raw.averageRating || 0).toFixed(1)),
      fiveStarCount: raw.fiveStarCount
    }
  });
});

app.delete('/api/admin/feedback/:id', requireAdmin, async (req, res) => {
  await Feedback.findByIdAndDelete(req.params.id);
  res.json({ ok: true });
});

// --- Boot & Seed Admin ---
async function start() {
  await mongoose.connect(process.env.MONGODB_URI);
  console.log('MongoDB connected:', process.env.MONGODB_URI);

  const count = await Admin.countDocuments();
  if (count === 0 && process.env.ADMIN_EMAIL && process.env.ADMIN_PASSWORD) {
    const passwordHash = await bcrypt.hash(process.env.ADMIN_PASSWORD, 10);
    await Admin.create({ email: process.env.ADMIN_EMAIL, passwordHash });
    console.log('Seeded admin:', process.env.ADMIN_EMAIL);
  }

  const port = process.env.PORT || 5000;
  app.listen(port, () => console.log(`Server running on http://localhost:${port}`));
}

start().catch((err) => {
  console.error('Startup failed:', err);
  process.exit(1);
});
