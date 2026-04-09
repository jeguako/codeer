const axios = require('axios');

const APIS = {
  statistics: 'https://statistics-api.wildberries.ru',
  analytics: 'https://seller-analytics-api.wildberries.ru',
  content: 'https://content-api.wildberries.ru',
  marketplace: 'https://marketplace-api.wildberries.ru',
  advert: 'https://advert-api.wildberries.ru',
};

const MAX_RETRIES = 5;
const BASE_DELAY_MS = 2000;

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

async function fetchWB(token, baseKey, path, params = {}, method = 'GET', body = null) {
  const url = APIS[baseKey] + path;
  const headers = { Authorization: token, 'Content-Type': 'application/json' };

  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      const config = { headers, params: method === 'GET' ? params : undefined };
      const response =
        method === 'GET'
          ? await axios.get(url, config)
          : await axios.post(url, body, { headers });

      return response.data;
    } catch (err) {
      const status = err.response?.status;

      if (status === 401) throw new Error('Неверный API-токен WB (401)');
      if (status === 403) throw new Error('Недостаточно прав API-токена WB (403)');

      if (status === 429) {
        const wait = Math.max(BASE_DELAY_MS * Math.pow(2, attempt), 30000);
        console.log(`WB 429 rate limit — ждём ${wait / 1000}с (попытка ${attempt}/${MAX_RETRIES})`);
        await sleep(wait);
        continue;
      }

      if (status >= 500 || !status) {
        const wait = BASE_DELAY_MS * Math.pow(2, attempt - 1);
        console.log(`WB ${status || 'NETWORK'} — ждём ${wait / 1000}с (попытка ${attempt}/${MAX_RETRIES})`);
        await sleep(wait);
        continue;
      }

      throw new Error(`WB API ошибка HTTP ${status}: ${err.response?.data?.errorText || err.message}`);
    }
  }

  throw new Error(`WB API: превышено ${MAX_RETRIES} попыток для ${url}`);
}

// ─── Платное хранение ─────────────────────────────────────────────────────────
async function getPaidStorage(token, dateFrom, dateTo) {
  // Step 1: create report task
  const task = await fetchWB(token, 'analytics', '/api/v1/paid_storage', {
    dateFrom,
    dateTo,
  });
  const taskId = task?.data?.taskId;
  if (!taskId) throw new Error('Не удалось создать задачу платного хранения');

  // Step 2: poll for completion
  for (let i = 0; i < 30; i++) {
    await sleep(3000);
    const status = await fetchWB(token, 'analytics', `/api/v1/paid_storage/tasks/${taskId}/status`);
    if (status?.data?.status === 'done') break;
    if (status?.data?.status === 'error') throw new Error('Ошибка генерации отчёта хранения');
  }

  // Step 3: download
  const result = await fetchWB(token, 'analytics', `/api/v1/paid_storage/tasks/${taskId}/download`);
  return result?.data || [];
}

// ─── Детализация реализаций ───────────────────────────────────────────────────
async function getDetailReport(token, dateFrom, dateTo) {
  const rows = [];
  let page = 1;
  while (true) {
    const data = await fetchWB(token, 'statistics', '/api/v5/supplier/reportDetailByPeriod', {
      dateFrom,
      dateTo,
      limit: 100000,
      page,
    });
    if (!data || data.length === 0) break;
    rows.push(...data);
    if (data.length < 100000) break;
    page++;
  }
  return rows;
}

// ─── Заказы ──────────────────────────────────────────────────────────────────
async function getOrders(token, dateFrom) {
  const rows = [];
  let skip = 0;
  while (true) {
    const data = await fetchWB(token, 'statistics', '/api/v1/supplier/orders', {
      dateFrom,
      flag: 0,
      skip,
      take: 1000,
    });
    if (!data || data.length === 0) break;
    rows.push(...data);
    if (data.length < 1000) break;
    skip += 1000;
  }
  return rows;
}

// ─── Продажи ─────────────────────────────────────────────────────────────────
async function getSales(token, dateFrom) {
  const rows = [];
  let skip = 0;
  while (true) {
    const data = await fetchWB(token, 'statistics', '/api/v1/supplier/sales', {
      dateFrom,
      flag: 0,
      skip,
      take: 1000,
    });
    if (!data || data.length === 0) break;
    rows.push(...data);
    if (data.length < 1000) break;
    skip += 1000;
  }
  return rows;
}

// ─── Карточки товаров ─────────────────────────────────────────────────────────
async function getProductCards(token) {
  const cards = [];
  let cursor = null;
  while (true) {
    const body = {
      settings: {
        cursor: cursor ? { nmID: cursor, limit: 100 } : { limit: 100 },
        filter: { withPhoto: -1 },
      },
    };
    const data = await fetchWB(token, 'content', '/content/v2/get/cards/list', {}, 'POST', body);
    const items = data?.cards || [];
    cards.push(...items);
    cursor = data?.cursor?.nmID;
    if (!cursor || items.length < 100) break;
  }
  return cards;
}

// ─── Склады (остатки) ─────────────────────────────────────────────────────────
async function getWarehouses(token) {
  const data = await fetchWB(token, 'marketplace', '/api/v3/warehouses', {});
  return data || [];
}

async function getStocks(token, dateFrom) {
  const rows = [];
  let skip = 0;
  while (true) {
    const data = await fetchWB(token, 'statistics', '/api/v1/supplier/stocks', {
      dateFrom,
      skip,
      take: 1000,
    });
    if (!data || data.length === 0) break;
    rows.push(...data);
    if (data.length < 1000) break;
    skip += 1000;
  }
  return rows;
}

// ─── Реклама ─────────────────────────────────────────────────────────────────
async function getAdsCampaigns(token) {
  const data = await fetchWB(token, 'advert', '/adv/v1/promotion/count', {});
  return data?.adverts || [];
}

async function getAdsStats(token, campaignIds, dateFrom, dateTo) {
  const body = campaignIds.map((id) => ({ id }));
  const data = await fetchWB(
    token,
    'advert',
    `/adv/v2/fullstats?dateFrom=${dateFrom}&dateTo=${dateTo}`,
    {},
    'POST',
    body
  );
  return data || [];
}

// ─── Validate token ───────────────────────────────────────────────────────────
async function validateToken(token) {
  try {
    await fetchWB(token, 'statistics', '/api/v1/supplier/stocks', {
      dateFrom: new Date(Date.now() - 86400000).toISOString().slice(0, 10),
      skip: 0,
      take: 1,
    });
    return true;
  } catch (err) {
    if (err.message.includes('401') || err.message.includes('403')) return false;
    return true; // other errors (network etc.) - assume valid
  }
}

module.exports = {
  getPaidStorage,
  getDetailReport,
  getOrders,
  getSales,
  getProductCards,
  getWarehouses,
  getStocks,
  getAdsCampaigns,
  getAdsStats,
  validateToken,
};
