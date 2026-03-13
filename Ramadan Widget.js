// icon-color: gray; icon-glyph: moon;
// Ramadan Widget v2.0.0

const fm   = FileManager.iCloud()
const root = fm.documentsDirectory()
const dir  = fm.joinPath(root, "RamadanWidget")

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
    config.widgetFamily === "accessoryCircular" ||
    config.widgetFamily === "accessoryInline"
  ) {
    widget = await load("widget.lockscreen.js").render(core)
  }

  if (widget) Script.setWidget(widget)

  // Тихая фоновая проверка обновлений (не блокирует виджет)
  try {
    const updater = load("updater.js")
    await updater.checkAndUpdate(core.VERSION, true)
  } catch {}

// ─── РЕЖИМ ПРИЛОЖЕНИЯ (настройки) ────────────────────
} else {
  // Проверка обновлений с диалогом
  try {
    const updater = load("updater.js")
    await updater.checkAndUpdate(core.VERSION, false)
  } catch {}

  // Открыть менеджер категорий
  try {
    const settings = load("settings.js")
    await settings.show(core.loadSettings, core.saveSettings)
  } catch (e) {
    const a = new Alert()
    a.title = "Ошибка настроек"
    a.message = e.message
    a.addAction("OK")
    await a.present()
  }
}

Script.complete()
