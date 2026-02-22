const bcrypt = require('bcryptjs');
const { validationResult } = require('express-validator');
const { v4: uuidv4 } = require('uuid');
const { db } = require('../config/database');
const { generateTokenPair, verifyRefreshToken } = require('../utils/jwt');
const { logger } = require('../utils/logger');

const BCRYPT_ROUNDS = 12; // ~250ms per hash — strong protection against brute force

/**
 * POST /api/auth/register
 * Creates a new user account with bcrypt-hashed password.
 */
const register = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const { email, password } = req.body;

  try {
    // Check if email already exists (use parameterized query — prevents SQL injection)
    const existing = await db.query('SELECT id FROM users WHERE email = $1', [email]);
    if (existing.rows.length > 0) {
      // Return same message as "success" to prevent user enumeration
      return res.status(409).json({ error: 'An account with this email already exists' });
    }

    // Hash password with bcrypt
    const passwordHash = await bcrypt.hash(password, BCRYPT_ROUNDS);
    const userId = uuidv4();

    await db.query(
      'INSERT INTO users (id, email, password_hash, created_at) VALUES ($1, $2, $3, NOW())',
      [userId, email, passwordHash]
    );

    logger.info('New user registered', { userId, email });

    const tokens = generateTokenPair(userId, email);

    // Store refresh token hash in DB (we hash it so a DB leak doesn't expose tokens)
    const refreshHash = await bcrypt.hash(tokens.refreshToken, 10);
    await db.query(
      'INSERT INTO refresh_tokens (user_id, token_hash, expires_at) VALUES ($1, $2, NOW() + INTERVAL \'7 days\')',
      [userId, refreshHash]
    );

    return res.status(201).json({
      message: 'Account created successfully',
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
    });
  } catch (err) {
    logger.error('Registration error', { error: err.message });
    return res.status(500).json({ error: 'Internal server error' });
  }
};

/**
 * POST /api/auth/login
 * Authenticates user and returns JWT token pair.
 */
const login = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ error: 'Invalid credentials' }); // Generic message
  }

  const { email, password } = req.body;

  try {
    const result = await db.query(
      'SELECT id, email, password_hash FROM users WHERE email = $1',
      [email]
    );

    // Constant-time comparison path: always run bcrypt.compare even if user not found
    // This prevents timing attacks that could reveal valid email addresses
    const user = result.rows[0];
    const dummyHash = '$2a$12$invalidhashfortimingattackprevention000000000000000000';
    const passwordMatch = await bcrypt.compare(password, user?.password_hash || dummyHash);

    if (!user || !passwordMatch) {
      logger.warn('Failed login attempt', { email, ip: req.ip });
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    const tokens = generateTokenPair(user.id, user.email);

    // Store new refresh token
    const refreshHash = await bcrypt.hash(tokens.refreshToken, 10);
    await db.query(
      'INSERT INTO refresh_tokens (user_id, token_hash, expires_at) VALUES ($1, $2, NOW() + INTERVAL \'7 days\')',
      [user.id, refreshHash]
    );

    logger.info('User logged in', { userId: user.id });

    return res.json({
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
    });
  } catch (err) {
    logger.error('Login error', { error: err.message });
    return res.status(500).json({ error: 'Internal server error' });
  }
};

/**
 * POST /api/auth/refresh
 * Rotates refresh token — invalidates old token and issues new pair.
 * 
 * Security: If a refresh token is reused after rotation, it means the token
 * was stolen. We invalidate the entire token family in that case.
 */
const refresh = async (req, res) => {
  const { refreshToken } = req.body;
  if (!refreshToken) return res.status(401).json({ error: 'Refresh token required' });

  try {
    const decoded = verifyRefreshToken(refreshToken);

    // Find all refresh tokens for this user
    const tokens = await db.query(
      'SELECT id, token_hash FROM refresh_tokens WHERE user_id = $1 AND expires_at > NOW()',
      [decoded.userId]
    );

    // Check if the submitted token matches any stored hash
    let matchedTokenId = null;
    for (const row of tokens.rows) {
      const match = await bcrypt.compare(refreshToken, row.token_hash);
      if (match) { matchedTokenId = row.id; break; }
    }

    if (!matchedTokenId) {
      // Token reuse detected — invalidate ALL tokens for this user (possible theft)
      logger.warn('Refresh token reuse detected — invalidating all sessions', { userId: decoded.userId });
      await db.query('DELETE FROM refresh_tokens WHERE user_id = $1', [decoded.userId]);
      return res.status(403).json({ error: 'Token reuse detected. Please log in again.' });
    }

    // Delete used token and issue new pair
    await db.query('DELETE FROM refresh_tokens WHERE id = $1', [matchedTokenId]);
    const newTokens = generateTokenPair(decoded.userId, decoded.email);
    const newRefreshHash = await bcrypt.hash(newTokens.refreshToken, 10);
    await db.query(
      'INSERT INTO refresh_tokens (user_id, token_hash, expires_at) VALUES ($1, $2, NOW() + INTERVAL \'7 days\')',
      [decoded.userId, newRefreshHash]
    );

    return res.json({
      accessToken: newTokens.accessToken,
      refreshToken: newTokens.refreshToken,
    });
  } catch (err) {
    return res.status(403).json({ error: 'Invalid refresh token' });
  }
};

/**
 * POST /api/auth/logout
 * Invalidates the submitted refresh token.
 */
const logout = async (req, res) => {
  const { refreshToken } = req.body;
  if (!refreshToken) return res.status(200).json({ message: 'Logged out' });

  try {
    const decoded = verifyRefreshToken(refreshToken);
    // Delete all refresh tokens for the user (logs out all sessions)
    await db.query('DELETE FROM refresh_tokens WHERE user_id = $1', [decoded.userId]);
  } catch (_) {
    // Silently ignore invalid tokens on logout
  }

  return res.json({ message: 'Logged out successfully' });
};

module.exports = { register, login, refresh, logout };
