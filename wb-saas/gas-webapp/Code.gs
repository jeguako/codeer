// ═══════════════════════════════════════════════════════════════════
//  CashFlow WB — Google Apps Script Web App  v2
//  Точные имена столбцов из реальной таблицы
// ═══════════════════════════════════════════════════════════════════

const SHEETS = {
  SETTINGS:    '⚙️ Настройки',
  PNL:         '📊 P&LДДС',
  REPORT:      '💰 Отчет',
  OPERATIONS:  '📝 Операции',
  UNIT:        '🧮 Юнитка',
  ARTICLES:    '📦 Артикулы',
  SUPPLIES:    '🚚 Поставки',
  DETAIL:      'Реализации (исх.)',
  DETAIL_SVOD: 'Детализации Свод.',
  STORAGE:     'Платное хранение',
  ADS:         'ВБ.Продвижение',
  PRICES:      'Цены и скидки',
  INVESTMENTS: '🏦 Инвестиции',
  FINMODEL:    '📆 Финмодель',
};

// ─── Entry point ──────────────────────────────────────────────────
function doGet() {
  return HtmlService
    .createTemplateFromFile('Index')
    .evaluate()
    .setTitle('CashFlow WB')
    .addMetaTag('viewport', 'width=device-width, initial-scale=1, maximum-scale=1')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

// ═══════════════════════════════════════════════════════════════════
//  HELPERS
// ═══════════════════════════════════════════════════════════════════
function safeNum(v) {
  const n = parseFloat(v);
  return isNaN(n) ? 0 : n;
}

function fmtDate(d) {
  if (d instanceof Date && !isNaN(d))
    return Utilities.formatDate(d, Session.getScriptTimeZone(), 'yyyy-MM-dd');
  return d != null ? String(d) : '';
}

/** Читает лист начиная с headerRow, возвращает [{col: val}] */
function sheetToObjects(sheetName, headerRow, dataStartRow) {
  headerRow    = headerRow    || 1;
  dataStartRow = dataStartRow || headerRow + 1;
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const sh = ss.getSheetByName(sheetName);
    if (!sh || sh.getLastRow() < dataStartRow) return [];
    const lastCol = sh.getLastColumn();
    const headers = sh.getRange(headerRow, 1, 1, lastCol).getValues()[0];
    const numRows = sh.getLastRow() - dataStartRow + 1;
    if (numRows <= 0) return [];
    const data = sh.getRange(dataStartRow, 1, numRows, lastCol).getValues();
    return data
      .map(row => {
        const obj = {};
        headers.forEach((h, i) => {
          const key = String(h || '').trim() || 'col_' + (i + 1);
          obj[key] = row[i] instanceof Date ? fmtDate(row[i]) : row[i];
        });
        return obj;
      })
      .filter(row => Object.values(row).some(v => v !== '' && v !== null && v !== undefined));
  } catch (e) {
    Logger.log('sheetToObjects [' + sheetName + ']: ' + e.message);
    return [];
  }
}

/** Возвращает индекс столбца по точному или частичному имени заголовка */
function findColIdx(headers, names) {
  if (!Array.isArray(names)) names = [names];
  for (const name of names) {
    const lo = name.toLowerCase();
    const idx = headers.findIndex(h => String(h).toLowerCase() === lo);
    if (idx >= 0) return idx;
  }
  // Partial match fallback
  for (const name of names) {
    const lo = name.toLowerCase();
    const idx = headers.findIndex(h => String(h).toLowerCase().includes(lo));
    if (idx >= 0) return idx;
  }
  return -1;
}

// ═══════════════════════════════════════════════════════════════════
//  1. DASHBOARD (Главная)
// ═══════════════════════════════════════════════════════════════════
function getDashboard() {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();

    /* ── ⚙️ Настройки: название ИП, дата обновления ── */
    let companyName = ss.getName();
    let lastUpdate  = '';
    const settSh = ss.getSheetByName(SHEETS.SETTINGS);
    if (settSh) {
      // B1=Название ИП, C1=значение
      const settBlock = settSh.getRange(1, 2, 15, 2).getValues();
      settBlock.forEach(row => {
        const label = String(row[0] || '').trim();
        const val   = row[1];
        if (label === 'Название ИП' && val)       companyName = String(val);
        if (label === 'Последнее обновление' && val) lastUpdate = fmtDate(val) || String(val);
      });
    }

    /* ── Реализации (исх.): строки 3+, заголовки в строке 2 ── */
    // row 1 = English API names, row 2 = Russian names, data from row 3
    let revenue = 0, logistics = 0, penalties = 0, acquiring = 0, sales = 0, returns_ = 0;

    const detSh = ss.getSheetByName(SHEETS.DETAIL);
    if (detSh && detSh.getLastRow() > 2) {
      const headers = detSh.getRange(2, 1, 1, detSh.getLastColumn()).getValues()[0];
      const numRows = detSh.getLastRow() - 2;
      const data    = detSh.getRange(3, 1, numRows, detSh.getLastColumn()).getValues();

      // Computed columns (last block): Сумма продаж без СПП(AM), Логистика(AQ), К возмещению(AP)
      const iDocType  = findColIdx(headers, ['Обоснование для оплаты', 'Тип документа']);
      const iRevenue  = findColIdx(headers, ['К перечислению за товар', 'К возмещению', 'ppvz_for_pay']);
      const iLogist   = findColIdx(headers, ['Услуги по доставке товара покупателю', 'Логистика', 'delivery_rub']);
      const iPenalty  = findColIdx(headers, ['Общая сумма штрафов', 'Штрафы', 'penalty']);
      const iAcquir   = findColIdx(headers, ['Эквайринг', 'acquiring_fee']);
      // Computed col AQ = Логистика (index ~42 = col AQ)
      const iLogComp  = findColIdx(headers, ['Логистика']);

      data.forEach(row => {
        const docType = iDocType >= 0 ? String(row[iDocType] || '').toLowerCase() : '';
        if (iRevenue  >= 0) revenue   += safeNum(row[iRevenue]);
        if (iLogist   >= 0) logistics += safeNum(row[iLogist]);
        if (iPenalty  >= 0) penalties += safeNum(row[iPenalty]);
        if (iAcquir   >= 0) acquiring += safeNum(row[iAcquir]);
        if (docType.includes('продажа')) sales++;
        if (docType.includes('возврат')) returns_++;
      });
    }

    /* ── Платное хранение: Стоимость (₽) ── */
    // Headers: Дата, Склад, Коэфф. склада, Артикул WB, Артикул продавца, Бренд, Предмет, Размер, Штрихкод, Объем (л), Тип расчета, Стоимость (₽)
    let storageCost = 0;
    const storSh = ss.getSheetByName(SHEETS.STORAGE);
    if (storSh && storSh.getLastRow() > 1) {
      const h   = storSh.getRange(1, 1, 1, storSh.getLastColumn()).getValues()[0];
      const idx = findColIdx(h, ['Стоимость (₽)', 'Стоимость', 'Сумма', 'storageCost']);
      if (idx >= 0) {
        storSh.getRange(2, idx + 1, storSh.getLastRow() - 1, 1).getValues()
          .forEach(r => storageCost += safeNum(r[0]));
      }
    }

    /* ── ВБ.Продвижение: Расходы (руб) ── */
    // Headers: ID Кампании, Название, Тип, Статус, Тип Оплаты, Артикул WB, Название Товара, Дата, Платформа, Расходы (руб), Показы, Клики
    let adsCost = 0;
    const adsSh = ss.getSheetByName(SHEETS.ADS);
    if (adsSh && adsSh.getLastRow() > 1) {
      const h   = adsSh.getRange(1, 1, 1, adsSh.getLastColumn()).getValues()[0];
      const idx = findColIdx(h, ['Расходы (руб)', 'Расходы', 'Сумма', 'spend']);
      if (idx >= 0) {
        adsSh.getRange(2, idx + 1, adsSh.getLastRow() - 1, 1).getValues()
          .forEach(r => adsCost += safeNum(r[0]));
      }
    }

    /* ── Операции: сумма поступлений и расходов ── */
    // Headers: Дата, Сумма, Счёт, Статья, Контрагент, Комментарий, Период, ...
    let totalIncome = 0, totalExpense = 0;
    const opsSh = ss.getSheetByName(SHEETS.OPERATIONS);
    if (opsSh && opsSh.getLastRow() > 1) {
      const h      = opsSh.getRange(1, 1, 1, opsSh.getLastColumn()).getValues()[0];
      const iAmt   = findColIdx(h, ['Сумма', 'Amount', 'amount']);
      const iStat  = findColIdx(h, ['Статья', 'Тип', 'Категория']);
      if (iAmt >= 0) {
        opsSh.getRange(2, 1, opsSh.getLastRow() - 1, opsSh.getLastColumn()).getValues()
          .forEach(row => {
            const amt   = safeNum(row[iAmt]);
            const stat  = iStat >= 0 ? String(row[iStat] || '').toLowerCase() : '';
            if (amt > 0 || stat.includes('поступ') || stat.includes('приход'))
              totalIncome += Math.abs(amt);
            else if (amt < 0)
              totalExpense += Math.abs(amt);
          });
      }
    }

    const totalExp = logistics + storageCost + adsCost + penalties + acquiring;
    const profit   = revenue - totalExp;
    const margin   = revenue > 0 ? (profit / revenue) * 100 : 0;

    return {
      ok: true,
      companyName,
      lastUpdate: lastUpdate || new Date().toLocaleDateString('ru-RU'),
      metrics: {
        revenue,
        logistics,
        storage:   storageCost,
        ads:       adsCost,
        penalties,
        acquiring,
        totalExp,
        profit,
        margin:    Math.round(margin * 10) / 10,
        sales,
        returns:   returns_,
        income:    totalIncome,
        expense:   totalExpense,
      },
    };
  } catch (e) {
    return { ok: false, error: e.message };
  }
}

// ═══════════════════════════════════════════════════════════════════
//  2. РЕАЛИЗАЦИИ по артикулам
// ═══════════════════════════════════════════════════════════════════
function getRealizByProduct() {
  try {
    const ss   = SpreadsheetApp.getActiveSpreadsheet();
    const sh   = ss.getSheetByName(SHEETS.DETAIL);
    if (!sh || sh.getLastRow() < 3) return { ok: true, data: [], total: 0 };

    // row 2 = Russian headers, data from row 3
    const headers = sh.getRange(2, 1, 1, sh.getLastColumn()).getValues()[0];
    const numRows = sh.getLastRow() - 2;
    const data    = sh.getRange(3, 1, numRows, sh.getLastColumn()).getValues();

    const iArticle = findColIdx(headers, ['Артикул продавца', 'sa_name']);
    const iSubject = findColIdx(headers, ['Предмет', 'subject_name']);
    const iDocType = findColIdx(headers, ['Обоснование для оплаты', 'Тип документа', 'doc_type_name']);
    const iRevenue = findColIdx(headers, ['К перечислению за товар', 'ppvz_for_pay']);
    const iRetail  = findColIdx(headers, ['Цена розничная с учетом скидки', 'retail_amount']);
    const iLogist  = findColIdx(headers, ['Услуги по доставке товара покупателю', 'delivery_rub']);
    const iPenalty = findColIdx(headers, ['Общая сумма штрафов', 'penalty']);
    // Computed column AM: Сумма продаж без СПП (index 38 = col AM)
    const iSales   = findColIdx(headers, ['Сумма продаж без СПП']);
    const iDate    = findColIdx(headers, ['Дата реализации', 'sale_dt', 'Дата продажи']);

    const byProduct = {};
    data.forEach(row => {
      const art     = String(row[iArticle >= 0 ? iArticle : 0] || '').trim() || 'Без артикула';
      const subject = String(row[iSubject >= 0 ? iSubject : 1] || '').trim();
      const docType = String(row[iDocType >= 0 ? iDocType : -1] != null ? row[iDocType >= 0 ? iDocType : -1] : '').toLowerCase();

      if (!byProduct[art]) {
        byProduct[art] = {
          article: art, subject,
          revenue: 0, retail: 0, logistics: 0, penalties: 0, sales: 0, returns: 0,
        };
      }
      const p = byProduct[art];
      if (iRevenue >= 0) p.revenue   += safeNum(row[iRevenue]);
      if (iRetail  >= 0) p.retail    += safeNum(row[iRetail]);
      if (iLogist  >= 0) p.logistics += safeNum(row[iLogist]);
      if (iPenalty >= 0) p.penalties += safeNum(row[iPenalty]);
      if (docType.includes('продажа')) p.sales++;
      else if (docType.includes('возврат')) p.returns++;
      else if (iSales >= 0 && safeNum(row[iSales]) > 0) p.sales++;
      else if (iSales >= 0 && safeNum(row[iSales]) < 0) p.returns++;
    });

    const sorted = Object.values(byProduct).sort((a, b) => b.revenue - a.revenue);
    return { ok: true, data: sorted.slice(0, 300), total: sorted.length };
  } catch (e) {
    return { ok: false, error: e.message };
  }
}

// ═══════════════════════════════════════════════════════════════════
//  3. ПЛАТНОЕ ХРАНЕНИЕ
// ═══════════════════════════════════════════════════════════════════
// Headers: Дата, Склад, Коэфф. склада, Артикул WB, Артикул продавца,
//          Бренд, Предмет, Размер, Штрихкод, Объем (л), Тип расчета, Стоимость (₽)
function getStorage(limit) {
  try {
    const rows = sheetToObjects(SHEETS.STORAGE, 1, 2);
    return { ok: true, data: rows.slice(0, limit || 500), total: rows.length };
  } catch (e) {
    return { ok: false, error: e.message };
  }
}

function getStorageSummary() {
  try {
    const rows = sheetToObjects(SHEETS.STORAGE, 1, 2);
    // Group by Артикул продавца
    const byArt = {};
    rows.forEach(r => {
      const art  = String(r['Артикул продавца'] || r['Артикул WB'] || '').trim();
      const cost = safeNum(r['Стоимость (₽)'] || r['Стоимость'] || 0);
      if (!byArt[art]) byArt[art] = { article: art, brand: r['Бренд'] || '', subject: r['Предмет'] || '', total: 0, rows: 0 };
      byArt[art].total += cost;
      byArt[art].rows++;
    });
    const sorted = Object.values(byArt).sort((a, b) => b.total - a.total);
    return { ok: true, data: sorted.slice(0, 200), total: sorted.length };
  } catch (e) {
    return { ok: false, error: e.message };
  }
}

// ═══════════════════════════════════════════════════════════════════
//  4. ВБ.ПРОДВИЖЕНИЕ (Реклама)
// ═══════════════════════════════════════════════════════════════════
// Headers: ID Кампании, Название Кампании, Тип Кампании, Статус,
//          Тип Оплаты, Артикул WB, Название Товара, Дата, Платформа,
//          Расходы (руб), Показы, Клики
function getAds(limit) {
  try {
    const rows = sheetToObjects(SHEETS.ADS, 1, 2);
    return { ok: true, data: rows.slice(0, limit || 500), total: rows.length };
  } catch (e) {
    return { ok: false, error: e.message };
  }
}

function getAdsSummary() {
  try {
    const rows = sheetToObjects(SHEETS.ADS, 1, 2);
    // Group by ID Кампании + Название
    const byCamp = {};
    rows.forEach(r => {
      const id   = String(r['ID Кампании'] || r['ID кампании'] || '');
      const name = String(r['Название Кампании'] || r['Название кампании'] || id);
      const key  = id || name;
      if (!byCamp[key]) byCamp[key] = { id, name, spend: 0, views: 0, clicks: 0, orders: 0 };
      byCamp[key].spend  += safeNum(r['Расходы (руб)'] || r['Расходы'] || 0);
      byCamp[key].views  += safeNum(r['Показы']  || 0);
      byCamp[key].clicks += safeNum(r['Клики']   || 0);
      byCamp[key].orders += safeNum(r['Заказы']  || 0);
    });
    const sorted = Object.values(byCamp).sort((a, b) => b.spend - a.spend);
    return { ok: true, data: sorted, total: sorted.length };
  } catch (e) {
    return { ok: false, error: e.message };
  }
}

// ═══════════════════════════════════════════════════════════════════
//  5. ОПЕРАЦИИ (ДДС)
// ═══════════════════════════════════════════════════════════════════
// Headers: Дата, Сумма, Счёт, Статья, Контрагент, Комментарий, Период…
function getOperations(limit) {
  try {
    const rows = sheetToObjects(SHEETS.OPERATIONS, 1, 2);
    return { ok: true, data: rows.slice(0, limit || 500), total: rows.length };
  } catch (e) {
    return { ok: false, error: e.message };
  }
}

// ═══════════════════════════════════════════════════════════════════
//  6. P&L / ДДС
// ═══════════════════════════════════════════════════════════════════
// Row 1 = year/months, rows = P&L lines with Выручка, Комиссия, Логистика etc.
function getPnL() {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const sh = ss.getSheetByName(SHEETS.PNL);
    if (!sh) return { ok: true, data: [], headers: [] };

    const numRows = Math.min(sh.getLastRow(), 120);
    const numCols = Math.min(sh.getLastColumn(), 20);
    const all     = sh.getRange(1, 1, numRows, numCols).getValues();

    // Row 0 = headers (year + months)
    const headers = all[0].map(v => v instanceof Date ? fmtDate(v) : String(v || ''));

    const rows = all.slice(1)
      .filter(row => row[0] !== '' && row[0] !== null)
      .map(row => {
        const obj = { '_row': String(row[0] || '') };
        headers.slice(1).forEach((h, i) => {
          obj[h] = row[i + 1] instanceof Date ? fmtDate(row[i + 1]) : (row[i + 1] || 0);
        });
        return obj;
      });

    return { ok: true, data: rows, headers };
  } catch (e) {
    return { ok: false, error: e.message };
  }
}

// ═══════════════════════════════════════════════════════════════════
//  7. ЮНИТ-ЭКОНОМИКА
// ═══════════════════════════════════════════════════════════════════
function getUnitEcon(limit) {
  try {
    // Row 1 = headers, data from row 2
    const rows = sheetToObjects(SHEETS.UNIT, 1, 2);
    // Key columns: Артикул продавца, Наименование товара, Полная С/С на ед.,
    //              Целевая цена продажи, Маржа на ед., Маржинальность, ROI
    const KEY_COLS = [
      'Артикул продавца', 'Наименование товара', 'Полная С/С на ед.',
      'Целевая цена продажи', 'Маржа на ед.', 'Маржа на партию',
      'Маржинальность', 'ROI', 'Комиссия ВБ %', 'Логистика ВБ',
      'ДРР %', 'Процент выкупа %',
    ];
    const filtered = rows.map(row => {
      const obj = {};
      KEY_COLS.forEach(k => { if (row[k] !== undefined) obj[k] = row[k]; });
      return obj;
    }).filter(obj => obj['Артикул продавца'] || obj['Наименование товара']);
    return { ok: true, data: filtered.slice(0, limit || 200), total: filtered.length };
  } catch (e) {
    return { ok: false, error: e.message };
  }
}

// ═══════════════════════════════════════════════════════════════════
//  8. АРТИКУЛЫ
// ═══════════════════════════════════════════════════════════════════
// Headers: Фото, Штрихкод, Бренд, Артикул, Категория, Размер,
//          Артикул ВБ, Усредненная себестоимость, …
function getArticles(limit) {
  try {
    const rows = sheetToObjects(SHEETS.ARTICLES, 1, 2);
    const KEY_COLS = ['Бренд', 'Артикул', 'Категория', 'Размер', 'Артикул ВБ', 'Усредненная себестоимость'];
    const filtered = rows.map(row => {
      const obj = {};
      KEY_COLS.forEach(k => { if (row[k] !== undefined) obj[k] = row[k]; });
      return obj;
    }).filter(obj => obj['Артикул'] || obj['Артикул ВБ']);
    return { ok: true, data: filtered.slice(0, limit || 300), total: filtered.length };
  } catch (e) {
    return { ok: false, error: e.message };
  }
}

// ═══════════════════════════════════════════════════════════════════
//  9. ПОСТАВКИ
// ═══════════════════════════════════════════════════════════════════
function getSupplies(limit) {
  try {
    const rows = sheetToObjects(SHEETS.SUPPLIES, 1, 2);
    const KEY_COLS = ['Номер поставки', 'Дата прихода на WB', 'Артикул', 'Кол-во шт', 'Сумма закупки', 'Итого С/С'];
    const filtered = rows.map(row => {
      const obj = {};
      KEY_COLS.forEach(k => { if (row[k] !== undefined) obj[k] = row[k]; });
      return obj;
    }).filter(obj => obj['Артикул'] || obj['Номер поставки']);
    return { ok: true, data: filtered.slice(0, limit || 200), total: filtered.length };
  } catch (e) {
    return { ok: false, error: e.message };
  }
}

// ═══════════════════════════════════════════════════════════════════
//  10. ФИНМОДЕЛЬ
// ═══════════════════════════════════════════════════════════════════
function getFinModel() {
  try {
    const rows = sheetToObjects(SHEETS.FINMODEL, 1, 2);
    return { ok: true, data: rows.slice(0, 100), total: rows.length };
  } catch (e) {
    return { ok: false, error: e.message };
  }
}

// ═══════════════════════════════════════════════════════════════════
//  11. ДЕТАЛИЗАЦИИ СВОД (сверка отчётов WB)
// ═══════════════════════════════════════════════════════════════════
function getDetailSvod() {
  try {
    const rows = sheetToObjects(SHEETS.DETAIL_SVOD, 1, 2);
    return { ok: true, data: rows, total: rows.length };
  } catch (e) {
    return { ok: false, error: e.message };
  }
}

// ═══════════════════════════════════════════════════════════════════
//  Список листов (для отладки)
// ═══════════════════════════════════════════════════════════════════
function getSheetNames() {
  try {
    return { ok: true, sheets: SpreadsheetApp.getActiveSpreadsheet().getSheets().map(s => s.getName()) };
  } catch (e) {
    return { ok: false, error: e.message };
  }
}
