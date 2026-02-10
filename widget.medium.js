const theme = importModule("theme.js")

module.exports.render = async (core) => {
  const data = await core.load()
  const w = new ListWidget()
  w.backgroundGradient = theme.background()

  const row = w.addStack()
  row.layoutHorizontally()

  const left = row.addStack()
  left.layoutVertically()
  left.centerAlignContent()

  theme.text(left, "🌙 🕌", 36)
  theme.text(left, "Рамадан", 16, true)
  theme.text(left, `~ ${data.daysLeft} дней`, 13)
  theme.text(left, data.dateString, 11)

  row.addSpacer()

  const right = row.addStack()
  right.layoutVertically()
  right.centerAlignContent()

  theme.text(
    right,
    "В Рамадан открываются врата Рая\nи принимаются дуа.",
    11
  )

  return w
}
