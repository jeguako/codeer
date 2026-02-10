// icon-color: gray; icon-glyph: moon;

// =====================================================
// Ramadan Widget Installer (Yandex Disk)
// =====================================================

const fm = FileManager.iCloud()
const root = fm.documentsDirectory()
const moduleDir = fm.joinPath(root, "RamadanWidget")

if (!fm.fileExists(moduleDir)) {
  fm.createDirectory(moduleDir)
}

// [ filename, targetDir, yandexPublicId ]
const FILES = [
  ["Ramadan Widget.js", root, "He1ZSwBGgsARQw"],

  ["core.js", moduleDir, "lZR2xtMyjVuFTg"],
  ["theme.js", moduleDir, "241i40cm5fVfRg"],

  ["widget.small.js", moduleDir, "difuVq_L7Sa_Bg"],
  ["widget.medium.js", moduleDir, "C4hKUNUIgOZhKg"],
  ["widget.large.js", moduleDir, "ot-yG2-C15OB8w"],
  ["widget.lockscreen.js", moduleDir, "2hgOpQAumIZxFw"]
]

// ---------- YANDEX DISK ----------
async function downloadFromYandex(publicId) {
  const publicUrl = "https://disk.yandex.ru/d/" + publicId

  const api =
    "https://cloud-api.yandex.net/v1/disk/public/resources/download?public_key=" +
    encodeURIComponent(publicUrl)

  const metaReq = new Request(api)
  metaReq.timeoutInterval = 15
  const meta = await metaReq.loadJSON()

  if (!meta.href) {
    throw new Error("Яндекс.Диск: нет download-ссылки")
  }

  const fileReq = new Request(meta.href)
  fileReq.timeoutInterval = 20
  return await fileReq.load()
}

// ---------- INSTALL ----------
try {
  for (const [name, dir, id] of FILES) {
    const data = await downloadFromYandex(id)
    fm.write(fm.joinPath(dir, name), data)
  }

  const alert = new Alert()
  alert.title = "Ramadan Widget 🌙"
  alert.message =
    "Установка завершена\n\n" +
    "Добавь виджет Scriptable\n" +
    "и выбери «Ramadan Widget»."
  alert.addAction("OK")
  await alert.present()

} catch (e) {
  const alert = new Alert()
  alert.title = "Ошибка установки"
  alert.message = e.message
  alert.addAction("OK")
  await alert.present()
}

Script.complete()
