function background() {
  const g = new LinearGradient()
  g.colors = [
    new Color("#1c1c1e"),
    new Color("#2c2c2e")
  ]
  g.locations = [0, 1]
  return g
}

function text(stack, txt, size = 14, bold = false) {
  const t = stack.addText(txt)
  t.textColor = Color.white()
  t.font = bold
    ? Font.boldSystemFont(size)
    : Font.systemFont(size)
}

module.exports = { background, text }
