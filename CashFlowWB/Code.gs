// ═══════════════════════════════════════════════════════════════════════
//  CashFlowWB — WEB APP  |  Google Apps Script
//  Сервисные функции для веб-интерфейса
// ═══════════════════════════════════════════════════════════════════════

// ── КОНФИГ ЛИСТОВ (имена должны совпадать с реальными листами таблицы) ──
const WEB_CONFIG = {
  SHEETS: {
    SETTINGS:   '⚙️ Настройки',
    PL_MONTHLY: '📊 P&LДДС',
    REPORT:     '💰 Отчет',
    OPERATIONS: '📝 Операции',
    DETAILS:    'Детализации Свод.',
  },
  // Строки листа 📊 P&LДДС (0-based)
  PL_ROWS: {
    MONTH_NAME:       0,   // строка 1  → A1=2026, B1=Январь, C1=Февраль ...
    REVENUE_GROSS:    1,   // строка 2  → Выручка без СПП
    REVENUE_SPP:      2,   // строка 3  → Выручка с СПП
    SALES_COUNT:      3,   // строка 4  → Количество продаж
    WB_COSTS_TOTAL:   6,   // строка 7  → Расходы ВБ (итого)
    COMMISSION:       7,   // строка 8  → Комиссия ВБ
    LOGISTICS:        8,   // строка 9  → Логистика ВБ
    ADS:              9,   // строка 10 → ВБ.Продвижение
    FINES:           10,   // строка 11 → Штрафы ВБ
    STORAGE:         11,   // строка 12 → Хранение ВБ
    PAID_INTAKE:     12,   // строка 13 → Платная приёмка ВБ
    OTHER_WH:        13,   // строка 14 → Прочие удержания ВБ
    REVIEW_DEDUCT:   14,   // строка 15 → Списание за отзыв
    STORAGE_PVZ:     15,   // строка 16 → Хранение возвратов на ПВЗ
    TRANSIT:         16,   // строка 17 → Транзитные поставки
    LOYALTY_POINTS:  17,   // строка 18 → Баллы программы лояльности
    LOYALTY_PROG:    18,   // строка 19 → Участие в программе лояльности
    COST_PRICE:      36,   // строка 37 → Себестоимость
    MARGIN_AMOUNT:   37,   // строка 38 → Маржинальный доход
    MARGIN_PCT:      38,   // строка 39 → Маржинальность %
    OP_EXPENSES:     39,   // строка 40 → Операционные расходы
    GOODS_EXPENSES:  40,   // строка 41 → Расходы на товар
  },
  // Ячейки листа ⚙️ Настройки
  SETTINGS_CELLS: {
    BALANCE_TOTAL:    'G21',  // ИТОГО по всем счетам (формула =SUM(G4:G20))
    API_TOKEN:        'C14',  // API-токен WB
    DATE_FROM:        'C15',  // Начальная дата выборки
    DATE_TO:          'C16',  // Конечная дата выборки
    LAST_UPDATE:      'B2',   // Метка последнего обновления
    // ⚠️ НУЖНО ДОБАВИТЬ в таблицу:
    // C4 = "К выводу WB" — добавь формулу или вставляй значение из API
    // C5 = "Заказов сегодня"  (из листа Заказы)
    // C6 = "Продаж сегодня"   (из листа Продажи и возвраты)
    // C7 = "Возвратов сегодня" (из листа Продажи и возвраты)
    // C8 = "Браков сегодня"    (из листа Продажи и возвраты)
    WITHDRAW_AVAIL:   'C4',   // К выводу (добавь ячейку!)
    ORDERS_TODAY:     'C5',   // Заказов сегодня (добавь формулу!)
    SALES_TODAY:      'C6',   // Продаж сегодня
    RETURNS_TODAY:    'C7',   // Возвратов сегодня
    DEFECTS_TODAY:    'C8',   // Браков сегодня
  },
};

// ═══════════════════════════════════════════════════════════════════════
//  doGet — точка входа в веб-приложение
// ═══════════════════════════════════════════════════════════════════════
function doGet(e) {
  const page = (e && e.parameter && e.parameter.page) || 'dashboard';
  const pageMap = {
    'dashboard': 'cashflowwb-dashboard',
    'settings':  'cashflowwb-settings',
  };
  const file = pageMap[page] || 'cashflowwb-dashboard';
  return HtmlService.createHtmlOutputFromFile(file)
    .setTitle('CashFlowWB')
    .addMetaTag('viewport', 'width=device-width,initial-scale=1,maximum-scale=1,user-scalable=no')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

// ═══════════════════════════════════════════════════════════════════════
//  getDashboardData — основные метрики для главной страницы
//  Возвращает JSON-объект со всеми показателями
// ═══════════════════════════════════════════════════════════════════════
function getDashboardData(monthOffset) {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const cfg = WEB_CONFIG;

    // ── 1. БАЛАНС из ⚙️ Настройки!G21 ──────────────────────────────
    const settingsSheet = ss.getSheetByName(cfg.SHEETS.SETTINGS);
    const balance       = _num(settingsSheet.getRange(cfg.SETTINGS_CELLS.BALANCE_TOTAL).getValue());
    // К выводу — ячейка C4 (добавь формулу в таблицу, пока 0)
    const withdrawAvail = _num(settingsSheet.getRange(cfg.SETTINGS_CELLS.WITHDRAW_AVAIL).getValue());
    // Заказов / продаж сегодня (если ячейки C5-C8 заполнены формулами)
    const ordersToday   = _num(settingsSheet.getRange(cfg.SETTINGS_CELLS.ORDERS_TODAY).getValue());
    const salesToday    = _num(settingsSheet.getRange(cfg.SETTINGS_CELLS.SALES_TODAY).getValue());
    const returnsToday  = _num(settingsSheet.getRange(cfg.SETTINGS_CELLS.RETURNS_TODAY).getValue());
    const defectsToday  = _num(settingsSheet.getRange(cfg.SETTINGS_CELLS.DEFECTS_TODAY).getValue());
    const lastUpdate    = settingsSheet.getRange(cfg.SETTINGS_CELLS.LAST_UPDATE).getValue();

    // ── 2. P&L ДДС: данные по месяцам ──────────────────────────────
    const plSheet = ss.getSheetByName(cfg.SHEETS.PL_MONTHLY);
    // Читаем всю матрицу A1:N50 (14 столбцов × 50 строк)
    const plData  = plSheet.getRange('A1:N50').getValues();

    // Находим последний месяц с данными (ищем ненулевую Выручку с СПП)
    let lastDataCol = 1;  // по умолчанию январь (колонка B = индекс 1)
    for (let c = 1; c <= 12; c++) {
      const v = plData[cfg.PL_ROWS.REVENUE_SPP][c];
      if (v !== 0 && v !== '' && v !== null) lastDataCol = c;
    }

    // Применяем смещение (0=последний месяц, -1=предыдущий и т.д.)
    const offset = monthOffset || 0;
    const col = Math.max(1, Math.min(12, lastDataCol + offset));

    // Метаданные выбранного периода
    const periodName   = plData[cfg.PL_ROWS.MONTH_NAME][col] || ('Мес. ' + col);
    const prevCol      = Math.max(1, col - 1);
    const prevPeriod   = plData[cfg.PL_ROWS.MONTH_NAME][prevCol] || '';

    // ── WB-расходы (из P&L ДДС) ─────────────────────────────────────
    const r = cfg.PL_ROWS;
    const commission  = _num(plData[r.COMMISSION  ][col]);
    const logistics   = _num(plData[r.LOGISTICS   ][col]);
    const ads         = _num(plData[r.ADS         ][col]);
    const fines       = _num(plData[r.FINES       ][col]);
    const storage     = _num(plData[r.STORAGE     ][col]);
    const paidIntake  = _num(plData[r.PAID_INTAKE ][col]);
    const otherWh     = _num(plData[r.OTHER_WH    ][col]);

    // Детализация прочих удержаний
    const storagePvz     = _num(plData[r.STORAGE_PVZ    ][col]);
    const transit        = _num(plData[r.TRANSIT         ][col]);
    const loyaltyPoints  = _num(plData[r.LOYALTY_POINTS  ][col]);
    const loyaltyProg    = _num(plData[r.LOYALTY_PROG    ][col]);
    const reviewDeduct   = _num(plData[r.REVIEW_DEDUCT   ][col]);

    // Финансовые итоги
    const revenueSpp   = _num(plData[r.REVENUE_SPP   ][col]);
    const revenueGross = _num(plData[r.REVENUE_GROSS  ][col]);
    const salesCount   = _num(plData[r.SALES_COUNT    ][col]);
    const costPrice    = _num(plData[r.COST_PRICE      ][col]);
    const marginAmount = _num(plData[r.MARGIN_AMOUNT   ][col]);
    const marginPct    = _num(plData[r.MARGIN_PCT      ][col]);
    const wbCostsTotal = _num(plData[r.WB_COSTS_TOTAL  ][col]);

    // ── 3. Операционные расходы из 📝 Операции ──────────────────────
    // Читаем все операции текущего месяца и суммируем по статьям
    const opResult = _getOperationalCosts(ss, col);

    // ── 4. Данные для спарклайнов (последние 6 месяцев) ─────────────
    const sparkMonths = Math.min(6, col);
    const sparks = {};
    const sparkMetrics = [
      'commission', 'logistics', 'ads', 'fines',
      'storage', 'paidIntake', 'otherWh', 'revenueSpp'
    ];
    const sparkRowMap = {
      commission:  r.COMMISSION,
      logistics:   r.LOGISTICS,
      ads:         r.ADS,
      fines:       r.FINES,
      storage:     r.STORAGE,
      paidIntake:  r.PAID_INTAKE,
      otherWh:     r.OTHER_WH,
      revenueSpp:  r.REVENUE_SPP,
    };
    sparkMetrics.forEach(key => {
      sparks[key] = [];
      for (let c = Math.max(1, col - sparkMonths + 1); c <= col; c++) {
        sparks[key].push(Math.abs(_num(plData[sparkRowMap[key]][c])));
      }
    });

    return {
      ok: true,
      period:       periodName,
      prevPeriod:   prevPeriod,
      lastDataCol:  lastDataCol,
      lastUpdate:   lastUpdate ? lastUpdate.toString() : '',

      // Баланс и к выводу
      balance:        balance,
      withdrawAvail:  withdrawAvail,

      // Счётчики (сегодня) — из ⚙️ Настройки C5-C8
      ordersToday:    ordersToday,
      salesToday:     salesToday,
      returnsToday:   returnsToday,
      defectsToday:   defectsToday,

      // Выручка и продажи
      revenueSpp:     revenueSpp,
      revenueGross:   revenueGross,
      salesCount:     salesCount,

      // WB-расходы
      wbCostsTotal:   wbCostsTotal,
      commission:     commission,
      logistics:      logistics,
      ads:            ads,
      fines:          fines,
      storage:        storage,
      paidIntake:     paidIntake,
      otherWh:        otherWh,

      // Детализация прочих удержаний
      storagePvz:     storagePvz,
      transit:        transit,
      loyaltyPoints:  loyaltyPoints,
      loyaltyProg:    loyaltyProg,
      reviewDeduct:   reviewDeduct,

      // Маржа
      costPrice:      costPrice,
      marginAmount:   marginAmount,
      marginPct:      marginPct,

      // Операционные расходы (из 📝 Операции)
      opExpenses:       opResult.total,
      commercialExp:    opResult.commercial,
      goodsExp:         opResult.goods,
      withdrawalAmount: opResult.withdrawal,
      transferAmount:   opResult.transfer,
      rnpAmount:        opResult.rnp,

      // Спарклайны (массивы за последние 6 мес.)
      sparks: sparks,
    };

  } catch (e) {
    Logger.log('getDashboardData error: ' + e.message);
    return { ok: false, error: e.message };
  }
}

// ── Операционные расходы из листа 📝 Операции за выбранный месяц ────
function _getOperationalCosts(ss, monthColIndex) {
  const result = { total: 0, commercial: 0, goods: 0, withdrawal: 0, transfer: 0, rnp: 0 };
  try {
    const opSheet = ss.getSheetByName(WEB_CONFIG.SHEETS.OPERATIONS);
    if (!opSheet) return result;

    const lastRow = opSheet.getLastRow();
    if (lastRow < 2) return result;

    // Читаем Дату(A), Сумму(B), Статью(D)
    const data = opSheet.getRange(2, 1, lastRow - 1, 4).getValues();

    // Определяем диапазон дат для выбранного месяца
    // monthColIndex: 1=Янв, 2=Фев, ... в таблице год=2026
    const year = 2026; // TODO: брать из A1 листа P&LДДС
    const monthStart = new Date(year, monthColIndex - 1, 1);
    const monthEnd   = new Date(year, monthColIndex, 0, 23, 59, 59);

    // Статьи для операционных расходов (из листа Настройки колонок M-N)
    const ARTICLES = {
      commercial: ['Внутренняя реклама (с карты)', 'Внешняя реклама', 'SEO - оптимизация',
                   'Дизайнеры/Фотографы', 'Самовыкуп товара'],
      goods:      ['Закуп товара', 'Складские издержки', 'Доставка', 'ФФ', 'ЧЗ'],
      withdrawal: ['Вывод денег'],
      transfer:   ['Перевод между счетами'],
      rnp:        ['РНП', 'Налоги и взносы', 'Бюджетные платежи'],
    };

    data.forEach(row => {
      const rawDate = row[0];
      const amount  = parseFloat(row[1]) || 0;
      const article = (row[3] || '').toString();

      // Конвертируем Excel-дату или JS-дату
      let date;
      if (rawDate instanceof Date) {
        date = rawDate;
      } else if (typeof rawDate === 'number') {
        // Excel serial date → JS Date
        date = new Date((rawDate - 25569) * 86400000);
      } else return;

      if (date < monthStart || date > monthEnd) return;

      // Определяем категорию по статье
      let matched = false;
      for (const [cat, arts] of Object.entries(ARTICLES)) {
        if (arts.some(a => article.includes(a))) {
          result[cat] += amount;
          result.total += amount;
          matched = true;
          break;
        }
      }
    });
  } catch (e) {
    Logger.log('_getOperationalCosts error: ' + e.message);
  }
  return result;
}

// ═══════════════════════════════════════════════════════════════════════
//  getMonthList — список доступных месяцев для селектора периода
// ═══════════════════════════════════════════════════════════════════════
function getMonthList() {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const plSheet = ss.getSheetByName(WEB_CONFIG.SHEETS.PL_MONTHLY);
    const row1 = plSheet.getRange('A1:M1').getValues()[0]; // заголовки месяцев
    const row3 = plSheet.getRange('A3:M3').getValues()[0]; // Выручка с СПП (наличие данных)

    const months = [];
    for (let c = 1; c <= 12; c++) {
      const name = row1[c];
      const hasData = row3[c] !== 0 && row3[c] !== '' && row3[c] !== null;
      if (name) months.push({ col: c - 1, name: name, hasData: hasData });
    }
    return { ok: true, months: months };
  } catch (e) {
    return { ok: false, error: e.message };
  }
}

// ═══════════════════════════════════════════════════════════════════════
//  API TOKEN — получение и сохранение
// ═══════════════════════════════════════════════════════════════════════
function getApiToken() {
  // Сначала проверяем UserProperties (безопасное хранение)
  const fromProps = (PropertiesService.getUserProperties().getProperty('WB_API_TOKEN') || '').trim();
  if (fromProps && fromProps.length > 30) return fromProps;
  // Иначе читаем из таблицы (⚙️ Настройки!C14)
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const cell = ss.getSheetByName(WEB_CONFIG.SHEETS.SETTINGS).getRange(WEB_CONFIG.SETTINGS_CELLS.API_TOKEN).getValue();
    return (cell || '').toString().trim();
  } catch (e) { return ''; }
}

function saveApiToken(token) {
  const t = (token || '').trim();
  if (!t || t.length < 30) throw new Error('Токен слишком короткий');
  PropertiesService.getUserProperties().setProperty('WB_API_TOKEN', t);
  // Также записываем в таблицу (ячейка ⚙️ Настройки!C14)
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    ss.getSheetByName(WEB_CONFIG.SHEETS.SETTINGS).getRange(WEB_CONFIG.SETTINGS_CELLS.API_TOKEN).setValue(t);
  } catch (e) { /* таблица недоступна — ничего страшного */ }
  return 'ok';
}

function getMaskedToken() {
  const t = getApiToken();
  if (!t || t.length < 8) return { token: '', masked: 'не задан' };
  return { token: '', masked: t.substring(0, 8) + '...' + t.slice(-4) };
}

// ═══════════════════════════════════════════════════════════════════════
//  Вспомогательные функции
// ═══════════════════════════════════════════════════════════════════════
function _num(v) {
  const n = parseFloat(v);
  return isNaN(n) ? 0 : n;
}
