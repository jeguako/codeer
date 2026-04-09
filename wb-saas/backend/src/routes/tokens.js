const express = require('express');
const db = require('../models/db');
const { encrypt, decrypt } = require('../services/crypto');
const { validateToken } = require('../services/wb-api');
const auth = require('../middleware/auth');

const router = express.Router();
router.use(auth);

// GET /api/tokens — list tokens
router.get('/', async (req, res) => {
  try {
    const { rows } = await db.query(
      'SELECT id,label,is_active,last_validated_at,created_at FROM wb_tokens WHERE user_id=$1 ORDER BY id',
      [req.userId]
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

// POST /api/tokens — add token
router.post('/', async (req, res) => {
  const { token, label } = req.body;
  if (!token || token.length < 30) return res.status(400).json({ error: 'Токен слишком короткий' });

  try {
    const valid = await validateToken(token);
    if (!valid) return res.status(400).json({ error: 'Токен WB недействителен (401/403)' });

    const encrypted = encrypt(token);
    const { rows } = await db.query(
      'INSERT INTO wb_tokens(user_id,token_encrypted,label,last_validated_at) VALUES($1,$2,$3,NOW()) RETURNING id,label,is_active,created_at',
      [req.userId, encrypted, label || 'Основной']
    );
    res.json(rows[0]);
  } catch (err) {
    console.error('Add token error:', err);
    res.status(500).json({ error: err.message || 'Ошибка сервера' });
  }
});

// DELETE /api/tokens/:id
router.delete('/:id', async (req, res) => {
  try {
    await db.query('DELETE FROM wb_tokens WHERE id=$1 AND user_id=$2', [req.params.id, req.userId]);
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

module.exports = router;
