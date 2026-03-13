// core.js — ЕДИНЫЙ ИСТОЧНИК ДАННЫХ v2.0.0

const VERSION = "2.0.0"

const fm = FileManager.iCloud()
const root = fm.documentsDirectory()
const dir = fm.joinPath(root, "RamadanWidget")
const SETTINGS_PATH = fm.joinPath(dir, "settings.json")

// ─── SETTINGS ─────────────────────────────────────────

function getDefaultSettings() {
  return {
    categories: [
      { name: "Намаз",     active: true,  level: 7 },
      { name: "Коран",     active: true,  level: 5 },
      { name: "Здоровье",  active: true,  level: 6 },
      { name: "Семья",     active: true,  level: 8 },
      { name: "Работа",    active: true,  level: 7 }
    ],
    viewMode: "list"  // "list" | "wheel"
  }
}

function loadSettings() {
  try {
    if (fm.fileExists(SETTINGS_PATH)) {
      return JSON.parse(fm.readString(SETTINGS_PATH))
    }
  } catch {}
  return getDefaultSettings()
}

function saveSettings(s) {
  try {
    if (!fm.fileExists(dir)) fm.createDirectory(dir, true)
    fm.writeString(SETTINGS_PATH, JSON.stringify(s, null, 2))
  } catch {}
}

// ─── LOCATION ─────────────────────────────────────────

async function getLocation() {
  Location.setAccuracyToKilometer()
  return await Location.current()
}

// ─── PRAYERS ──────────────────────────────────────────

async function getPrayerTimes(lat, lon) {
  const req = new Request(
    `https://api.aladhan.com/v1/timings?latitude=${lat}&longitude=${lon}&method=2`
  )
  req.timeoutInterval = 15
  const json = await req.loadJSON()
  return json.data.timings
}

// ─── HIJRI ────────────────────────────────────────────

function getHijriDate() {
  try {
    return new Intl.DateTimeFormat("ru-RU-u-ca-islamic", {
      day: "numeric", month: "long", year: "numeric"
    }).format(new Date())
  } catch { return "" }
}

function hijriPart(part) {
  try {
    return parseInt(
      new Intl.DateTimeFormat("en-US-u-ca-islamic", { [part]: "numeric" })
        .format(new Date()), 10
    )
  } catch { return 0 }
}

// ─── ISLAMIC HELPERS ──────────────────────────────────

// 13-е, 14-е, 15-е числа лунного месяца — «Аийам аль-Бид» (желательный пост)
function isAyyamAlBid() {
  const d = hijriPart("day")
  return d >= 13 && d <= 15
}

// Понедельник (1) или четверг (4)
function isMondayOrThursday() {
  const d = new Date().getDay()
  return d === 1 || d === 4
}

// Идёт ли сейчас Рамадан (9-й месяц хиджры)
function isRamadan() {
  return hijriPart("month") === 9
}

// ─── БЛИЖАЙШИЙ РАМАДАН ────────────────────────────────

// Приближённые даты начала Рамадана (первый день)
const RAMADAN_STARTS = {
  2025: [2025, 2,  1],   // 1 марта 2025
  2026: [2026, 1, 18],   // 18 февраля 2026
  2027: [2027, 1,  7],   // 7 февраля 2027
  2028: [2028, 0, 28],   // 28 января 2028
  2029: [2029, 0, 17],   // 17 января 2029
  2030: [2030, 0,  6]    // 6 января 2030
}

function nextRamadanDate() {
  const now = new Date()
  for (const y of Object.keys(RAMADAN_STARTS).sort()) {
    const d = new Date(...RAMADAN_STARTS[y])
    if (d > now) return d
  }
  return new Date(now.getFullYear() + 1, 1, 18)
}

function daysToNextRamadan() {
  return Math.max(0, Math.ceil((nextRamadanDate() - new Date()) / 86400000))
}

// ─── MAIN ─────────────────────────────────────────────

async function load() {
  let prayers = null
  try {
    const loc = await getLocation()
    prayers = await getPrayerTimes(loc.latitude, loc.longitude)
  } catch {}

  const settings = loadSettings()

  return {
    daysLeft:           daysToNextRamadan(),
    hijriDate:          getHijriDate(),
    hijriDay:           hijriPart("day"),
    hijriMonth:         hijriPart("month"),
    prayers,
    now:                new Date(),
    isRamadan:          isRamadan(),
    isAyyamAlBid:       isAyyamAlBid(),
    isMondayOrThursday: isMondayOrThursday(),
    nextRamadan:        nextRamadanDate(),
    categories:         settings.categories,
    viewMode:           settings.viewMode,
    version:            VERSION
  }
}

module.exports = { load, loadSettings, saveSettings, VERSION }
