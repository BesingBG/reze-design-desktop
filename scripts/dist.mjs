import { spawn } from "node:child_process"
import { createRequire } from "node:module"
import { existsSync, rmSync, mkdirSync, cpSync, readdirSync, readFileSync, writeFileSync } from "node:fs"
import { join, dirname } from "node:path"
import { fileURLToPath } from "node:url"

const __dirname = dirname(fileURLToPath(import.meta.url))
const root = join(__dirname, "..")
const sub = join(root, "reze-design")
const stagingServer = join(root, "dist-resources", "reze-design")
const require = createRequire(import.meta.url)

function run(cmd, args, opts = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(cmd, args, { stdio: "inherit", shell: process.platform === "win32", ...opts })
    child.on("error", reject)
    child.on("exit", (code) => (code === 0 ? resolve() : reject(new Error(`${cmd} 退出码 ${code}`))))
  })
}

function copy(src, dest) {
  if (!existsSync(src)) return
  cpSync(src, dest, { recursive: true })
}

function copyEntries(srcDir, destDir, exclude = []) {
  for (const entry of readdirSync(srcDir, { withFileTypes: true })) {
    if (exclude.includes(entry.name)) continue
    cpSync(join(srcDir, entry.name), join(destDir, entry.name), { recursive: true })
  }
}

// 发行剥离:内置默认场景指向的版权资源(models/animations/audios)不在发行包内。
// 必须用剥离版 default-scene.ts 构建,否则 JS bundle 仍固化原版引用,打开即因 404 报错。
const releaseScene = join(root, "resources", "release", "default-scene.ts")
const strippedDirs = ["public/models", "public/animations", "public/audios"]

// 空场景兼容:page.tsx 用 models[0].model.id 初始化激活模型,SSR 时对空场景崩溃。
function patchEmptySceneCompat() {
  const pagePath = join(stagingServer, "app", "page.tsx")
  const src = readFileSync(pagePath, "utf8")
  const from = "useState(bootScene.assets.models[0].model.id)"
  const to = 'useState(bootScene.assets.models[0]?.model.id ?? "")'
  if (!src.includes(from)) {
    throw new Error(`page.tsx 未命中空场景补丁锚点,需同步更新: ${from}`)
  }
  writeFileSync(pagePath, src.split(from).join(to))
  console.log("[dist] 注入空场景兼容补丁(page.tsx)...")
}

function applyReleaseStrip() {
  if (!existsSync(releaseScene)) throw new Error(`缺少剥离版默认场景:${releaseScene}`)
  console.log("[dist] 注入剥离版默认场景,移除内置版权资源...")
  cpSync(releaseScene, join(stagingServer, "lib", "default-scene.ts"))
  for (const dir of strippedDirs) {
    rmSync(join(stagingServer, dir), { recursive: true, force: true })
  }
  patchEmptySceneCompat()
}

async function main() {
  const skipBuild = process.argv.includes("--skip-build")

  console.log("[dist] 准备 staging...")
  rmSync(stagingServer, { recursive: true, force: true })
  mkdirSync(stagingServer, { recursive: true })
  copyEntries(sub, stagingServer, ["node_modules", ".next", ".git", "screenshots"])
  applyReleaseStrip()

  if (skipBuild) {
    if (!existsSync(join(sub, ".next"))) {
      throw new Error("缺少 .next 构建产物,请先执行 npm run build")
    }
    console.warn(
      "[dist] 警告:--skip-build 直接复用既有 .next。若其由原版 default-scene 构建,发行包会缺少默认场景资源而无法打开,请改用完整构建。",
    )
    copy(join(sub, ".next"), join(stagingServer, ".next"))
  } else {
    console.log("[dist] 安装依赖(全量,含构建工具)...")
    await run("npm", ["ci"], { cwd: stagingServer })
    console.log("[dist] next build(使用剥离版默认场景)...")
    await run("npm", ["run", "build"], { cwd: stagingServer })
  }

  console.log("[dist] 安装生产依赖(仅 dependencies)...")
  await run("npm", ["ci", "--omit=dev", "--no-audit", "--no-fund"], { cwd: stagingServer })

  console.log("[dist] electron-builder 打包...")
  const builderCli = require.resolve("electron-builder/out/cli/cli.js")
  const target = {
    win32: ["--win", "nsis"],
    darwin: ["--mac", "dmg"],
    linux: ["--linux", "AppImage"],
  }[process.platform] ?? []
  await run(process.execPath, [builderCli, ...target, "--publish", "never"], { cwd: root })

  console.log("[dist] 完成,安装包位于 dist/")
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
