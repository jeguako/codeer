// widget.small.js

const core = importModule("RamadanWidget/core")
const theme = importModule("theme.js")

module.exports.render = async (core) => {
  const data = await core.load()
  const widget = new ListWidget()

  // BACKGROUND
  widget.backgroundGradient = theme.background()
  widget.setPadding(12, 12, 12, 12)

  const stack = widget.addStack()
  stack.layoutVertically()
  stack.centerAlignContent()

  stack.addSpacer()

  const moon = stack.addText("🌙")
  moon.font = Font.systemFont(42)
  moon.textColor = Color.white()
  moon.centerAlignText()

  stack.addSpacer(4)

  const title = stack.addText("РАМАДАН")
  title.font = Font.boldSystemFont(28)
  title.textColor = Color.white()
  title.centerAlignText()

  stack.addSpacer(2)

  const sub = stack.addText("осталось")
  sub.font = Font.systemFont(13)
  sub.textColor = Color.white()
  sub.centerAlignText()

  stack.addSpacer(2)

  const days = stack.addText(`~ ${data.daysLeft} дней`)
  days.font = Font.boldSystemFont(28)
  days.textColor = Color.white()
  days.centerAlignText()

  stack.addSpacer(6)

  const hijri = stack.addText(data.hijriDate || "")
  hijri.font = Font.systemFont(11)
  hijri.textColor = new Color("#cccccc")
  hijri.centerAlignText()

  stack.addSpacer()

  return widget
}
