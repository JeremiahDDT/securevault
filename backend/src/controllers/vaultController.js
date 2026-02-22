const { validationResult } = require('express-validator');
const { v4: uuidv4 } = require('uuid');
const axios = require('axios');
const { db } = require('../config/database');
const { logger } = require('../utils/logger');

const SECURITY_SERVICE = process.env.SECURITY_SERVICE_URL || 'http://localhost:8000';

/**
 * Calls the Python security microservice to encrypt plaintext content.
 * The Node API never handles the encryption key — it delegates to the microservice.
 */
const encryptContent = async (plaintext) => {
  const { data } = await axios.post(`${SECURITY_SERVICE}/encrypt`, { plaintext });
  return data; // { ciphertext, iv, tag }
};

const decryptContent = async (encrypted) => {
  const { data } = await axios.post(`${SECURITY_SERVICE}/decrypt`, encrypted);
  return data.plaintext;
};

/**
 * GET /api/vault
 * Returns all vault entries for the authenticated user (decrypted).
 * 
 * Security: user_id comes from the JWT, not the request body.
 * Users can never access another user's entries.
 */
const getEntries = async (req, res) => {
  try {
    const result = await db.query(
      'SELECT id, title, type, ciphertext, iv, auth_tag, created_at, updated_at FROM vault_entries WHERE user_id = $1 ORDER BY updated_at DESC',
      [req.user.id]
    );

    // Decrypt all entries
    const entries = await Promise.all(result.rows.map(async (row) => {
      const content = await decryptContent({
        ciphertext: row.ciphertext,
        iv: row.iv,
        tag: row.auth_tag,
      });
      return { id: row.id, title: row.title, type: row.type, content, createdAt: row.created_at, updatedAt: row.updated_at };
    }));

    return res.json({ entries });
  } catch (err) {
    logger.error('Get entries error', { userId: req.user.id, error: err.message });
    return res.status(500).json({ error: 'Failed to retrieve vault entries' });
  }
};

/**
 * POST /api/vault
 * Creates a new encrypted vault entry.
 */
const createEntry = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

  const { title, content, type } = req.body;

  try {
    const encrypted = await encryptContent(content);
    const entryId = uuidv4();

    await db.query(
      'INSERT INTO vault_entries (id, user_id, title, type, ciphertext, iv, auth_tag, created_at, updated_at) VALUES ($1, $2, $3, $4, $5, $6, $7, NOW(), NOW())',
      [entryId, req.user.id, title, type, encrypted.ciphertext, encrypted.iv, encrypted.tag]
    );

    logger.info('Vault entry created', { userId: req.user.id, entryId });
    return res.status(201).json({ id: entryId, message: 'Entry created successfully' });
  } catch (err) {
    logger.error('Create entry error', { userId: req.user.id, error: err.message });
    return res.status(500).json({ error: 'Failed to create vault entry' });
  }
};

/**
 * PUT /api/vault/:id
 * Updates an existing vault entry.
 * Security: Verifies ownership before update — user_id AND entry id must match.
 */
const updateEntry = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

  const { title, content, type } = req.body;
  const { id } = req.params;

  try {
    const encrypted = await encryptContent(content);

    // WHERE clause enforces ownership — can't update another user's entry
    const result = await db.query(
      'UPDATE vault_entries SET title=$1, type=$2, ciphertext=$3, iv=$4, auth_tag=$5, updated_at=NOW() WHERE id=$6 AND user_id=$7 RETURNING id',
      [title, type, encrypted.ciphertext, encrypted.iv, encrypted.tag, id, req.user.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Entry not found' });
    }

    return res.json({ message: 'Entry updated successfully' });
  } catch (err) {
    logger.error('Update entry error', { userId: req.user.id, entryId: id, error: err.message });
    return res.status(500).json({ error: 'Failed to update vault entry' });
  }
};

/**
 * DELETE /api/vault/:id
 * Security: Same ownership pattern — user_id must match.
 */
const deleteEntry = async (req, res) => {
  const { id } = req.params;

  try {
    const result = await db.query(
      'DELETE FROM vault_entries WHERE id = $1 AND user_id = $2 RETURNING id',
      [id, req.user.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Entry not found' });
    }

    logger.info('Vault entry deleted', { userId: req.user.id, entryId: id });
    return res.json({ message: 'Entry deleted successfully' });
  } catch (err) {
    logger.error('Delete entry error', { userId: req.user.id, error: err.message });
    return res.status(500).json({ error: 'Failed to delete vault entry' });
  }
};

module.exports = { getEntries, createEntry, updateEntry, deleteEntry };
