// ═══════════════════════════════════════════════════════════════════
//  CashFlow WB — Google Apps Script Web App
//  Читает данные из Google Таблицы и отдаёт веб-приложение
// ═══════════════════════════════════════════════════════════════════

const SHEETS = {
  SETTINGS:     '⚙️ Настройки',
  PNL:          '📊 P&LДДС',
  REPORT:       '💰 Отчет',
  OPERATIONS:   '📝 Операции',
  UNIT:         '🧮 Юнитка',
  ARTICLES:     '📦 Артикулы',
  SUPPLIES:     '🚚 Поставки',
  DETAIL:       'Реализации (исх.)',
  STORAGE:      'Платное хранение',
  ADS:          'ВБ.Продвижение',
  INVESTMENTS:  '🏦 Инвестиции',
  FINMODEL:     '📆 Финмодель',
  PRICES:       'Цены и скидки',
  DETAIL_SVOD:  'Детализации Свод.',
};

// ─── Entry point ──────────────────────────────────────────────────
function doGet(e) {
  return HtmlService
    .createTemplateFromFile('Index')
    .evaluate()
    .setTitle('CashFlow WB')
    .addMetaTag('viewport', 'width=device-width, initial-scale=1, maximum-scale=1')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

// ─── Helper: get sheet as array of objects ────────────────────────
function sheetToObjects(sheetName, headerRow, dataStartRow) {
  headerRow    = headerRow    || 1;
  dataStartRow = dataStartRow || 2;
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const sh = ss.getSheetByName(sheetName);
    if (!sh) return [];
    const lastRow = sh.getLastRow();
    const lastCol = sh.getLastColumn();
    if (lastRow < dataStartRow) return [];
    const headers = sh.getRange(headerRow, 1, 1, lastCol).getValues()[0];
    const data    = sh.getRange(dataStartRow, 1, lastRow - dataStartRow + 1, lastCol).getValues();
    return data.map(row => {
      const obj = {};
      headers.forEach((h, i) => {
        const key = String(h).trim().replace(/\s+/g, '_');
        const v = row[i];
        obj[key] = v instanceof Date ? Utilities.formatDate(v, Session.getScriptTimeZone(), 'yyyy-MM-dd') : v;
      });
      return obj;
    }).filter(row => Object.values(row).some(v => v !== '' && v !== null && v !== undefined));
  } catch(e) {
    Logger.log('sheetToObjects error [' + sheetName + ']: ' + e.message);
    return [];
  }
}

function getCellValue(sheetName, cell) {
  try {
    const sh = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(sheetName);
    if (!sh) return null;
    const v = sh.getRange(cell).getValue();
    return v instanceof Date ? Utilities.formatDate(v, Session.getScriptTimeZone(), 'yyyy-MM-dd') : v;
  } catch(e) { return null; }
}

function safeNum(v) {
  const n = parseFloat(v);
  return isNaN(n) ? 0 : n;
}

// ─── 1. Dashboard (Главная) ───────────────────────────────────────
function getDashboard() {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const sett = ss.getSheetByName(SHEETS.SETTINGS);

    // ⚙️ Настройки — читаем KPI из строк 4-14
    // Структура: B=Название, C=Значение (определяется по контексту)
    const settData = sett ? sett.getRange(1, 1, 20, 10).getValues() : [];

    // Ищем метрики по названию в столбце B
    const metricsMap = {};
    settData.forEach(row => {
      const label = String(row[1] || '').trim();
      const val   = row[2];
      if (label) metricsMap[label] = val;
    });

    // P&L ДДС — первые агрегаты
    const pnl = ss.getSheetByName(SHEETS.PNL);
    const pnlData = pnl ? pnl.getRange(1, 1, 5, 20).getValues() : [];

    // Отчёт — выручка, расходы
    const rep = ss.getSheetByName(SHEETS.REPORT);
    const repData = rep ? rep.getRange(1, 1, 10, 10).getValues() : [];

    // Реализации — считаем сами
    const realizSheet = ss.getSheetByName(SHEETS.DETAIL);
    let realizSummary = { revenue: 0, logistics: 0, penalty: 0, acquiring: 0, sales: 0, returns: 0 };
    if (realizSheet && realizSheet.getLastRow() > 1) {
      const headers = realizSheet.getRange(1, 1, 1, realizSheet.getLastColumn()).getValues()[0];
      const colIdx = {};
      headers.forEach((h, i) => colIdx[String(h).trim()] = i);
      const rows = realizSheet.getRange(2, 1, Math.min(realizSheet.getLastRow() - 1, 50000), realizSheet.getLastColumn()).getValues();
      rows.forEach(row => {
        const docType = String(row[colIdx['Обоснование для оплаты'] || colIdx['Тип документа'] || 0] || '');
        realizSummary.revenue   += safeNum(row[colIdx['К перечислению за товар'] || colIdx['Вознаграждение WB'] || 0]);
        realizSummary.logistics += safeNum(row[colIdx['Услуги по доставке товара покупателю'] || 0]);
        realizSummary.penalty   += safeNum(row[colIdx['Общая сумма штрафов'] || 0]);
        realizSummary.acquiring += safeNum(row[colIdx['Эквайринг'] || 0]);
        if (docType.toLowerCase().includes('продажа')) realizSummary.sales++;
        if (docType.toLowerCase().includes('возврат')) realizSummary.returns++;
      });
    }

    // Платное хранение — итого
    const storSheet = ss.getSheetByName(SHEETS.STORAGE);
    let storageCost = 0;
    if (storSheet && storSheet.getLastRow() > 1) {
      const headers = storSheet.getRange(1, 1, 1, storSheet.getLastColumn()).getValues()[0];
      const costIdx = headers.findIndex(h => String(h).toLowerCase().includes('хранение') || String(h).toLowerCase().includes('стоимость') || String(h).toLowerCase().includes('cost'));
      if (costIdx >= 0) {
        const vals = storSheet.getRange(2, costIdx + 1, storSheet.getLastRow() - 1, 1).getValues();
        vals.forEach(r => storageCost += safeNum(r[0]));
      }
    }

    // Реклама — итого
    const adsSheet = ss.getSheetByName(SHEETS.ADS);
    let adsCost = 0;
    if (adsSheet && adsSheet.getLastRow() > 1) {
      const headers = adsSheet.getRange(1, 1, 1, adsSheet.getLastColumn()).getValues()[0];
      const costIdx = headers.findIndex(h => String(h).toLowerCase().includes('расход') || String(h).toLowerCase().includes('spend') || String(h).toLowerCase().includes('сумма'));
      if (costIdx >= 0) {
        const vals = adsSheet.getRange(2, costIdx + 1, adsSheet.getLastRow() - 1, 1).getValues();
        vals.forEach(r => adsCost += safeNum(r[0]));
      }
    }

    // Операции — итого поступлений и расходов
    const opsSheet = ss.getSheetByName(SHEETS.OPERATIONS);
    let totalIncome = 0, totalExpense = 0;
    if (opsSheet && opsSheet.getLastRow() > 1) {
      const headers = opsSheet.getRange(1, 1, 1, opsSheet.getLastColumn()).getValues()[0];
      const amtIdx  = headers.findIndex(h => String(h).toLowerCase().includes('сумма') || String(h).toLowerCase().includes('amount'));
      const typeIdx = headers.findIndex(h => String(h).toLowerCase().includes('тип') || String(h).toLowerCase().includes('приход') || String(h).toLowerCase().includes('вид'));
      if (amtIdx >= 0) {
        const rows = opsSheet.getRange(2, 1, Math.min(opsSheet.getLastRow() - 1, 30000), opsSheet.getLastColumn()).getValues();
        rows.forEach(row => {
          const amt  = safeNum(row[amtIdx]);
          const type = typeIdx >= 0 ? String(row[typeIdx] || '').toLowerCase() : '';
          if (amt > 0 || type.includes('приход') || type.includes('поступ')) totalIncome += Math.abs(amt);
          else totalExpense += Math.abs(amt);
        });
      }
    }

    const profit = realizSummary.revenue - realizSummary.logistics - storageCost - adsCost - realizSummary.penalty - realizSummary.acquiring;
    const margin = realizSummary.revenue > 0 ? (profit / realizSummary.revenue) * 100 : 0;

    return {
      ok: true,
      companyName: getCellValue(SHEETS.SETTINGS, 'C1') || ss.getName(),
      lastUpdate:  getCellValue(SHEETS.SETTINGS, 'C2') || new Date().toLocaleDateString('ru-RU'),
      metrics: {
        revenue:    realizSummary.revenue,
        logistics:  realizSummary.logistics,
        storage:    storageCost,
        ads:        adsCost,
        penalties:  realizSummary.penalty,
        acquiring:  realizSummary.acquiring,
        profit:     profit,
        margin:     Math.round(margin * 10) / 10,
        sales:      realizSummary.sales,
        returns:    realizSummary.returns,
        income:     totalIncome,
        expense:    totalExpense,
      },
      metricsMap: metricsMap,
    };
  } catch(e) {
    return { ok: false, error: e.message };
  }
}

// ─── 2. Операции (ДДС) ───────────────────────────────────────────
function getOperations(limit) {
  limit = limit || 500;
  try {
    const rows = sheetToObjects(SHEETS.OPERATIONS);
    return { ok: true, data: rows.slice(0, limit), total: rows.length };
  } catch(e) {
    return { ok: false, error: e.message };
  }
}

// ─── 3. P&L ──────────────────────────────────────────────────────
function getPnL() {
  try {
    const rows = sheetToObjects(SHEETS.PNL);
    return { ok: true, data: rows };
  } catch(e) {
    return { ok: false, error: e.message };
  }
}

// ─── 4. Реализации (по товарам) ──────────────────────────────────
function getRealizByProduct(limit) {
  limit = limit || 200;
  try {
    const ss    = SpreadsheetApp.getActiveSpreadsheet();
    const sh    = ss.getSheetByName(SHEETS.DETAIL);
    if (!sh || sh.getLastRow() < 2) return { ok: true, data: [], total: 0 };

    const headers = sh.getRange(1, 1, 1, sh.getLastColumn()).getValues()[0];
    const colIdx  = {};
    headers.forEach((h, i) => colIdx[String(h).trim()] = i);

    const allRows = sh.getRange(2, 1, sh.getLastRow() - 1, sh.getLastColumn()).getValues();

    // Aggregate by product article
    const byProduct = {};
    allRows.forEach(row => {
      const article = String(row[colIdx['Артикул продавца'] || colIdx['sa_name'] || 0] || 'Неизвестно').trim();
      const subject = String(row[colIdx['Предмет']   || colIdx['subject_name'] || 1] || '').trim();
      const docType = String(row[colIdx['Обоснование для оплаты'] || colIdx['doc_type_name'] || 0] || '').toLowerCase();
      const revenue = safeNum(row[colIdx['К перечислению за товар'] || colIdx['ppvz_for_pay'] || 0]);
      const retail  = safeNum(row[colIdx['Цена розничная'] || colIdx['retail_amount'] || 0]);
      const logist  = safeNum(row[colIdx['Услуги по доставке товара покупателю'] || colIdx['delivery_rub'] || 0]);
      const penalty = safeNum(row[colIdx['Общая сумма штрафов'] || colIdx['penalty'] || 0]);

      if (!byProduct[article]) byProduct[article] = { article, subject, revenue: 0, retail: 0, logistics: 0, penalties: 0, sales: 0, returns: 0 };
      byProduct[article].revenue   += revenue;
      byProduct[article].retail    += retail;
      byProduct[article].logistics += logist;
      byProduct[article].penalties += penalty;
      if (docType.includes('продажа')) byProduct[article].sales++;
      if (docType.includes('возврат')) byProduct[article].returns++;
    });

    const sorted = Object.values(byProduct).sort((a, b) => b.revenue - a.revenue);
    return { ok: true, data: sorted.slice(0, limit), total: sorted.length };
  } catch(e) {
    return { ok: false, error: e.message };
  }
}

// ─── 5. Платное хранение ─────────────────────────────────────────
function getStorage(limit) {
  limit = limit || 300;
  try {
    const rows = sheetToObjects(SHEETS.STORAGE);
    return { ok: true, data: rows.slice(0, limit), total: rows.length };
  } catch(e) {
    return { ok: false, error: e.message };
  }
}

// ─── 6. Реклама ──────────────────────────────────────────────────
function getAds(limit) {
  limit = limit || 300;
  try {
    const rows = sheetToObjects(SHEETS.ADS);
    return { ok: true, data: rows.slice(0, limit), total: rows.length };
  } catch(e) {
    return { ok: false, error: e.message };
  }
}

// ─── 7. Юнитка ───────────────────────────────────────────────────
function getUnitEcon(limit) {
  limit = limit || 200;
  try {
    const rows = sheetToObjects(SHEETS.UNIT);
    return { ok: true, data: rows.slice(0, limit), total: rows.length };
  } catch(e) {
    return { ok: false, error: e.message };
  }
}

// ─── 8. Артикулы (список товаров) ────────────────────────────────
function getArticles(limit) {
  limit = limit || 300;
  try {
    const rows = sheetToObjects(SHEETS.ARTICLES);
    return { ok: true, data: rows.slice(0, limit), total: rows.length };
  } catch(e) {
    return { ok: false, error: e.message };
  }
}

// ─── 9. Поставки ─────────────────────────────────────────────────
function getSupplies(limit) {
  limit = limit || 200;
  try {
    const rows = sheetToObjects(SHEETS.SUPPLIES);
    return { ok: true, data: rows.slice(0, limit), total: rows.length };
  } catch(e) {
    return { ok: false, error: e.message };
  }
}

// ─── 10. Финмодель ───────────────────────────────────────────────
function getFinModel() {
  try {
    const rows = sheetToObjects(SHEETS.FINMODEL);
    return { ok: true, data: rows };
  } catch(e) {
    return { ok: false, error: e.message };
  }
}

// ─── 11. Отчёт (💰 Отчет) ────────────────────────────────────────
function getReport() {
  try {
    const rows = sheetToObjects(SHEETS.REPORT);
    return { ok: true, data: rows };
  } catch(e) {
    return { ok: false, error: e.message };
  }
}

// ─── List all sheet names ──────────────────────────────────────────
function getSheetNames() {
  try {
    const names = SpreadsheetApp.getActiveSpreadsheet().getSheets().map(s => s.getName());
    return { ok: true, sheets: names };
  } catch(e) {
    return { ok: false, error: e.message };
  }
}
