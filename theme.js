// theme.js — стили виджета

function background() {
  const g = new LinearGradient()
  g.colors = [
    new Color("#1c1c1e"),
    new Color("#2c2c2e")
  ]
  g.locations = [0, 1]
  return g
}

// Добавляет текст в стек. Возвращает элемент для дополнительной настройки.
// color: экземпляр Color или null (белый по умолчанию)
function text(stack, txt, size = 14, bold = false, color = null) {
  const t = stack.addText(txt)
  t.textColor = color || Color.white()
  t.font = bold ? Font.boldSystemFont(size) : Font.systemFont(size)
  return t
}

// Приглушённый серый — как подпись «восход»
function dimColor() {
  return new Color("#666666")
}

// Акцентный цвет (золотой/янтарный)
function accentColor() {
  return new Color("#FFD700", 0.85)
}

// Тонкий серый для подсказок
function subtleColor() {
  return new Color("#8a8a8a")
}

module.exports = { background, text, dimColor, accentColor, subtleColor }
