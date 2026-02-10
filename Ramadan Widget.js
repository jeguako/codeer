// icon-color: gray; icon-glyph: moon;

const fm = FileManager.iCloud()
const root = fm.documentsDirectory()
const dir = fm.joinPath(root, "RamadanWidget")

function load(name) {
  return importModule(fm.joinPath(dir, name))
}

const core = load("core.js")

let widget
if (config.runsInWidget) {
  if (config.widgetFamily === "small") {
    widget = await load("widget.small.js").render(core)
  } else if (config.widgetFamily === "medium") {
    widget = await load("widget.medium.js").render(core)
  } else if (config.widgetFamily === "large") {
    widget = await load("widget.large.js").render(core)
  } else if (config.widgetFamily === "accessoryRectangular") {
    widget = await load("widget.lockscreen.js").render(core)
  }
}

if (widget) {
  Script.setWidget(widget)
}
Script.complete()
