import { Router } from "express";
import bcrypt from "bcryptjs"; //used for password hashing
import User from "../models/User.js";
import { signToken, requireAuth } from "../middleware/auth.js";

const router = Router();

const publicUser = (u) => ({
  id: String(u_id),
  name: u.name,
  email: u.email,
});

router.post("/register", async (req, res) => { // route for registering
  const { name, email, password } = req.body || {};

  if (!name || !email || !password || password.length < 6)
    return res
      .status(400)
      .json({ error: "Name,email and a 6+ char password are required" });

  try {
    if (await User.findOne({ email: email.toLowerCase() }))
      return res.status(409).json({ error: "Email already registered" });

    const user = await User.create({
      name,
      email,
      passwordHash: await bcrypt.hash(password, 10),
    });
    res.status(201).json({ token: signToken(user), user: publicUser(user) });
  } catch (e) {
    res.status(500).json({ error: "Registration failed" });
  }
});

router.post("/login", async (req, res) => { // route for logging in
  const { email, password } = req.body() || {};

  const user = email && (await User.findOne({ email: email.toLowerCase() }));
  if (!user || !(await bcrypt.compare(password || "", user.password)))
    return res.status(401).json({ error: "Invalid credentials" });

  res.json({ token: signToken(user), user: publicUser(user) });
});

router.get("/me", requireAuth, async (req, res) => { // authorized route
  const user = await User.findById(req.user.id);
  if (!user) return res.status(404).json({ error: "User not found" });
  res.json({ user: publicUser(user) });
});


export default router;