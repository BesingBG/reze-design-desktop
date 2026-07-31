import { spawn } from "node:child_process"
import { createRequire } from "node:module"
import { existsSync } from "node:fs"
import { join, dirname } from "node:path"
import { fileURLToPath } from "node:url"

const __dirname = dirname(fileURLToPath(import.meta.url))
const root = join(__dirname, "..")
const sub = join(root, "reze-design")
const require = createRequire(import.meta.url)

function run(cmd, args, opts = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(cmd, args, { stdio: "inherit", shell: process.platform === "win32", ...opts })
    child.on("error", reject)
    child.on("exit", (code) => (code === 0 ? resolve() : reject(new Error(`${cmd} 退出码 ${code}`))))
  })
}

async function main() {
  if (!existsSync(join(sub, "node_modules"))) {
    console.log("[dev] 正在安装 reze-design 依赖...")
    await run("npm", ["ci"], { cwd: sub })
  }
  console.log("[dev] 启动 Electron(开发模式)...")
  const electronPath = require("electron")
  const child = spawn(electronPath, [root], {
    stdio: "inherit",
    env: { ...process.env, NODE_ENV: "development" },
  })
  child.on("error", (err) => {
    console.error("[dev] 启动 Electron 失败:", err)
    process.exit(1)
  })
  child.on("exit", (code) => process.exit(code ?? 0))
}

main()
