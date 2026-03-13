// widget.small.js

const theme = importModule("theme")

module.exports.render = async (core) => {
  const data = await core.load()
  const w = new ListWidget()
  w.backgroundGradient = theme.background()
  w.setPadding(12, 12, 12, 12)

  const stack = w.addStack()
  stack.layoutVertically()
  stack.centerAlignContent()
  stack.addSpacer()

  // Луна
  const moon = stack.addText(data.isRamadan ? "🌒" : "🌙")
  moon.font = Font.systemFont(36)
  moon.centerAlignText()

  stack.addSpacer(4)

  if (data.isRamadan) {
    // ── Режим Рамадана ───────────────────────────────────
    const title = stack.addText("РАМАДАН")
    title.font = Font.boldSystemFont(22)
    title.textColor = Color.white()
    title.centerAlignText()

    stack.addSpacer(2)

    const hijri = stack.addText(data.hijriDate || "")
    hijri.font = Font.systemFont(10)
    hijri.textColor = new Color("#cccccc")
    hijri.centerAlignText()

    if (data.prayers && data.prayers.Maghrib) {
      stack.addSpacer(4)
      const iftar = stack.addText(`Ифтар ${data.prayers.Maghrib}`)
      iftar.font = Font.boldSystemFont(13)
      iftar.textColor = theme.accentColor()
      iftar.centerAlignText()
    }

  } else {
    // ── Обычный режим (вне Рамадана) ──────────────────────
    const hijri = stack.addText(data.hijriDate || "")
    hijri.font = Font.systemFont(11)
    hijri.textColor = new Color("#cccccc")
    hijri.centerAlignText()

    stack.addSpacer(3)

    // Григорианская дата
    const dateStr = data.now.toLocaleDateString("ru-RU", {
      day: "numeric", month: "short"
    })
    const dateText = stack.addText(dateStr)
    dateText.font = Font.systemFont(12)
    dateText.textColor = Color.white()
    dateText.centerAlignText()

    stack.addSpacer(2)

    // Приглушённый обратный отсчёт до Рамадана (как слово «восход»)
    const cdText = stack.addText(`🌒 ${data.daysLeft} дн.`)
    cdText.font = Font.systemFont(10)
    cdText.textColor = theme.dimColor()
    cdText.centerAlignText()

    // Лёгкое напоминание о желательном посте (не навязчивое)
    if (data.isAyyamAlBid || data.isMondayOrThursday) {
      stack.addSpacer(4)
      const hint = data.isAyyamAlBid ? "🌙 Аийам аль-Бид" : "📅 Сунна: пн/чт"
      const hintText = stack.addText(hint)
      hintText.font = Font.systemFont(9)
      hintText.textColor = theme.subtleColor()
      hintText.centerAlignText()
    }
  }

  stack.addSpacer()
  return w
}
