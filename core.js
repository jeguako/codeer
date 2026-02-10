// core.js — ЕДИНЫЙ ИСТОЧНИК ДАННЫХ

const RAMADAN_DATE = new Date(new Date().getFullYear(), 1, 19)

// ---------- LOCATION ----------
async function getLocation() {
  Location.setAccuracyToKilometer()
  return await Location.current()
}

// ---------- PRAYERS ----------
async function getPrayerTimes(lat, lon) {
  const url =
    `https://api.aladhan.com/v1/timings?latitude=${lat}&longitude=${lon}&method=2`

  const req = new Request(url)
  req.timeoutInterval = 15
  const json = await req.loadJSON()
  return json.data.timings
}

// ---------- DAYS ----------
function daysToRamadan() {
  const now = new Date()
  return Math.max(0, Math.ceil((RAMADAN_DATE - now) / 86400000))
}

// ---------- HIJRI ----------
function getHijriDate() {
  try {
    return new Intl.DateTimeFormat(
      "ru-RU-u-ca-islamic",
      { day: "numeric", month: "long", year: "numeric" }
    ).format(new Date())
  } catch {
    return ""
  }
}

// ---------- MAIN ----------
async function load() {
  let prayers = null

  try {
    const loc = await getLocation()
    prayers = await getPrayerTimes(loc.latitude, loc.longitude)
  } catch {}

  return {
    daysLeft: daysToRamadan(),
    hijriDate: getHijriDate(),
    prayers,
    now: new Date()
  }
}

module.exports = { load }
