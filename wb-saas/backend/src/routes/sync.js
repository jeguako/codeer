const express = require('express');
const auth = require('../middleware/auth');
const db = require('../models/db');
const syncService = require('../services/sync');

const router = express.Router();
router.use(auth);

// POST /api/sync/paid-storage
router.post('/paid-storage', async (req, res) => {
  const { dateFrom, dateTo } = req.body;
  if (!dateFrom || !dateTo) return res.status(400).json({ error: 'Укажите dateFrom и dateTo' });
  try {
    const result = await syncService.syncPaidStorage(req.userId, dateFrom, dateTo);
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/sync/detail-report
router.post('/detail-report', async (req, res) => {
  const { dateFrom, dateTo } = req.body;
  if (!dateFrom || !dateTo) return res.status(400).json({ error: 'Укажите dateFrom и dateTo' });
  try {
    const result = await syncService.syncDetailReport(req.userId, dateFrom, dateTo);
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/sync/orders
router.post('/orders', async (req, res) => {
  const { dateFrom } = req.body;
  if (!dateFrom) return res.status(400).json({ error: 'Укажите dateFrom' });
  try {
    const result = await syncService.syncOrders(req.userId, dateFrom);
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/sync/sales
router.post('/sales', async (req, res) => {
  const { dateFrom } = req.body;
  if (!dateFrom) return res.status(400).json({ error: 'Укажите dateFrom' });
  try {
    const result = await syncService.syncSales(req.userId, dateFrom);
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/sync/products
router.post('/products', async (req, res) => {
  try {
    const result = await syncService.syncProducts(req.userId);
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/sync/stocks
router.post('/stocks', async (req, res) => {
  try {
    const result = await syncService.syncStocks(req.userId);
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/sync/jobs — recent jobs
router.get('/jobs', async (req, res) => {
  try {
    const { rows } = await db.query(
      'SELECT id,type,status,date_from,date_to,rows_loaded,error_message,started_at,finished_at FROM sync_jobs WHERE user_id=$1 ORDER BY id DESC LIMIT 20',
      [req.userId]
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

module.exports = router;
