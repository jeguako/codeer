// balance.js — Колесо баланса (DrawContext, не требует addArc)
// Рисует радарную диаграмму «Колесо жизни»: N секторов, размер — уровень (0–10).

const SECTOR_COLORS = [
  "#FF6B6B", // красный
  "#4ECDC4", // бирюза
  "#45B7D1", // синий
  "#96CEB4", // зелёный
  "#FFD93D", // жёлтый
  "#C7A4FF", // фиолетовый
  "#F7DC6F", // золото
  "#82E0AA", // мята
  "#F8B500"  // оранжевый
]

// Возвращает массив точек дуги от startA до endA радиуса r, центр (cx,cy)
function arcPoints(cx, cy, r, startA, endA, steps) {
  const pts = []
  for (let i = 0; i <= steps; i++) {
    const a = startA + (endA - startA) * (i / steps)
    pts.push(new Point(cx + r * Math.cos(a), cy + r * Math.sin(a)))
  }
  return pts
}

/**
 * Рисует колесо баланса.
 * @param {Array}  categories  массив { name, level (0–10), active }
 * @param {number} size        размер холста в пикселях (квадрат)
 * @returns {Image}
 */
function drawWheel(categories, size) {
  size = size || 240
  const ctx = new DrawContext()
  ctx.size = new Size(size, size)
  ctx.opaque = false
  ctx.respectScreenScale = true

  const cx = size / 2
  const cy = size / 2
  const outerR = size * 0.40   // внешний радиус сектора
  const innerR = size * 0.06   // радиус центральной «втулки»
  const labelR = size * 0.465  // радиус подписей

  const n = Math.min(categories.length, 9)
  if (n === 0) return ctx.getImage()

  const step    = (2 * Math.PI) / n
  const topAngle = -Math.PI / 2     // начинаем сверху (12 часов)
  const ARC_STEPS = 22              // кол-во точек для аппроксимации дуги

  // ── Фон-диск ──────────────────────────────────────────
  ctx.setFillColor(new Color("#1c1c1e", 0.80))
  const bgR = outerR + 6
  ctx.fillEllipse(new Rect(cx - bgR, cy - bgR, bgR * 2, bgR * 2))

  // ── Сетка (кольца 25 / 50 / 75 / 100%) ───────────────
  ctx.setLineWidth(0.5)
  for (let g = 1; g <= 4; g++) {
    const r = innerR + (outerR - innerR) * (g / 4)
    ctx.setStrokeColor(new Color("#ffffff", 0.07 + g * 0.02))
    ctx.strokeEllipse(new Rect(cx - r, cy - r, r * 2, r * 2))
  }

  // ── Спицы ─────────────────────────────────────────────
  ctx.setStrokeColor(new Color("#ffffff", 0.13))
  ctx.setLineWidth(0.6)
  for (let i = 0; i < n; i++) {
    const a = topAngle + i * step
    const sp = new Path()
    sp.move(new Point(cx + innerR * Math.cos(a), cy + innerR * Math.sin(a)))
    sp.addLine(new Point(cx + outerR * Math.cos(a), cy + outerR * Math.sin(a)))
    ctx.addPath(sp)
    ctx.strokePath()
  }

  // ── Заполненные секторы ───────────────────────────────
  for (let i = 0; i < n; i++) {
    const cat   = categories[i]
    const level = Math.max(0, Math.min(10, cat.level ?? 5))
    const fillR = innerR + (outerR - innerR) * (level / 10)

    const GAP = 0.04            // зазор между секторами (радиан)
    const a0  = topAngle + i * step + GAP
    const a1  = topAngle + (i + 1) * step - GAP

    const hex   = SECTOR_COLORS[i % SECTOR_COLORS.length]
    const color = new Color(hex, 0.82)
    ctx.setFillColor(color)

    // Сектор: центр → дуга → центр
    const arc = arcPoints(cx, cy, fillR, a0, a1, ARC_STEPS)
    const path = new Path()
    path.move(new Point(cx, cy))
    path.addLines(arc)
    path.addLine(new Point(cx, cy))
    ctx.addPath(path)
    ctx.fillPath()

    // Лёгкая обводка внешней дуги
    ctx.setStrokeColor(new Color(hex, 0.30))
    ctx.setLineWidth(0.5)
    const outerArc = arcPoints(cx, cy, outerR, a0, a1, ARC_STEPS)
    const sp2 = new Path()
    sp2.move(outerArc[0])
    for (let j = 1; j < outerArc.length; j++) sp2.addLine(outerArc[j])
    ctx.addPath(sp2)
    ctx.strokePath()
  }

  // ── Центральная «втулка» ──────────────────────────────
  ctx.setFillColor(new Color("#1c1c1e", 1.0))
  ctx.fillEllipse(new Rect(cx - innerR, cy - innerR, innerR * 2, innerR * 2))
  ctx.setStrokeColor(new Color("#ffffff", 0.18))
  ctx.setLineWidth(0.5)
  ctx.strokeEllipse(new Rect(cx - innerR, cy - innerR, innerR * 2, innerR * 2))

  // ── Подписи ───────────────────────────────────────────
  const fontSize = Math.max(7, Math.min(11, size / 22))
  ctx.setFont(Font.systemFont(fontSize))
  ctx.setTextColor(Color.white())
  ctx.setTextAlignedCenter()

  for (let i = 0; i < n; i++) {
    const angle = topAngle + (i + 0.5) * step
    const x = cx + labelR * Math.cos(angle)
    const y = cy + labelR * Math.sin(angle)

    const name  = categories[i].name
    const label = name.length > 9 ? name.substring(0, 8) + "…" : name
    const lw = 68, lh = 16
    ctx.drawTextInRect(label, new Rect(x - lw / 2, y - lh / 2, lw, lh))
  }

  return ctx.getImage()
}

module.exports = { drawWheel }
