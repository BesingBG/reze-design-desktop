import { app, BrowserWindow, dialog, Menu, shell } from "electron"
import { spawn, spawnSync } from "node:child_process"
import { existsSync, readFileSync } from "node:fs"
import { request as httpRequest } from "node:http"
import { createServer as createNetServer } from "node:net"
import { dirname, join } from "node:path"
import { fileURLToPath } from "node:url"

const __dirname = dirname(fileURLToPath(import.meta.url))
const root = join(__dirname, "..")
const config = JSON.parse(readFileSync(join(root, "config.json"), "utf8"))

const isDev = !app.isPackaged

app.commandLine.appendSwitch("enable-unsafe-webgpu")
app.commandLine.appendSwitch("ignore-gpu-blocklist")

let serverChild = null
let mainWindow = null
let port = null

function getServerRoot() {
  return app.isPackaged ? join(process.resourcesPath, "reze-design") : join(root, "reze-design")
}

function getGuidePath() {
  const candidates = app.isPackaged
    ? [join(process.resourcesPath, "WebGPU-guide.md")]
    : [join(root, "resources", "WebGPU-guide.md")]
  return candidates.find((p) => existsSync(p)) ?? null
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

function findFreePort(start) {
  return new Promise((resolve, reject) => {
    const srv = createNetServer()
    srv.once("error", () => {
      srv.close()
      findFreePort(start + 1).then(resolve, reject)
    })
    srv.listen(start, "127.0.0.1", () => {
      const found = srv.address().port
      srv.close(() => resolve(found))
    })
  })
}

function startServer() {
  const serverRoot = getServerRoot()
  const nextBin = join(serverRoot, "node_modules", "next", "dist", "bin", "next")
  if (!existsSync(nextBin)) {
    console.error("[main] next 二进制未找到:", nextBin)
    return null
  }
  const args = isDev ? ["dev", "-p", String(port)] : ["start", "-p", String(port)]
  const child = spawn(process.execPath, [nextBin, ...args], {
    env: {
      ...process.env,
      ELECTRON_RUN_AS_NODE: "1",
      NODE_ENV: isDev ? "development" : "production",
      PORT: String(port),
      HOSTNAME: "127.0.0.1",
    },
    cwd: serverRoot,
    stdio: ["ignore", "pipe", "pipe"],
    windowsHide: true,
    detached: process.platform !== "win32",
  })
  child.stdout.on("data", (d) => console.log("[server]", String(d).trimEnd()))
  child.stderr.on("data", (d) => console.error("[server]", String(d).trimEnd()))
  child.on("exit", (code, signal) => {
    console.log(`[server] 已退出 code=${code} signal=${signal}`)
    serverChild = null
  })
  return child
}

function killTree(child) {
  if (!child || child.pid == null) return
  if (process.platform === "win32") {
    try {
      spawnSync("taskkill", ["/pid", String(child.pid), "/t", "/f"], { stdio: "ignore", windowsHide: true })
    } catch {}
  } else {
    try {
      process.kill(-child.pid, "SIGTERM")
    } catch {}
  }
  try {
    child.kill()
  } catch {}
}

function probe() {
  return new Promise((resolve) => {
    const req = httpRequest({ host: "127.0.0.1", port, path: "/", method: "GET", timeout: 3000 }, (res) => {
      res.resume()
      resolve(true)
    })
    req.on("timeout", () => {
      req.destroy()
      resolve(false)
    })
    req.on("error", () => resolve(false))
    req.end()
  })
}

async function waitForServer(timeoutMs = 90000) {
  const deadline = Date.now() + timeoutMs
  while (Date.now() < deadline) {
    if (!serverChild) return false
    if (await probe()) return true
    await sleep(500)
  }
  return false
}

async function checkWebGPU() {
  if (!mainWindow || mainWindow.isDestroyed()) return
  let result
  try {
    result = await mainWindow.webContents.executeJavaScript("window.rezeDesktop?.checkWebGPU()", true)
  } catch {
    return
  }
  if (result && result.supported === false) {
    await showWebGpuGuide()
  }
}

async function showWebGpuGuide() {
  if (!mainWindow || mainWindow.isDestroyed()) return
  const guidePath = getGuidePath()
  const choice = await dialog.showMessageBox(mainWindow, {
    type: "warning",
    title: "WebGPU 未就绪",
    message: "当前环境无法启用 WebGPU,本地渲染可能不可用。",
    detail:
      "常见解决办法:\n1) 右键桌面快捷方式,在显卡设置中将本应用设为“高性能”,切换到独立显卡;\n2) 更新显卡驱动;\n3) 阅读随附说明文档。",
    buttons: ["知道了", "打开说明文档"],
    defaultId: 0,
    cancelId: 0,
    noLink: true,
  })
  if (choice.response === 1 && guidePath) {
    shell.openPath(guidePath)
  }
}

async function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1440,
    height: 900,
    minWidth: 1024,
    minHeight: 640,
    show: false,
    title: `Reze Design v${app.getVersion()}`,
    webPreferences: {
      preload: join(__dirname, "preload.cjs"),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  })
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith("http")) shell.openExternal(url)
    return { action: "deny" }
  })
  mainWindow.once("ready-to-show", () => mainWindow.show())
  mainWindow.on("page-title-updated", (event) => {
    event.preventDefault()
  })
  mainWindow.webContents.on("did-finish-load", () => checkWebGPU())
  mainWindow.on("closed", () => {
    mainWindow = null
  })
  await mainWindow.loadURL(`http://localhost:${port}/`)
}

function buildMenu() {
  const template = [
    ...(process.platform === "darwin" ? [{ role: "appMenu" }] : []),
    {
      label: "文件",
      submenu: [{ role: "quit", label: "退出" }],
    },
    { role: "viewMenu", label: "视图" },
    {
      label: "帮助",
      submenu: [
        {
          label: "检查更新",
          enabled: !!config.updateUrl,
          click: () => {
            if (config.updateUrl) shell.openExternal(config.updateUrl)
          },
        },
        {
          label: "在线访问作者站点",
          enabled: !!config.onlineUrl,
          click: () => {
            if (config.onlineUrl) shell.openExternal(config.onlineUrl)
          },
        },
      ],
    },
  ]
  Menu.setApplicationMenu(Menu.buildFromTemplate(template))
}

async function main() {
  buildMenu()
  port = await findFreePort(config.port || 3210)
  serverChild = startServer()
  if (!serverChild) {
    dialog.showErrorBox("启动失败", "未找到 reze-design 的服务端程序。")
    app.quit()
    return
  }
  const ready = await waitForServer()
  if (!ready) {
    dialog.showErrorBox(
      "启动失败",
      `本地服务启动超时或已退出(端口 ${port})。\n可能原因:端口被占用、缺少构建产物或资源损坏。`
    )
    app.quit()
    return
  }
  await createWindow()
}

const gotLock = app.requestSingleInstanceLock()
if (!gotLock) {
  app.quit()
} else {
  app.on("second-instance", () => {
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore()
      mainWindow.focus()
    }
  })
  app.whenReady().then(() => {
    main().catch((err) => {
      console.error("[main] 启动失败:", err)
      dialog.showErrorBox("启动失败", String(err))
      app.quit()
    })
  })
  app.on("window-all-closed", () => app.quit())
  app.on("will-quit", () => killTree(serverChild))
}
