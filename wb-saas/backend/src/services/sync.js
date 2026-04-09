const db = require('../models/db');
const { decrypt } = require('./crypto');
const wbApi = require('./wb-api');

// ─── helpers ──────────────────────────────────────────────────────────────────
function fmtDate(d) {
  return d.toISOString().slice(0, 10);
}

async function getUserToken(userId) {
  const { rows } = await db.query(
    'SELECT token_encrypted FROM wb_tokens WHERE user_id=$1 AND is_active=TRUE ORDER BY id DESC LIMIT 1',
    [userId]
  );
  if (!rows.length) throw new Error('WB API-токен не найден. Добавьте токен в настройках.');
  return decrypt(rows[0].token_encrypted);
}

async function createJob(userId, type, dateFrom, dateTo) {
  const { rows } = await db.query(
    'INSERT INTO sync_jobs(user_id,type,status,date_from,date_to,started_at) VALUES($1,$2,$3,$4,$5,NOW()) RETURNING id',
    [userId, type, 'running', dateFrom || null, dateTo || null]
  );
  return rows[0].id;
}

async function finishJob(jobId, rowsLoaded, error = null) {
  await db.query(
    'UPDATE sync_jobs SET status=$1, rows_loaded=$2, error_message=$3, finished_at=NOW() WHERE id=$4',
    [error ? 'error' : 'done', rowsLoaded, error, jobId]
  );
}

// ─── Sync: Paid Storage ───────────────────────────────────────────────────────
async function syncPaidStorage(userId, dateFrom, dateTo) {
  const jobId = await createJob(userId, 'paid_storage', dateFrom, dateTo);
  try {
    const token = await getUserToken(userId);
    const rows = await wbApi.getPaidStorage(token, dateFrom, dateTo);

    let inserted = 0;
    for (const r of rows) {
      await db.query(
        `INSERT INTO wb_paid_storage(user_id,date,nm_id,vendor_code,subject_name,warehouse_name,
         volume,calc_type,warehouse_coeff,box_type_name,category_name,brand_name,sc_code,logistics,storage_cost)
         VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15)
         ON CONFLICT(user_id,date,nm_id) DO UPDATE SET
         storage_cost=EXCLUDED.storage_cost, logistics=EXCLUDED.logistics`,
        [
          userId,
          r.date,
          r.nmId,
          r.vendorCode,
          r.subjectName,
          r.warehouseName,
          r.volume,
          r.calcType,
          r.warehouseCoeff,
          r.boxTypeName,
          r.categoryName,
          r.brandName,
          r.SCCode,
          r.logistics,
          r.storageCost,
        ]
      );
      inserted++;
    }
    await finishJob(jobId, inserted);
    return { count: inserted };
  } catch (err) {
    await finishJob(jobId, 0, err.message);
    throw err;
  }
}

// ─── Sync: Detail Report ──────────────────────────────────────────────────────
async function syncDetailReport(userId, dateFrom, dateTo) {
  const jobId = await createJob(userId, 'detail_report', dateFrom, dateTo);
  try {
    const token = await getUserToken(userId);
    const rows = await wbApi.getDetailReport(token, dateFrom, dateTo);

    let inserted = 0;
    for (const r of rows) {
      await db.query(
        `INSERT INTO wb_detail_report(user_id,realizationreport_id,date_from,date_to,create_dt,nm_id,
         subject_name,sa_name,ts_name,barcode,doc_type_name,quantity,retail_price,retail_amount,
         sale_percent,commission_percent,supplier_oper_name,order_dt,sale_dt,rr_dt,
         delivery_amount,return_amount,delivery_rub,penalty,additional_payment,
         ppvz_vw,ppvz_vw_nds,ppvz_for_pay,acquiring_fee,acquiring_percent,
         ppvz_reward,ppvz_spp_prc,ppvz_kvw_prc_base,office_name,supplier_promo)
         VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22,$23,$24,$25,$26,$27,$28,$29,$30,$31,$32,$33,$34,$35)
         ON CONFLICT(user_id,realizationreport_id) DO NOTHING`,
        [
          userId,
          r.realizationreport_id,
          r.date_from,
          r.date_to,
          r.create_dt,
          r.nm_id,
          r.subject_name,
          r.sa_name,
          r.ts_name,
          r.barcode,
          r.doc_type_name,
          r.quantity,
          r.retail_price,
          r.retail_amount,
          r.sale_percent,
          r.commission_percent,
          r.supplier_oper_name,
          r.order_dt,
          r.sale_dt,
          r.rr_dt,
          r.delivery_amount,
          r.return_amount,
          r.delivery_rub,
          r.penalty,
          r.additional_payment,
          r.ppvz_vw,
          r.ppvz_vw_nds,
          r.ppvz_for_pay,
          r.acquiring_fee,
          r.acquiring_percent,
          r.ppvz_reward,
          r.ppvz_spp_prc,
          r.ppvz_kvw_prc_base,
          r.office_name,
          r.supplier_promo,
        ]
      );
      inserted++;
    }
    await finishJob(jobId, inserted);
    return { count: inserted };
  } catch (err) {
    await finishJob(jobId, 0, err.message);
    throw err;
  }
}

// ─── Sync: Orders ─────────────────────────────────────────────────────────────
async function syncOrders(userId, dateFrom) {
  const jobId = await createJob(userId, 'orders', dateFrom, null);
  try {
    const token = await getUserToken(userId);
    const rows = await wbApi.getOrders(token, dateFrom);

    let inserted = 0;
    for (const r of rows) {
      await db.query(
        `INSERT INTO wb_orders(user_id,g_number,date,last_change_date,supplier_article,tech_size,barcode,
         total_price,discount_percent,warehouse_name,oblast,income_id,odid,nm_id,subject,category,brand,is_cancel,cancel_dt)
         VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19)
         ON CONFLICT(user_id,odid) DO UPDATE SET last_change_date=EXCLUDED.last_change_date, is_cancel=EXCLUDED.is_cancel, cancel_dt=EXCLUDED.cancel_dt`,
        [
          userId,
          r.gNumber,
          r.date,
          r.lastChangeDate,
          r.supplierArticle,
          r.techSize,
          r.barcode,
          r.totalPrice,
          r.discountPercent,
          r.warehouseName,
          r.oblast,
          r.incomeID,
          r.odid,
          r.nmId,
          r.subject,
          r.category,
          r.brand,
          r.isCancel,
          r.cancelDt,
        ]
      );
      inserted++;
    }
    await finishJob(jobId, inserted);
    return { count: inserted };
  } catch (err) {
    await finishJob(jobId, 0, err.message);
    throw err;
  }
}

// ─── Sync: Sales ──────────────────────────────────────────────────────────────
async function syncSales(userId, dateFrom) {
  const jobId = await createJob(userId, 'sales', dateFrom, null);
  try {
    const token = await getUserToken(userId);
    const rows = await wbApi.getSales(token, dateFrom);

    let inserted = 0;
    for (const r of rows) {
      await db.query(
        `INSERT INTO wb_sales(user_id,g_number,date,last_change_date,supplier_article,tech_size,barcode,
         total_price,discount_percent,is_supply,is_realization,promo_code_discount,warehouse_name,
         country_name,oblast_okrug_name,region_name,income_id,sale_id,odid,spp,for_pay,finished_price,
         price_with_disc,nm_id,subject,category,brand,is_storno)
         VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22,$23,$24,$25,$26,$27,$28)
         ON CONFLICT(user_id,sale_id) DO NOTHING`,
        [
          userId,
          r.gNumber,
          r.date,
          r.lastChangeDate,
          r.supplierArticle,
          r.techSize,
          r.barcode,
          r.totalPrice,
          r.discountPercent,
          r.isSupply,
          r.isRealization,
          r.promoCodeDiscount,
          r.warehouseName,
          r.countryName,
          r.oblastOkrugName,
          r.regionName,
          r.incomeID,
          r.saleID,
          r.odid,
          r.spp,
          r.forPay,
          r.finishedPrice,
          r.priceWithDisc,
          r.nmId,
          r.subject,
          r.category,
          r.brand,
          r.isStorno,
        ]
      );
      inserted++;
    }
    await finishJob(jobId, inserted);
    return { count: inserted };
  } catch (err) {
    await finishJob(jobId, 0, err.message);
    throw err;
  }
}

// ─── Sync: Products ───────────────────────────────────────────────────────────
async function syncProducts(userId) {
  const jobId = await createJob(userId, 'products', null, null);
  try {
    const token = await getUserToken(userId);
    const cards = await wbApi.getProductCards(token);

    let inserted = 0;
    for (const c of cards) {
      await db.query(
        `INSERT INTO wb_products(user_id,nm_id,imt_id,nm_uuid,vendor_code,subject_name,subject_id,brand,title,updated_at)
         VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,NOW())
         ON CONFLICT(user_id,nm_id) DO UPDATE SET vendor_code=EXCLUDED.vendor_code, title=EXCLUDED.title, updated_at=NOW()`,
        [
          userId,
          c.nmID,
          c.imtID,
          c.nmUUID,
          c.vendorCode,
          c.subjectName,
          c.subjectID,
          c.brand,
          c.title,
        ]
      );
      inserted++;
    }
    await finishJob(jobId, inserted);
    return { count: inserted };
  } catch (err) {
    await finishJob(jobId, 0, err.message);
    throw err;
  }
}

// ─── Sync: Stocks ─────────────────────────────────────────────────────────────
async function syncStocks(userId) {
  const jobId = await createJob(userId, 'stocks', null, null);
  try {
    const token = await getUserToken(userId);
    const yesterday = fmtDate(new Date(Date.now() - 86400000));
    const stocks = await wbApi.getStocks(token, yesterday);

    // Clear and re-insert for freshness
    await db.query('DELETE FROM wb_warehouses WHERE user_id=$1', [userId]);

    let inserted = 0;
    for (const r of stocks) {
      await db.query(
        `INSERT INTO wb_warehouses(user_id,nm_id,vendor_code,subject,brand,quantity,warehouse_name,in_way_to_client,in_way_from_client,updated_at)
         VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,NOW())
         ON CONFLICT(user_id,nm_id,warehouse_name) DO UPDATE SET quantity=EXCLUDED.quantity, updated_at=NOW()`,
        [
          userId,
          r.nmId,
          r.supplierArticle,
          r.subject,
          r.brand,
          r.quantity,
          r.warehouseName,
          r.inWayToClient,
          r.inWayFromClient,
        ]
      );
      inserted++;
    }
    await finishJob(jobId, inserted);
    return { count: inserted };
  } catch (err) {
    await finishJob(jobId, 0, err.message);
    throw err;
  }
}

module.exports = {
  syncPaidStorage,
  syncDetailReport,
  syncOrders,
  syncSales,
  syncProducts,
  syncStocks,
};
