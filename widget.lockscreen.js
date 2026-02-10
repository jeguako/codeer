module.exports.render = async (core) => {
  const data = await core.load()
  const w = new ListWidget()

  const t = w.addText(`🌙 ~ ${data.daysLeft} дн.`)
  t.font = Font.systemFont(12)

  return w
}
