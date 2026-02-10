const theme = importModule("theme.js")

module.exports.render = async (core) => {
  const data = await core.load()
  const w = new ListWidget()
  w.backgroundGradient = theme.background()

  // ── Верх
  const top = w.addStack()
  top.layoutHorizontally()

  const left = top.addStack()
  left.layoutVertically()
  left.centerAlignContent()

  theme.text(left, "🌒", 42)
  theme.text(left, "Рамадан", 18, true)
  theme.text(left, `Осталось ~ ${data.daysLeft} дней`, 14)
  theme.text(left, data.dateString, 12)

  top.addSpacer()

  const right = top.addStack()
  right.layoutVertically()
  right.centerAlignContent()

  theme.text(
    right,
    "До ифтара",
    13,
    true
  )
  theme.text(
    right,
    data.prayers.Maghrib,
    16
  )

  // ── Низ
  w.addSpacer(12)

  const bottom = w.addStack()
  bottom.layoutVertically()
  bottom.centerAlignContent()

  theme.text(
    bottom,
    "О те, которые уверовали!\nПредписан вам пост...",
    12
  )
  theme.text(
    bottom,
    "Коран 2:183",
    10
  )

  return w
}
