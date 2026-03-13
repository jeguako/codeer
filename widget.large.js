// widget.large.js

const theme   = importModule("theme")
const balance = importModule("balance")

module.exports.render = async (core) => {
  const data = await core.load()
  const w = new ListWidget()
  w.backgroundGradient = theme.background()
  w.setPadding(14, 16, 14, 16)

  // ═══════════════════════════════════════════════════════
  //  ВЕРХНИЙ БЛОК — луна, хиджри, дата, обратный отсчёт
  //  (структура не меняется — добавляется только тусклый
  //   таймер рамадана рядом с датой)
  // ═══════════════════════════════════════════════════════

  const top = w.addStack()
  top.layoutHorizontally()
  top.centerAlignContent()

  // Луна
  const moonText = top.addText(data.isRamadan ? "🌒" : "🌙")
  moonText.font = Font.systemFont(38)

  top.addSpacer(10)

  const topRight = top.addStack()
  topRight.layoutVertically()

  // Заголовок «Рамадан» в период Рамадана
  if (data.isRamadan) {
    theme.text(topRight, "Рамадан", 18, true)
  }

  // Хиджри дата
  theme.text(topRight, data.hijriDate || "", 13, false, new Color("#cccccc"))

  topRight.addSpacer(2)

  // Строка: григорианская дата + приглушённый таймер до Рамадана
  const dateRow = topRight.addStack()
  dateRow.layoutHorizontally()
  dateRow.centerAlignContent()

  const dateStr = data.now.toLocaleDateString("ru-RU", {
    day: "numeric", month: "long", year: "numeric"
  })
  theme.text(dateRow, dateStr, 12)

  if (!data.isRamadan) {
    // Тусклый таймер обратного отсчёта — рядом с датой (как «восход»)
    dateRow.addSpacer(6)
    theme.text(dateRow, `· ${data.daysLeft} дн. 🌒`, 11, false, theme.dimColor())
  } else if (data.prayers && data.prayers.Maghrib) {
    // В Рамадан: время ифтара
    dateRow.addSpacer(6)
    theme.text(dateRow, `Ифтар ${data.prayers.Maghrib}`, 12, true, theme.accentColor())
  }

  // Время восхода (если есть данные о намазе)
  if (data.prayers && data.prayers.Sunrise) {
    topRight.addSpacer(2)
    theme.text(topRight, `☀ восход ${data.prayers.Sunrise}`, 11, false, theme.dimColor())
  }

  // ═══════════════════════════════════════════════════════
  //  НАПОМИНАНИЯ О ПОСТЕ — тихие, ненавязчивые
  //  (только вне Рамадана и только в нужный день)
  // ═══════════════════════════════════════════════════════

  if (!data.isRamadan) {
    let fastingHint = ""
    if (data.isAyyamAlBid) {
      const dayLabel = ["13-е", "14-е", "15-е"][data.hijriDay - 13] || ""
      fastingHint = `🌙 Аийам аль-Бид — ${dayLabel} число хиджры (пост сунна)`
    } else if (data.isMondayOrThursday) {
      const dayName = new Date().getDay() === 1 ? "понедельник" : "четверг"
      fastingHint = `📅 Сунна: пост в ${dayName}`
    }

    if (fastingHint) {
      w.addSpacer(6)
      const hintRow = w.addStack()
      hintRow.layoutHorizontally()
      hintRow.centerAlignContent()
      hintRow.backgroundColor = new Color("#ffffff", 0.04)
      hintRow.cornerRadius = 6
      hintRow.setPadding(4, 8, 4, 8)
      theme.text(hintRow, fastingHint, 10, false, theme.subtleColor())
    }
  }

  w.addSpacer(8)

  // ═══════════════════════════════════════════════════════
  //  НИЖНИЙ БЛОК — категории (список или колесо баланса)
  // ═══════════════════════════════════════════════════════

  const active = (data.categories || []).filter(c => c.active)

  if (data.viewMode === "wheel" && active.length > 0) {
    // ── КОЛЕСО БАЛАНСА ────────────────────────────────────
    const wheelSize = 210
    const wheelImg = balance.drawWheel(active, wheelSize)

    const imgStack = w.addStack()
    imgStack.layoutHorizontally()
    imgStack.addSpacer()
    const imgView = imgStack.addImage(wheelImg)
    imgView.imageSize = new Size(wheelSize, wheelSize * 0.85)
    imgView.cornerRadius = 10
    imgStack.addSpacer()

  } else if (active.length > 0) {
    // ── СПИСОК КАТЕГОРИЙ ──────────────────────────────────
    const catLabel = w.addText("КАТЕГОРИИ")
    catLabel.font = Font.boldSystemFont(9)
    catLabel.textColor = new Color("#555555")
    w.addSpacer(5)

    const MAX_ROWS = 5
    for (const cat of active.slice(0, MAX_ROWS)) {
      const catRow = w.addStack()
      catRow.layoutHorizontally()
      catRow.centerAlignContent()

      // Цветная точка
      const dotColor = _catColor(cat, active)
      const dot = catRow.addText("●")
      dot.font = Font.systemFont(9)
      dot.textColor = new Color(dotColor, 0.9)
      catRow.addSpacer(5)

      // Название
      const nameT = catRow.addText(cat.name)
      nameT.font = Font.systemFont(13)
      nameT.textColor = Color.white()
      nameT.lineLimit = 1

      catRow.addSpacer()

      // Уровень числом
      const lvlLabel = catRow.addText(`${cat.level ?? 5}/10`)
      lvlLabel.font = Font.systemFont(10)
      lvlLabel.textColor = new Color("#777777")
      catRow.addSpacer(6)

      // Прогресс-бар
      const lvl = cat.level ?? 5
      const filled = "▪".repeat(lvl)
      const empty  = "▫".repeat(10 - lvl)
      const bar = catRow.addText(filled + empty)
      bar.font = Font.systemFont(9)
      bar.textColor = new Color(dotColor, 0.85)

      w.addSpacer(4)
    }

  } else {
    // Нет активных категорий — показываем аят
    w.addSpacer()
    theme.text(
      w,
      "О те, которые уверовали!\nПредписан вам пост, как было предписано\nтем, кто был до вас.",
      12,
      false,
      new Color("#888888")
    )
    w.addSpacer(4)
    theme.text(w, "Коран 2:183", 10, false, new Color("#555555"))
    w.addSpacer()
  }

  return w
}

// Цвет категории по её индексу в активном списке
function _catColor(cat, active) {
  const COLORS = [
    "#FF6B6B", "#4ECDC4", "#45B7D1", "#96CEB4",
    "#FFD93D", "#C7A4FF", "#F7DC6F", "#82E0AA", "#F8B500"
  ]
  const idx = active.indexOf(cat)
  return COLORS[idx % COLORS.length]
}
