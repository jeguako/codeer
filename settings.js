// settings.js — Настройки категорий (одно окно, без перезапуска)
// Открывается при запуске скрипта не в режиме виджета.

const MAX_ACTIVE = 9

// Показывает полноэкранный менеджер категорий (UITable).
// loadFn / saveFn — функции из core.js (loadSettings / saveSettings).
module.exports.show = async function show(loadFn, saveFn) {
  const settings = loadFn()
  const table = new UITable()
  table.showSeparators = true

  // ── rebuild() очищает таблицу и наполняет заново без закрытия окна ──
  function rebuild() {
    table.rows = []

    // ════ ЗАГОЛОВОК ════════════════════════════════════════
    const hdr = new UITableRow()
    hdr.isHeader = true
    hdr.height = 46
    hdr.addCell(UITableCell.text("⚙️  Настройки виджета"))
    table.addRow(hdr)

    // ════ СЧЁТЧИК АКТИВНЫХ ═════════════════════════════════
    const active = settings.categories.filter(c => c.active).length
    const infoRow = new UITableRow()
    infoRow.height = 50
    infoRow.dismissOnSelect = false
    const infoCell = UITableCell.text(
      `Активных категорий: ${active} / ${MAX_ACTIVE}`,
      `Максимум ${MAX_ACTIVE} категорий отображается в виджете`
    )
    infoRow.addCell(infoCell)
    table.addRow(infoRow)

    // ════ РЕЖИМ ОТОБРАЖЕНИЯ ════════════════════════════════
    const modeRow = new UITableRow()
    modeRow.height = 50
    modeRow.dismissOnSelect = false
    const modeTitle = UITableCell.text(
      "Вид категорий",
      settings.viewMode === "wheel" ? "🎯  Колесо баланса" : "☰  Список"
    )
    modeTitle.widthWeight = 65
    const modeBtn = UITableCell.button(
      settings.viewMode === "wheel" ? "Колесо ✓" : "Список ✓"
    )
    modeBtn.widthWeight = 35
    modeBtn.onTap = () => {
      settings.viewMode = settings.viewMode === "wheel" ? "list" : "wheel"
      saveFn(settings)
      rebuild()
      table.reload()
    }
    modeRow.addCell(modeTitle)
    modeRow.addCell(modeBtn)
    table.addRow(modeRow)

    // ════ ЗАГОЛОВОК КАТЕГОРИЙ ══════════════════════════════
    const catHead = new UITableRow()
    catHead.isHeader = true
    catHead.height = 38
    catHead.addCell(UITableCell.text("МОИ КАТЕГОРИИ  (нажми — изменить уровень)"))
    table.addRow(catHead)

    // ════ СТРОКИ КАТЕГОРИЙ ════════════════════════════════
    for (let i = 0; i < settings.categories.length; i++) {
      const cat = settings.categories[i]
      const row = new UITableRow()
      row.height = 54
      row.dismissOnSelect = false

      // Тап по строке (не по кнопке) → редактировать уровень
      row.onSelect = async () => {
        const a = new Alert()
        a.title = `«${cat.name}»`
        a.message = `Текущий уровень: ${cat.level ?? 5} / 10\nВведите новое значение (1–10):`
        a.addTextField("Уровень", String(cat.level ?? 5))
        a.addAction("Сохранить")
        a.addCancelAction("Отмена")
        if (await a.present() === 0) {
          const v = parseInt(a.textFieldValue(0), 10)
          if (!isNaN(v) && v >= 1 && v <= 10) {
            cat.level = v
            saveFn(settings)
            rebuild()
            table.reload()
          }
        }
      }

      // Название + статус
      const nameCell = UITableCell.text(
        cat.name,
        cat.active
          ? `● активна · уровень ${cat.level ?? 5}/10`
          : `○ не активна · уровень ${cat.level ?? 5}/10`
      )
      nameCell.widthWeight = 56

      // Кнопка вкл/выкл
      const toggleBtn = UITableCell.button(cat.active ? "✓ Вкл" : "Выкл")
      toggleBtn.widthWeight = 22
      toggleBtn.onTap = async () => {
        const activeNow = settings.categories.filter(c => c.active).length
        if (!cat.active && activeNow >= MAX_ACTIVE) {
          const a = new Alert()
          a.title = "Лимит категорий"
          a.message = `Можно активировать не более ${MAX_ACTIVE} категорий одновременно.\nОтключи одну из активных, чтобы добавить новую.`
          a.addAction("Понятно")
          await a.present()
          return
        }
        cat.active = !cat.active
        saveFn(settings)
        rebuild()
        table.reload()
      }

      // Кнопка удаления
      const delBtn = UITableCell.button("✕")
      delBtn.widthWeight = 22
      delBtn.onTap = async () => {
        const a = new Alert()
        a.title = `Удалить «${cat.name}»?`
        a.message = "Действие нельзя отменить."
        a.addDestructiveAction("Удалить")
        a.addCancelAction("Отмена")
        if (await a.present() === 0) {
          settings.categories.splice(i, 1)
          saveFn(settings)
          rebuild()
          table.reload()
        }
      }

      row.addCell(nameCell)
      row.addCell(toggleBtn)
      row.addCell(delBtn)
      table.addRow(row)
    }

    // ════ ДОБАВИТЬ КАТЕГОРИЮ ═══════════════════════════════
    const addRow = new UITableRow()
    addRow.height = 50
    addRow.dismissOnSelect = false
    const addBtn = UITableCell.button("➕   Добавить категорию")
    addBtn.onTap = async () => {
      const a = new Alert()
      a.title = "Новая категория"
      a.message = "Введите название (будет добавлена как неактивная):"
      a.addTextField("Например: Спорт, Творчество…")
      a.addAction("Добавить")
      a.addCancelAction("Отмена")
      if (await a.present() === 0) {
        const name = a.textFieldValue(0).trim()
        if (name.length > 0 && name.length <= 30) {
          settings.categories.push({ name, active: false, level: 5 })
          saveFn(settings)
          rebuild()
          table.reload()
        }
      }
    }
    addRow.addCell(addBtn)
    table.addRow(addRow)

    // ════ ПОДСКАЗКА ════════════════════════════════════════
    const tipRow = new UITableRow()
    tipRow.height = 44
    tipRow.dismissOnSelect = false
    const tipCell = UITableCell.text(
      "ℹ️  Уровень (1–10)",
      "Нажми на строку категории чтобы изменить уровень"
    )
    tipRow.addCell(tipCell)
    table.addRow(tipRow)

    table.reload()
  }

  rebuild()
  await table.present()
}
