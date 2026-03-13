// widget.medium.js

const theme = importModule("theme")

module.exports.render = async (core) => {
  const data = await core.load()
  const w = new ListWidget()
  w.backgroundGradient = theme.background()
  w.setPadding(14, 16, 14, 16)

  const row = w.addStack()
  row.layoutHorizontally()

  // ═══ ЛЕВАЯ КОЛОНКА: луна + дата ═══════════════════════
  const left = row.addStack()
  left.layoutVertically()
  left.centerAlignContent()

  const moon = left.addText(data.isRamadan ? "🌒" : "🌙")
  moon.font = Font.systemFont(32)

  left.addSpacer(2)

  if (data.isRamadan) {
    theme.text(left, "Рамадан", 15, true)
  }

  // Хиджри дата
  theme.text(left, data.hijriDate || "", 11, false, new Color("#cccccc"))

  left.addSpacer(2)

  // Григорианская дата
  const dateStr = data.now.toLocaleDateString("ru-RU", {
    day: "numeric", month: "long"
  })
  theme.text(left, dateStr, 12)

  // Приглушённый обратный отсчёт до Рамадана (вне Рамадана)
  if (!data.isRamadan) {
    left.addSpacer(1)
    theme.text(left, `🌒 через ${data.daysLeft} дн.`, 10, false, theme.dimColor())
  } else if (data.prayers && data.prayers.Maghrib) {
    left.addSpacer(2)
    theme.text(left, `Ифтар: ${data.prayers.Maghrib}`, 12, true, theme.accentColor())
  }

  row.addSpacer()

  // ═══ ПРАВАЯ КОЛОНКА: напоминание / категории ══════════
  const right = row.addStack()
  right.layoutVertically()
  right.centerAlignContent()
  right.size = new Size(160, 0)

  if (!data.isRamadan) {
    // Лёгкое напоминание о посте (тихое, не кричащее)
    if (data.isAyyamAlBid) {
      const hl = right.addStack()
      hl.layoutHorizontally()
      hl.centerAlignContent()
      theme.text(hl, "🌙 Аийам аль-Бид", 10, false, theme.subtleColor())
      right.addSpacer(4)
    } else if (data.isMondayOrThursday) {
      const hl = right.addStack()
      hl.layoutHorizontally()
      hl.centerAlignContent()
      theme.text(hl, "📅 Сунна: пост пн/чт", 10, false, theme.subtleColor())
      right.addSpacer(4)
    }

    // Первые активные категории
    const active = data.categories.filter(c => c.active).slice(0, 3)
    if (active.length > 0) {
      for (const cat of active) {
        const catRow = right.addStack()
        catRow.layoutHorizontally()
        catRow.centerAlignContent()

        const nameT = catRow.addText(cat.name)
        nameT.font = Font.systemFont(11)
        nameT.textColor = Color.white()
        nameT.lineLimit = 1
        catRow.addSpacer()

        const lvl = cat.level ?? 5
        const bar = "▪".repeat(lvl) + "▫".repeat(10 - lvl)
        const barT = catRow.addText(bar)
        barT.font = Font.systemFont(7)
        barT.textColor = new Color("#4ECDC4")

        right.addSpacer(3)
      }
    } else {
      // Нет категорий — цитата
      theme.text(
        right,
        "В Рамадан открываются\nврата Рая и принимаются дуа.",
        10,
        false,
        new Color("#888888")
      )
    }

  } else {
    // В Рамадан: цитата и категории
    theme.text(
      right,
      "Предписан вам пост,\nкак было предписано\nтем, кто был до вас.",
      11,
      false,
      new Color("#aaaaaa")
    )
    right.addSpacer(4)
    theme.text(right, "Коран 2:183", 9, false, new Color("#666666"))
  }

  return w
}
