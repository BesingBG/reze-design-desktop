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

// 发行剥离:v0.6.8 起上游将 demo 资源迁移至 R2 CDN(public/ 不再包含 models/animations/audios),
// 且空场景已是默认行为(未设 NEXT_PUBLIC_USE_DEFAULT_SCENE=true 时启动即为空场景),无需额外剥离。

// 运行期加载 next.config.ts 需要 typescript;打包后 --omit=dev 已将其移除,next 会
// 触发自动 `npm install typescript`,在只读安装目录下必然失败并退出。转换为纯 JS
// 配置 next.config.js 后不再需要 TypeScript,彻底消除该运行时依赖。
// 注意:值导入(含 import ... from "./package.json")必须归一为 CommonJS require(),否则
// Node 22 模块语法检测会将该 .js 当作 ESM 执行(Next 对 config 不做转译),裸导入 JSON 因
// 缺少 `with { type: "json" }` 抛 ERR_IMPORT_ATTRIBUTE_MISSING 导致 next build 失败。
function esmImportToCommonJs(line) {
  const namePattern = (named) =>
    named
      .split(",")
      .map((p) => p.trim())
      .filter((p) => p.length > 0 && !/^type\s+\w+/.test(p))
      .map((p) => p.replace(/\s+as\s+/g, ": "))
      .join(", ")
  const makeRequire = (quote, spec) => `require(${quote}${spec}${quote})`
  const cleaned = line.trim().replace(/\s+with\s+\{[^}]*\}\s*$/, "").replace(/;?\s*$/, "")
  if (!/^import\b/.test(cleaned)) return line
  let m = cleaned.match(/^import\s+(["'])([^"']+)\1$/)
  if (m) return makeRequire(m[1], m[2])
  const clause = cleaned.replace(/^import\s+/, "")
  m = clause.match(/^(.+?)\s+from\s+(["'])([^"']+)\2$/)
  if (!m) {
    throw new Error("next.config.ts 转换失败:不支持的 import 语句(需同步更新转换逻辑):\n" + line)
  }
  const requireCall = makeRequire(m[2], m[3])
  const names = m[1].trim()
  m = names.match(/^\*\s+as\s+(\w+)$/)
  if (m) return `const ${m[1]} = ${requireCall}`
  m = names.match(/^(\w+)\s*,\s*\{([^}]*)\}$/)
  if (m) return `const ${m[1]} = ${requireCall}\nconst { ${namePattern(m[2])} } = ${requireCall}`
  m = names.match(/^\{([^}]*)\}$/)
  if (m) return `const { ${namePattern(m[1])} } = ${requireCall}`
  m = names.match(/^(\w+)$/)
  if (m) return `const ${m[1]} = ${requireCall}`
  throw new Error("next.config.ts 转换失败:不支持的 import 语句(需同步更新转换逻辑):\n" + line)
}

function convertNextConfigTsToJs() {
  const tsPath = join(stagingServer, "next.config.ts")
  if (!existsSync(tsPath)) {
    console.log("[dist] 无 next.config.ts,跳过配置转换")
    return
  }
  let src = readFileSync(tsPath, "utf8")
  const hasCrlf = src.includes("\r\n")
  if (hasCrlf) src = src.replace(/\r\n/g, "\n")
  const cfgText = src
    .split("\n")
    .filter((line) => !/^\s*import\s+type\s/.test(line))
    .join("\n")
  if (!/const\s+(nextConfig|config)\s*:\s*NextConfig\s*=\s*\{/.test(cfgText)) {
    throw new Error("next.config.ts 转换失败:未找到 const nextConfig/config: NextConfig = {,需同步更新")
  }
  const js = cfgText
    .split("\n")
    .filter((line) => !/^\s*export\s+default\s+/.test(line))
    .map((line) => (/^\s*import\b/.test(line) ? esmImportToCommonJs(line) : line))
    .join("\n")
    .replace(/const\s+(nextConfig|config)\s*:\s*NextConfig\s*=\s*\{/, "module.exports = {")
  const jsPath = join(stagingServer, "next.config.js")
  writeFileSync(jsPath, hasCrlf ? js.replace(/\n/g, "\r\n") : js)
  rmSync(tsPath, { force: true })
  console.log("[dist] next.config.ts → next.config.js(消除运行时 TypeScript 依赖;值导入归一为 require)")
}

async function main() {
  const skipBuild = process.argv.includes("--skip-build")

  console.log("[dist] 准备 staging...")
  rmSync(stagingServer, { recursive: true, force: true })
  mkdirSync(stagingServer, { recursive: true })
  copyEntries(sub, stagingServer, ["node_modules", ".next", ".git", "screenshots"])

  if (skipBuild) {
    if (!existsSync(join(sub, ".next"))) {
      throw new Error("缺少 .next 构建产物,请先执行 npm run build")
    }
    console.warn(
      "[dist] 警告:--skip-build 直接复用既有 .next。若其不是以空场景模式构建,请改用完整构建。",
    )
    copy(join(sub, ".next"), join(stagingServer, ".next"))
  } else {
    console.log("[dist] 安装依赖(全量,含构建工具)...")
    await run("npm", ["ci"], { cwd: stagingServer })
    convertNextConfigTsToJs()
    console.log("[dist] next build(空场景版,无需设置环境变量,上游默认即为空场景)...")
    await run("npm", ["run", "build"], { cwd: stagingServer })
  }

  console.log("[dist] 安装生产依赖(仅 dependencies)...")
  await run("npm", ["ci", "--omit=dev", "--no-audit", "--no-fund"], { cwd: stagingServer })

  console.log("[dist] electron-builder 打包...")
  // 本机网络存在 TLS 中间人拦截,electron-builder 的 got 下载会因证书校验失败
  // (unable to verify the first certificate)。此处按需关闭证书校验。
  process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0"
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