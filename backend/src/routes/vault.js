const express = require('express');
const { body } = require('express-validator');
const { authenticateToken } = require('../middleware/auth');
const { getEntries, createEntry, updateEntry, deleteEntry } = require('../controllers/vaultController');

const vaultRouter = express.Router();

// All vault routes require a valid JWT
vaultRouter.use(authenticateToken);

const entryValidation = [
  body('title').trim().isLength({ min: 1, max: 100 }).escape(),
  body('content').trim().isLength({ min: 1, max: 10000 }),
  body('type').isIn(['note', 'credential', 'card']),
];

vaultRouter.get('/', getEntries);
vaultRouter.post('/', entryValidation, createEntry);
vaultRouter.put('/:id', entryValidation, updateEntry);
vaultRouter.delete('/:id', deleteEntry);

module.exports = { vaultRouter };
