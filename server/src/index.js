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
  status: {
    type: String,
    enum: ['New', 'Reviewed', 'Resolved'],
    default: 'New'
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

// --- Public Routes ---
app.get('/api/config', (req, res) => {
  res.json({ businessName: process.env.BUSINESS_NAME || 'SOFTRATE TECH' });
});

app.post('/api/feedback', async (req, res) => {
  const parsed = feedbackInputSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.issues.at(0)?.message || 'Invalid input' });
  }
  const { name, rating, category, message } = parsed.data;
  const doc = await Feedback.create({
    name: name?.trim() || 'Anonymous',
    rating,
    category,
    status: 'New',
    message
  });
  res.status(201).json(doc);
});

// --- Auth Routes ---
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

// --- Protected Admin Routes ---
app.get('/api/admin/feedback', requireAdmin, async (req, res) => {
  const filter = {};
  if (req.query.rating) filter.rating = Number(req.query.rating);
  if (req.query.category) filter.category = req.query.category;
  if (req.query.status) {
    filter.status = req.query.status === 'New' ? { $in: ['New', null] } : req.query.status;
  }
  if (req.query.search && String(req.query.search).trim()) {
    const escaped = String(req.query.search).trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    filter.$or = [
      { name: { $regex: escaped, $options: 'i' } },
      { message: { $regex: escaped, $options: 'i' } }
    ];
  }

  const page = Math.max(1, Number(req.query.page) || 1);
  const limit = Math.min(50, Math.max(1, Number(req.query.limit) || 5));
  const skip = (page - 1) * limit;

  const [items, filteredCount, allStats] = await Promise.all([
    Feedback.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit),
    Feedback.countDocuments(filter),
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

  const raw = allStats.at(0) || { total: 0, averageRating: 0, fiveStarCount: 0 };
  res.json({
    items,
    pagination: {
      page,
      limit,
      totalFiltered: filteredCount,
      totalPages: Math.max(1, Math.ceil(filteredCount / limit))
    },
    stats: {
      total: raw.total,
      averageRating: Number((raw.averageRating || 0).toFixed(1)),
      fiveStarCount: raw.fiveStarCount
    }
  });
});

app.patch('/api/admin/feedback/:id/status', requireAdmin, async (req, res) => {
  const { status } = req.body || {};
  if (!['New', 'Reviewed', 'Resolved'].includes(status)) {
    return res.status(400).json({ error: 'Invalid status value' });
  }
  const updated = await Feedback.findByIdAndUpdate(
    req.params.id,
    { $set: { status } },
    { new: true }
  );
  if (!updated) return res.status(404).json({ error: 'Feedback not found' });
  res.json(updated);
});

app.delete('/api/admin/feedback/:id', requireAdmin, async (req, res) => {
  await Feedback.findByIdAndDelete(req.params.id);
  res.json({ ok: true });
});

app.get('/api/admin/analytics', requireAdmin, async (req, res) => {
  const [facet] = await Feedback.aggregate([
    {
      $facet: {
        summary: [
          {
            $group: {
              _id: null,
              total: { $sum: 1 },
              averageRating: { $avg: '$rating' },
              fiveStarCount: { $sum: { $cond: [{ $eq: ['$rating', 5] }, 1, 0] } },
              resolvedCount: { $sum: { $cond: [{ $eq: ['$status', 'Resolved'] }, 1, 0] } }
            }
          }
        ],
        byRating: [{ $group: { _id: '$rating', count: { $sum: 1 } } }],
        byCategory: [{ $group: { _id: '$category', count: { $sum: 1 } } }],
        byStatus: [
          {
            $group: {
              _id: { $ifNull: ['$status', 'New'] },
              count: { $sum: 1 }
            }
          }
        ]
      }
    }
  ]);

  const sum = facet?.summary?.at(0) || {
    total: 0,
    averageRating: 0,
    fiveStarCount: 0,
    resolvedCount: 0
  };

  res.json({
    summary: {
      total: sum.total,
      averageRating: Number((sum.averageRating || 0).toFixed(1)),
      fiveStarCount: sum.fiveStarCount,
      resolvedCount: sum.resolvedCount,
      resolutionRate: sum.total > 0 ? Math.round((sum.resolvedCount / sum.total) * 100) : 0
    },
    byRating: facet?.byRating || [],
    byCategory: facet?.byCategory || [],
    byStatus: facet?.byStatus || []
  });
});

app.patch('/api/admin/password', requireAdmin, async (req, res) => {
  const { currentPassword, newPassword } = req.body || {};
  if (!newPassword || String(newPassword).length < 8) {
    return res.status(400).json({ error: 'New password must be at least 8 characters' });
  }
  const admin = await Admin.findById(req.admin.id);
  if (!admin || !(await bcrypt.compare(String(currentPassword || ''), admin.passwordHash))) {
    return res.status(401).json({ error: 'Current password is incorrect' });
  }
  admin.passwordHash = await bcrypt.hash(String(newPassword), 10);
  await admin.save();
  res.json({ ok: true });
});

// --- Serve Frontend in Production ---
const clientDist = path.resolve(__dirname, '../../client/dist');
app.use(express.static(clientDist));
app.use((req, res) => {
  res.sendFile(path.join(clientDist, 'index.html'));
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
