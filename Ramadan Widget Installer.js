// icon-color: gray; icon-glyph: moon;

// =====================================================
//  Ramadan Widget Installer v2.0
//  Источник: GitHub (замени GITHUB_RAW на свой репо)
// =====================================================

// ⚠️ НАСТРОЙ ПЕРЕД ПУБЛИКАЦИЕЙ:
// Замени строку ниже на путь к своему публичному репозиторию на GitHub.
// Пример: "https://raw.githubusercontent.com/username/repo/main"
const GITHUB_RAW = "https://raw.githubusercontent.com/YOUR_USER/YOUR_REPO/main"

// =====================================================

const fm         = FileManager.iCloud()
const root       = fm.documentsDirectory()
const moduleDir  = fm.joinPath(root, "RamadanWidget")

if (!fm.fileExists(moduleDir)) {
  fm.createDirectory(moduleDir)
}

// [ имя файла, папка назначения ]
const FILES = [
  // Точка входа — в корне Scriptable
  ["Ramadan Widget.js",    root],

  // Модули — в папке RamadanWidget
  ["core.js",              moduleDir],
  ["theme.js",             moduleDir],
  ["settings.js",          moduleDir],
  ["balance.js",           moduleDir],
  ["updater.js",           moduleDir],
  ["widget.small.js",      moduleDir],
  ["widget.medium.js",     moduleDir],
  ["widget.large.js",      moduleDir],
  ["widget.lockscreen.js", moduleDir],
]

// ─── Загрузка одного файла с GitHub ──────────────────
async function downloadFile(filename) {
  // Пробелы в имени кодируем
  const encoded = encodeURIComponent(filename)
  const url = `${GITHUB_RAW}/${encoded}`
  const req = new Request(url)
  req.timeoutInterval = 20
  const data = await req.load()
  if (!data || data.length === 0) {
    throw new Error(`Пустой ответ для: ${filename}`)
  }
  return data
}

// ─── Прогресс-алёрт ──────────────────────────────────
function progressAlert(current, total, name) {
  // В Scriptable нельзя обновить алёрт на лету,
  // поэтому прогресс выводим в консоль.
  console.log(`[${current}/${total}] ${name}`)
}

// ─── Установка ────────────────────────────────────────
const errors = []

for (let i = 0; i < FILES.length; i++) {
  const [name, dir] = FILES[i]
  progressAlert(i + 1, FILES.length, name)
  try {
    const data = await downloadFile(name)
    fm.write(fm.joinPath(dir, name), data)
  } catch (e) {
    errors.push(`${name}: ${e.message}`)
  }
}

// ─── Результат ────────────────────────────────────────
const alert = new Alert()

if (errors.length === 0) {
  alert.title = "Ramadan Widget 🌙"
  alert.message =
    "Установка завершена!\n\n" +
    "Что дальше:\n" +
    "1. Долгий тап на рабочем столе → «+»\n" +
    "2. Найди Scriptable\n" +
    "3. Выбери размер виджета\n" +
    "4. В настройках виджета укажи «Ramadan Widget»\n\n" +
    "Для настройки категорий — открой скрипт\n" +
    "«Ramadan Widget» напрямую в Scriptable."
} else {
  alert.title = "Установка завершена с ошибками"
  alert.message =
    `Успешно: ${FILES.length - errors.length} из ${FILES.length}\n\n` +
    "Ошибки:\n" + errors.join("\n") + "\n\n" +
    "Попробуй запустить инсталлятор ещё раз."
}

alert.addAction("OK")
await alert.present()

Script.complete()
