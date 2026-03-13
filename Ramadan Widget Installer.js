// icon-color: gray; icon-glyph: moon;

// =====================================================
//  Ramadan Widget Installer
//  Скачивает только главный файл с GitHub.
//  При первом запуске виджета все модули
//  установятся автоматически.
// =====================================================

const MAIN_FILE_URL =
  "https://raw.githubusercontent.com/jeguako/codeer/main/Ramadan%20Widget.js"

const fm   = FileManager.iCloud()
const root = fm.documentsDirectory()
const dest = fm.joinPath(root, "Ramadan Widget.js")

try {
  const req = new Request(MAIN_FILE_URL)
  req.timeoutInterval = 20
  const data = await req.load()

  if (!data || data.length === 0) {
    throw new Error("Сервер вернул пустой файл. Проверь интернет.")
  }

  fm.write(dest, data)

  const alert = new Alert()
  alert.title = "Готово 🌙"
  alert.message =
    "Файл «Ramadan Widget» обновлён.\n\n" +
    "Теперь открой скрипт «Ramadan Widget» в Scriptable — " +
    "он сам загрузит все обновлённые модули."
  alert.addAction("Открыть Ramadan Widget")
  alert.addCancelAction("Закрыть")
  const res = await alert.present()

  // Пользователь сам откроет скрипт из списка Scriptable

} catch (e) {
  const alert = new Alert()
  alert.title = "Ошибка обновления"
  alert.message = e.message + "\n\nПроверь интернет и попробуй снова."
  alert.addAction("OK")
  await alert.present()
}

Script.complete()
