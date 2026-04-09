require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
});

const migrations = `
-- Users
CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  name VARCHAR(255),
  plan VARCHAR(50) DEFAULT 'trial',
  plan_expires_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW()
);

-- WB API tokens (encrypted)
CREATE TABLE IF NOT EXISTS wb_tokens (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  token_encrypted TEXT NOT NULL,
  label VARCHAR(255) DEFAULT 'Основной',
  is_active BOOLEAN DEFAULT TRUE,
  last_validated_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Sync jobs status
CREATE TABLE IF NOT EXISTS sync_jobs (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  type VARCHAR(50) NOT NULL,
  status VARCHAR(50) DEFAULT 'pending',
  date_from DATE,
  date_to DATE,
  rows_loaded INTEGER DEFAULT 0,
  error_message TEXT,
  started_at TIMESTAMP,
  finished_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Paid storage data
CREATE TABLE IF NOT EXISTS wb_paid_storage (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  nm_id BIGINT,
  vendor_code VARCHAR(255),
  subject_name VARCHAR(255),
  warehouse_name VARCHAR(255),
  volume NUMERIC(12, 4),
  calc_type VARCHAR(50),
  warehouse_coeff NUMERIC(8, 4),
  box_type_name VARCHAR(100),
  category_name VARCHAR(255),
  brand_name VARCHAR(255),
  sc_code VARCHAR(50),
  logistics NUMERIC(12, 2),
  storage_cost NUMERIC(12, 2),
  UNIQUE (user_id, date, nm_id)
);

-- Detail report (реализации)
CREATE TABLE IF NOT EXISTS wb_detail_report (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  realizationreport_id BIGINT,
  date_from DATE,
  date_to DATE,
  create_dt TIMESTAMP,
  nm_id BIGINT,
  subject_name VARCHAR(255),
  sa_name VARCHAR(255),
  ts_name VARCHAR(100),
  barcode VARCHAR(100),
  doc_type_name VARCHAR(100),
  quantity INTEGER,
  retail_price NUMERIC(12, 2),
  retail_amount NUMERIC(12, 2),
  sale_percent INTEGER,
  commission_percent NUMERIC(8, 4),
  supplier_oper_name VARCHAR(255),
  order_dt TIMESTAMP,
  sale_dt TIMESTAMP,
  rr_dt TIMESTAMP,
  delivery_amount NUMERIC(12, 2),
  return_amount NUMERIC(12, 2),
  delivery_rub NUMERIC(12, 2),
  penalty NUMERIC(12, 2),
  additional_payment NUMERIC(12, 2),
  ppvz_vw NUMERIC(12, 2),
  ppvz_vw_nds NUMERIC(12, 2),
  ppvz_for_pay NUMERIC(12, 2),
  acquiring_fee NUMERIC(12, 2),
  acquiring_percent NUMERIC(8, 4),
  ppvz_reward NUMERIC(12, 2),
  ppvz_spp_prc NUMERIC(8, 4),
  ppvz_kvw_prc_base NUMERIC(8, 4),
  office_name VARCHAR(255),
  supplier_promo NUMERIC(12, 2),
  UNIQUE (user_id, realizationreport_id)
);

-- Orders
CREATE TABLE IF NOT EXISTS wb_orders (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  g_number VARCHAR(100),
  date TIMESTAMP,
  last_change_date TIMESTAMP,
  supplier_article VARCHAR(255),
  tech_size VARCHAR(50),
  barcode VARCHAR(100),
  total_price NUMERIC(12, 2),
  discount_percent INTEGER,
  warehouse_name VARCHAR(255),
  oblast VARCHAR(255),
  income_id BIGINT,
  odid BIGINT,
  nm_id BIGINT,
  subject VARCHAR(255),
  category VARCHAR(255),
  brand VARCHAR(255),
  is_cancel BOOLEAN DEFAULT FALSE,
  cancel_dt TIMESTAMP,
  UNIQUE (user_id, odid)
);

-- Sales & returns
CREATE TABLE IF NOT EXISTS wb_sales (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  g_number VARCHAR(100),
  date TIMESTAMP,
  last_change_date TIMESTAMP,
  supplier_article VARCHAR(255),
  tech_size VARCHAR(50),
  barcode VARCHAR(100),
  total_price NUMERIC(12, 2),
  discount_percent INTEGER,
  is_supply BOOLEAN,
  is_realization BOOLEAN,
  promo_code_discount NUMERIC(12, 2),
  warehouse_name VARCHAR(255),
  country_name VARCHAR(100),
  oblast_okrug_name VARCHAR(255),
  region_name VARCHAR(255),
  income_id BIGINT,
  sale_id VARCHAR(100),
  odid BIGINT,
  spp NUMERIC(8, 4),
  for_pay NUMERIC(12, 2),
  finished_price NUMERIC(12, 2),
  price_with_disc NUMERIC(12, 2),
  nm_id BIGINT,
  subject VARCHAR(255),
  category VARCHAR(255),
  brand VARCHAR(255),
  is_storno BOOLEAN DEFAULT FALSE,
  UNIQUE (user_id, sale_id)
);

-- Ads campaigns
CREATE TABLE IF NOT EXISTS wb_ads (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  campaign_id BIGINT,
  date DATE,
  nm_id BIGINT,
  views INTEGER DEFAULT 0,
  clicks INTEGER DEFAULT 0,
  ctr NUMERIC(8, 4),
  cpc NUMERIC(12, 4),
  spend NUMERIC(12, 2),
  atbs INTEGER DEFAULT 0,
  orders INTEGER DEFAULT 0,
  cr NUMERIC(8, 4),
  shks INTEGER DEFAULT 0,
  sum_price NUMERIC(12, 2),
  UNIQUE (user_id, campaign_id, date, nm_id)
);

-- Product cards cache
CREATE TABLE IF NOT EXISTS wb_products (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  nm_id BIGINT NOT NULL,
  imt_id BIGINT,
  nm_uuid VARCHAR(100),
  vendor_code VARCHAR(255),
  subject_name VARCHAR(255),
  subject_id INTEGER,
  brand VARCHAR(255),
  title VARCHAR(500),
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE (user_id, nm_id)
);

-- Warehouses
CREATE TABLE IF NOT EXISTS wb_warehouses (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  nm_id BIGINT NOT NULL,
  vendor_code VARCHAR(255),
  subject VARCHAR(255),
  brand VARCHAR(255),
  quantity INTEGER DEFAULT 0,
  warehouse_name VARCHAR(255),
  in_way_to_client INTEGER DEFAULT 0,
  in_way_from_client INTEGER DEFAULT 0,
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE (user_id, nm_id, warehouse_name)
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_paid_storage_user_date ON wb_paid_storage(user_id, date);
CREATE INDEX IF NOT EXISTS idx_orders_user_date ON wb_orders(user_id, date);
CREATE INDEX IF NOT EXISTS idx_sales_user_date ON wb_sales(user_id, date);
CREATE INDEX IF NOT EXISTS idx_detail_user_date ON wb_detail_report(user_id, date_from);
CREATE INDEX IF NOT EXISTS idx_ads_user_date ON wb_ads(user_id, date);
`;

async function migrate() {
  const client = await pool.connect();
  try {
    console.log('Running migrations...');
    await client.query(migrations);
    console.log('Migrations completed successfully!');
  } catch (err) {
    console.error('Migration error:', err);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

migrate();
