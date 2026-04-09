const express = require('express');
const db = require('../models/db');
const auth = require('../middleware/auth');

const router = express.Router();
router.use(auth);

// ─── Dashboard summary ────────────────────────────────────────────────────────
// GET /api/analytics/dashboard?dateFrom=&dateTo=
router.get('/dashboard', async (req, res) => {
  const { dateFrom, dateTo } = req.query;
  const userId = req.userId;

  try {
    // Revenue & commissions from detail report
    const detail = await db.query(
      `SELECT
        COALESCE(SUM(ppvz_for_pay), 0)       AS revenue,
        COALESCE(SUM(delivery_rub), 0)        AS logistics,
        COALESCE(SUM(penalty), 0)             AS penalties,
        COALESCE(SUM(additional_payment), 0)  AS add_payment,
        COALESCE(SUM(acquiring_fee), 0)       AS acquiring,
        COALESCE(SUM(ppvz_reward), 0)         AS wb_reward,
        COALESCE(SUM(retail_amount), 0)       AS gross_revenue,
        COUNT(*) FILTER (WHERE doc_type_name='Продажа') AS sales_count,
        COUNT(*) FILTER (WHERE doc_type_name='Возврат') AS returns_count
       FROM wb_detail_report
       WHERE user_id=$1 AND date_from>=$2 AND date_to<=$3`,
      [userId, dateFrom, dateTo]
    );

    // Storage costs
    const storage = await db.query(
      `SELECT
        COALESCE(SUM(storage_cost), 0) AS storage_cost,
        COALESCE(SUM(logistics), 0)    AS storage_logistics
       FROM wb_paid_storage
       WHERE user_id=$1 AND date>=$2 AND date<=$3`,
      [userId, dateFrom, dateTo]
    );

    // Orders count
    const orders = await db.query(
      `SELECT
        COUNT(*) AS total_orders,
        COUNT(*) FILTER (WHERE is_cancel=FALSE) AS active_orders,
        COALESCE(SUM(total_price * (1 - discount_percent::numeric/100)), 0) AS orders_sum
       FROM wb_orders
       WHERE user_id=$1 AND date>=$2 AND date<=$3`,
      [userId, dateFrom, dateTo]
    );

    // Ads spend
    const ads = await db.query(
      `SELECT COALESCE(SUM(spend), 0) AS ads_spend
       FROM wb_ads
       WHERE user_id=$1 AND date>=$2 AND date<=$3`,
      [userId, dateFrom, dateTo]
    );

    const d = detail.rows[0];
    const s = storage.rows[0];
    const o = orders.rows[0];
    const a = ads.rows[0];

    const revenue = parseFloat(d.revenue);
    const logistics = parseFloat(d.logistics);
    const storageCost = parseFloat(s.storage_cost);
    const adsCost = parseFloat(a.ads_spend);
    const penalties = parseFloat(d.penalties);
    const acquiring = parseFloat(d.acquiring);

    const profit = revenue - logistics - storageCost - adsCost - penalties - acquiring;
    const margin = revenue > 0 ? (profit / parseFloat(d.gross_revenue)) * 100 : 0;

    res.json({
      revenue,
      gross_revenue: parseFloat(d.gross_revenue),
      logistics,
      storage_cost: storageCost,
      ads_spend: adsCost,
      penalties,
      acquiring,
      profit,
      margin: Math.round(margin * 100) / 100,
      sales_count: parseInt(d.sales_count),
      returns_count: parseInt(d.returns_count),
      total_orders: parseInt(o.total_orders),
      orders_sum: parseFloat(o.orders_sum),
    });
  } catch (err) {
    console.error('Dashboard error:', err);
    res.status(500).json({ error: err.message });
  }
});

// ─── Revenue by category ──────────────────────────────────────────────────────
// GET /api/analytics/by-category?dateFrom=&dateTo=
router.get('/by-category', async (req, res) => {
  const { dateFrom, dateTo } = req.query;
  try {
    const { rows } = await db.query(
      `SELECT
        subject_name AS category,
        COALESCE(SUM(ppvz_for_pay), 0)  AS revenue,
        COALESCE(SUM(retail_amount), 0) AS gross,
        COUNT(*) FILTER (WHERE doc_type_name='Продажа') AS sales,
        COUNT(*) FILTER (WHERE doc_type_name='Возврат') AS returns
       FROM wb_detail_report
       WHERE user_id=$1 AND date_from>=$2 AND date_to<=$3
       GROUP BY subject_name
       ORDER BY revenue DESC`,
      [req.userId, dateFrom, dateTo]
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── Revenue by day ───────────────────────────────────────────────────────────
// GET /api/analytics/by-day?dateFrom=&dateTo=
router.get('/by-day', async (req, res) => {
  const { dateFrom, dateTo } = req.query;
  try {
    const { rows } = await db.query(
      `SELECT
        date_trunc('day', rr_dt)::date AS day,
        COALESCE(SUM(ppvz_for_pay), 0)  AS revenue,
        COALESCE(SUM(retail_amount), 0) AS gross,
        COUNT(*) FILTER (WHERE doc_type_name='Продажа') AS sales,
        COUNT(*) FILTER (WHERE doc_type_name='Возврат') AS returns
       FROM wb_detail_report
       WHERE user_id=$1 AND date_from>=$2 AND date_to<=$3
       GROUP BY 1
       ORDER BY 1`,
      [req.userId, dateFrom, dateTo]
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── Top products ─────────────────────────────────────────────────────────────
// GET /api/analytics/top-products?dateFrom=&dateTo=&limit=10
router.get('/top-products', async (req, res) => {
  const { dateFrom, dateTo, limit = 10 } = req.query;
  try {
    const { rows } = await db.query(
      `SELECT
        d.nm_id,
        d.sa_name AS vendor_code,
        d.subject_name,
        COALESCE(SUM(d.ppvz_for_pay), 0)  AS revenue,
        COALESCE(SUM(d.retail_amount), 0) AS gross,
        COALESCE(SUM(d.delivery_rub), 0)  AS logistics,
        COUNT(*) FILTER (WHERE d.doc_type_name='Продажа') AS sales,
        COUNT(*) FILTER (WHERE d.doc_type_name='Возврат') AS returns
       FROM wb_detail_report d
       WHERE d.user_id=$1 AND d.date_from>=$2 AND d.date_to<=$3
       GROUP BY d.nm_id, d.sa_name, d.subject_name
       ORDER BY revenue DESC
       LIMIT $4`,
      [req.userId, dateFrom, dateTo, parseInt(limit)]
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── Storage costs by product ─────────────────────────────────────────────────
// GET /api/analytics/storage?dateFrom=&dateTo=
router.get('/storage', async (req, res) => {
  const { dateFrom, dateTo } = req.query;
  try {
    const { rows } = await db.query(
      `SELECT
        nm_id, vendor_code, subject_name, brand_name, warehouse_name,
        COALESCE(SUM(storage_cost), 0) AS storage_cost,
        COALESCE(SUM(logistics), 0)    AS logistics_cost
       FROM wb_paid_storage
       WHERE user_id=$1 AND date>=$2 AND date<=$3
       GROUP BY nm_id, vendor_code, subject_name, brand_name, warehouse_name
       ORDER BY storage_cost DESC
       LIMIT 100`,
      [req.userId, dateFrom, dateTo]
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── Ads performance ──────────────────────────────────────────────────────────
// GET /api/analytics/ads?dateFrom=&dateTo=
router.get('/ads', async (req, res) => {
  const { dateFrom, dateTo } = req.query;
  try {
    const { rows } = await db.query(
      `SELECT
        campaign_id,
        COALESCE(SUM(views), 0)    AS views,
        COALESCE(SUM(clicks), 0)   AS clicks,
        COALESCE(SUM(spend), 0)    AS spend,
        COALESCE(SUM(orders), 0)   AS orders,
        COALESCE(SUM(sum_price), 0) AS revenue,
        CASE WHEN SUM(clicks) > 0 THEN SUM(spend)::numeric / SUM(clicks) ELSE 0 END AS avg_cpc,
        CASE WHEN SUM(views) > 0 THEN SUM(clicks)::numeric / SUM(views) * 100 ELSE 0 END AS ctr
       FROM wb_ads
       WHERE user_id=$1 AND date>=$2 AND date<=$3
       GROUP BY campaign_id
       ORDER BY spend DESC`,
      [req.userId, dateFrom, dateTo]
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── Warehouses / stocks ──────────────────────────────────────────────────────
// GET /api/analytics/warehouses
router.get('/warehouses', async (req, res) => {
  try {
    const { rows } = await db.query(
      `SELECT nm_id, vendor_code, subject, brand,
              SUM(quantity) AS quantity,
              warehouse_name,
              SUM(in_way_to_client) AS in_way_to_client,
              SUM(in_way_from_client) AS in_way_from_client
       FROM wb_warehouses
       WHERE user_id=$1
       GROUP BY nm_id, vendor_code, subject, brand, warehouse_name
       ORDER BY quantity DESC`,
      [req.userId]
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
