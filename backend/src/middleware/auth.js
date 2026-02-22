const jwt = require('jsonwebtoken');
const { logger } = require('../utils/logger');

/**
 * Middleware: Verify JWT access token on protected routes.
 * 
 * Security notes:
 * - We verify the token signature using the server-side secret
 * - We never trust the user_id sent in the request body — only the one in the token
 * - Short expiry (15m) limits the damage window if a token is stolen
 */
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; // "Bearer <token>"

  if (!token) {
    return res.status(401).json({ error: 'Access token required' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_ACCESS_SECRET);
    req.user = { id: decoded.userId, email: decoded.email };
    next();
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      return res.status(401).json({ error: 'Access token expired', code: 'TOKEN_EXPIRED' });
    }
    logger.warn('Invalid token attempt', { ip: req.ip, error: err.message });
    return res.status(403).json({ error: 'Invalid access token' });
  }
};

module.exports = { authenticateToken };
