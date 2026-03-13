// updater.js — Автообновление виджета
//
// Как настроить:
//   1. Запушьте файлы в публичный GitHub-репозиторий
//   2. Замените VERSION_JSON_URL на путь к вашему version.json:
//      https://raw.githubusercontent.com/<user>/<repo>/main/version.json
//   3. В version.json укажите прямые ссылки для скачивания каждого файла.
//
// Формат version.json:
// {
//   "version": "2.1.0",
//   "files": [
//     { "name": "core.js",        "dir": "module", "url": "https://..." },
//     { "name": "Ramadan Widget.js","dir": "root",  "url": "https://..." }
//   ]
// }

const VERSION_JSON_URL =
  "https://raw.githubusercontent.com/jeguako/codeer/main/version.json"

const fm    = FileManager.iCloud()
const root  = fm.documentsDirectory()
const dir   = fm.joinPath(root, "RamadanWidget")

// ─── Утилиты ──────────────────────────────────────────

function parseVer(v) {
  return (v || "0.0.0").split(".").map(Number)
}

function isNewer(remote, local) {
  const r = parseVer(remote)
  const l = parseVer(local)
  for (let i = 0; i < Math.max(r.length, l.length); i++) {
    if ((r[i] || 0) > (l[i] || 0)) return true
    if ((r[i] || 0) < (l[i] || 0)) return false
  }
  return false
}

async function fetchJSON(url, timeout) {
  const req = new Request(url)
  req.timeoutInterval = timeout || 10
  return await req.loadJSON()
}

async function fetchData(url, timeout) {
  const req = new Request(url)
  req.timeoutInterval = timeout || 20
  return await req.load()
}

// ─── Основная функция ─────────────────────────────────

/**
 * Проверяет наличие обновления и при необходимости загружает файлы.
 *
 * @param {string} localVersion  текущая версия (из core.VERSION)
 * @param {boolean} silent       true — без диалогов (только тихая проверка)
 * @returns {boolean}            true если обновление установлено
 */
async function checkAndUpdate(localVersion, silent) {
  silent = silent !== false  // по умолчанию тихий режим

  // Если URL не настроен — ничего не делаем
  if (VERSION_JSON_URL.includes("YOUR_USER")) return false

  let manifest
  try {
    manifest = await fetchJSON(VERSION_JSON_URL, 10)
  } catch {
    return false
  }

  if (!manifest || !manifest.version || !Array.isArray(manifest.files)) {
    return false
  }

  if (!isNewer(manifest.version, localVersion)) {
    return false   // уже актуальная версия
  }

  // ── Спрашиваем разрешение (если не тихий режим) ──────
  if (!silent) {
    const a = new Alert()
    a.title = "Доступно обновление 🌙"
    a.message =
      `Версия ${manifest.version}\n` +
      (manifest.changelog ? manifest.changelog + "\n" : "") +
      "\nОбновить сейчас?"
    a.addAction("Обновить")
    a.addCancelAction("Позже")
    if (await a.present() !== 0) return false
  }

  // ── Скачиваем файлы ───────────────────────────────────
  const errors = []
  for (const file of manifest.files) {
    if (!file.name || !file.url) continue
    try {
      const data    = await fetchData(file.url, 25)
      const destDir = file.dir === "root" ? root : dir
      fm.write(fm.joinPath(destDir, file.name), data)
    } catch (e) {
      errors.push(file.name)
    }
  }

  // ── Результат (если не тихий режим) ──────────────────
  if (!silent) {
    const a = new Alert()
    if (errors.length === 0) {
      a.title = "Обновление завершено ✓"
      a.message =
        `Версия ${manifest.version} установлена.\n` +
        "Нажмите на виджет — он перезапустится."
    } else {
      a.title = "Обновление с ошибками"
      a.message = "Не удалось загрузить:\n" + errors.join(", ")
    }
    a.addAction("OK")
    await a.present()
  }

  return errors.length === 0
}

module.exports = { checkAndUpdate }
