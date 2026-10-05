import { Router } from 'express';
import bcrypt from 'bcryptjs';  // used for passwordHasing
import User from '../models/User.js';
import { createToken, requireAuth } from '../middleware/auth.js';

const router = Router();

function publicUser(user) {
  return {
    id: String(user._id),
    name: user.name,
    email: user.email,
  };
}

router.post('/register', async (req, res) => {
  const { name, email, password } = req.body || {};

  if (!name || !email || !password || password.length < 6) {
    return res
      .status(400)
      .json({ error: 'Name, email and a 6+ character password are required' });
  }

  try {
    const cleanEmail = email.toLowerCase().trim();
    const existingUser = await User.findOne({ email: cleanEmail });

    if (existingUser) {
      return res.status(409).json({ error: 'Email already registered' });
    }

    const passwordHash = await bcrypt.hash(password, 10);

    const user = await User.create({
      name: name.trim(),
      email: cleanEmail,
      passwordHash,
    });

    res.status(201).json({
      token: createToken(user),
      user: publicUser(user),
    });
  } catch {
    res.status(500).json({ error: 'Registration failed' });
  }
});

router.post('/login', async (req, res) => {
  const { email, password } = req.body || {};
  const cleanEmail = email?.toLowerCase().trim();

  const user = cleanEmail ? await User.findOne({ email: cleanEmail }) : null;
  const passwordCorrect = user
    ? await bcrypt.compare(password || '', user.passwordHash)
    : false;

  if (!user || !passwordCorrect) {
    return res.status(401).json({ error: 'Invalid email or password' });
  }

  res.json({
    token: createToken(user),
    user: publicUser(user),
  });
});

router.get('/me', requireAuth, async (req, res) => {
  const user = await User.findById(req.user.id);

  if (!user) {
    return res.status(404).json({ error: 'User not found' });
  }

  res.json({ user: publicUser(user) });
});

export default router;
