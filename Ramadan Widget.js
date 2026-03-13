// icon-color: gray; icon-glyph: moon;
// Ramadan Widget v2.0.0
//
// ⚙️ НАСТРОЙКА: укажи свой публичный GitHub-репозиторий
const GITHUB_RAW = "https://raw.githubusercontent.com/YOUR_USER/YOUR_REPO/main"

// ─────────────────────────────────────────────────────
//  САМОУСТАНОВКА — при первом запуске скачивает модули
//  с GitHub автоматически. Пользователю нужен только
//  этот один файл.
// ─────────────────────────────────────────────────────

const fm   = FileManager.iCloud()
const root = fm.documentsDirectory()
const dir  = fm.joinPath(root, "RamadanWidget")

const MODULES = [
  "core.js",
  "theme.js",
  "settings.js",
  "balance.js",
  "updater.js",
  "widget.small.js",
  "widget.medium.js",
  "widget.large.js",
  "widget.lockscreen.js",
]

// Проверяет наличие модулей и скачивает отсутствующие
async function ensureModules() {
  if (!fm.fileExists(dir)) fm.createDirectory(dir)

  const missing = MODULES.filter(
    m => !fm.fileExists(fm.joinPath(dir, m))
  )
  if (missing.length === 0) return

  // Показываем уведомление только при первой установке
  const isFirstRun = missing.length === MODULES.length
  if (isFirstRun && !config.runsInWidget) {
    const a = new Alert()
    a.title = "Ramadan Widget 🌙"
    a.message = "Первый запуск — загружаю модули…\nЭто займёт несколько секунд."
    a.addAction("OK")
    await a.present()
  }

  const errors = []
  for (const name of missing) {
    try {
      const req = new Request(`${GITHUB_RAW}/${encodeURIComponent(name)}`)
      req.timeoutInterval = 20
      const data = await req.load()
      fm.write(fm.joinPath(dir, name), data)
    } catch {
      errors.push(name)
    }
  }

  if (errors.length > 0) {
    const a = new Alert()
    a.title = "Ошибка загрузки"
    a.message = "Не удалось загрузить:\n" + errors.join("\n") +
      "\n\nПроверь интернет и запусти ещё раз."
    a.addAction("OK")
    await a.present()
    Script.complete()
    return false
  }

  // Первая установка завершена
  if (isFirstRun && !config.runsInWidget) {
    const a = new Alert()
    a.title = "Установка завершена ✓"
    a.message =
      "Что дальше:\n" +
      "1. Долгий тап на рабочем столе → «+»\n" +
      "2. Найди Scriptable\n" +
      "3. Выбери размер виджета\n" +
      "4. В настройках виджета укажи «Ramadan Widget»\n\n" +
      "Для категорий — открой этот скрипт напрямую."
    a.addAction("Отлично!")
    await a.present()
  }

  return true
}

// ─── ЗАГРУЗКА МОДУЛЕЙ ─────────────────────────────────
await ensureModules()

function load(name) {
  return importModule(fm.joinPath(dir, name))
}

const core = load("core.js")

// ─── РЕЖИМ ВИДЖЕТА ────────────────────────────────────
if (config.runsInWidget) {
  let widget

  if (config.widgetFamily === "small") {
    widget = await load("widget.small.js").render(core)
  } else if (config.widgetFamily === "medium") {
    widget = await load("widget.medium.js").render(core)
  } else if (config.widgetFamily === "large") {
    widget = await load("widget.large.js").render(core)
  } else if (
    config.widgetFamily === "accessoryRectangular" ||
    config.widgetFamily === "accessoryCircular"    ||
    config.widgetFamily === "accessoryInline"
  ) {
    widget = await load("widget.lockscreen.js").render(core)
  }

  if (widget) Script.setWidget(widget)

  // Тихая проверка обновлений (не блокирует виджет)
  try {
    await load("updater.js").checkAndUpdate(core.VERSION, true)
  } catch {}

// ─── РЕЖИМ ПРИЛОЖЕНИЯ (настройки + обновление) ────────
} else {
  // Предложить обновление если есть
  try {
    await load("updater.js").checkAndUpdate(core.VERSION, false)
  } catch {}

  // Открыть менеджер категорий
  try {
    await load("settings.js").show(core.loadSettings, core.saveSettings)
  } catch (e) {
    const a = new Alert()
    a.title = "Ошибка"
    a.message = e.message
    a.addAction("OK")
    await a.present()
  }
}

Script.complete()
