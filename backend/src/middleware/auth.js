import jwt from 'jsonwebtoken';

// Create a JWT for a logged-in user.
export function createToken(user) {
  return jwt.sign(
    { id: String(user._id), name: user.name },
    process.env.JWT_SECRET,
    { expiresIn: '7d' }
  );
}

// Read and check a JWT.
export function getUserFromToken(token) {
  if (!token) throw new Error('No token');

  const data = jwt.verify(token, process.env.JWT_SECRET);
  return { id: data.id, name: data.name };
}

// Protect normal HTTP routes.
export function requireAuth(req, res, next) {
  try {
    const header = req.headers.authorization || '';
    const token = header.startsWith('Bearer ') ? header.slice(7) : null;

    req.user = getUserFromToken(token);
    next();
  } catch {
    res.status(401).json({ error: 'Unauthorized' });
  }
}
