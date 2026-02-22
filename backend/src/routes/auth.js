const express = require('express');
const rateLimit = require('express-rate-limit');
const { body } = require('express-validator');
const { register, login, refresh, logout } = require('../controllers/authController');

const authRouter = express.Router();

// ── Auth-specific Rate Limit ─────────────────────────────────────────────
// Stricter than global: 10 attempts per 15 minutes prevents brute force
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many authentication attempts. Try again in 15 minutes.' },
  skipSuccessfulRequests: true, // Only count failed attempts
});

// ── Validation Rules ─────────────────────────────────────────────────────
const registerValidation = [
  body('email')
    .isEmail().normalizeEmail()
    .withMessage('Valid email is required'),
  body('password')
    .isLength({ min: 12 }).withMessage('Password must be at least 12 characters')
    .matches(/[A-Z]/).withMessage('Password must contain an uppercase letter')
    .matches(/[a-z]/).withMessage('Password must contain a lowercase letter')
    .matches(/[0-9]/).withMessage('Password must contain a number')
    .matches(/[^A-Za-z0-9]/).withMessage('Password must contain a special character'),
];

const loginValidation = [
  body('email').isEmail().normalizeEmail(),
  body('password').notEmpty(),
];

// ── Routes ────────────────────────────────────────────────────────────────
authRouter.post('/register', authLimiter, registerValidation, register);
authRouter.post('/login', authLimiter, loginValidation, login);
authRouter.post('/refresh', refresh);
authRouter.post('/logout', logout);

module.exports = { authRouter };
