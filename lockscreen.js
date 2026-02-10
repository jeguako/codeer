// lockscreen.js

function render(widget, data) {
  const family = config.widgetFamily

  // ---- circular ----
  if (family === "accessoryCircular") {
    const t = widget.addText(String(data.days))
    t.font = Font.boldSystemFont(34)
    t.textColor = Color.white()
    t.centerAlignText()
    return
  }

  // ---- rectangular ----
  if (family === "accessoryRectangular") {
    if (data.rawDays > 0) {
      widget.addText("До Рамадана").font = Font.systemFont(12)
      widget.addSpacer(2)
      widget.addText(`~ ${data.days} дней`).font = Font.boldSystemFont(14)
      return
    }

    if (data.timers.toFajr) {
      widget.addText("До окончания сухура").font = Font.systemFont(11)
      widget.addText(data.timers.toFajr).font = Font.boldSystemFont(14)
    }

    widget.addSpacer(4)

    if (data.timers.toIftar) {
      widget.addText("До ифтара").font = Font.systemFont(11)
      widget.addText(data.timers.toIftar).font = Font.boldSystemFont(14)
    }
  }
}

module.exports = { render }
