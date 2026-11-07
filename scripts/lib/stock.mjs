import { readFileSync } from "node:fs"
import { join } from "node:path"

// 上游 1.4.2 起把内置材质库(官方账号发布的 grade/graph/effect)迁进了数据库,
// /api/library/stock 在无 DATABASE_URL 时返回空数组,离线桌面版因此材质库为空。
// 这里维护一份该接口的完整快照:构建时优先抓线上最新,失败回退仓库快照。
export const STOCK_URL = "https://reze.design/api/library/stock"
export const STOCK_KINDS = new Set(["graph", "effect", "grade"])
export const MIN_ITEMS = 50
export const FETCH_TIMEOUT_MS = 20_000

/** 校验 /api/library/stock 的响应形状,不合格直接抛错(用于决定能否使用这份数据)。 */
export function parseStock(text, { minItems = MIN_ITEMS } = {}) {
  let data
  try {
    data = JSON.parse(text)
  } catch (err) {
    throw new Error(`响应不是合法 JSON: ${err.message}`)
  }
  if (!data || typeof data !== "object") throw new Error("响应不是对象")
  const { items, styles, styleGraphs } = data
  if (!Array.isArray(items)) throw new Error("items 不是数组")
  if (!Array.isArray(styles)) throw new Error("styles 不是数组")
  if (!Array.isArray(styleGraphs)) throw new Error("styleGraphs 不是数组")
  if (items.length < minItems) throw new Error(`items 只有 ${items.length} 条(< ${minItems})`)
  for (const item of items) {
    if (!item || typeof item !== "object") throw new Error("items 含非对象")
    if (!STOCK_KINDS.has(item.kind)) throw new Error(`未知 kind: ${JSON.stringify(item.kind)}`)
    if (typeof item.id !== "string" || item.id.length === 0) throw new Error("item 缺少 id")
  }
  return { data, items, styles, styleGraphs }
}

/** 抓线上快照:HTTP/超时/结构任一不合格都会抛错,交给调用方决定是否回退。 */
export async function fetchStock(url = STOCK_URL, { timeoutMs = FETCH_TIMEOUT_MS, minItems = MIN_ITEMS } = {}) {
  const res = await fetch(url, {
    headers: { accept: "application/json" },
    signal: AbortSignal.timeout(timeoutMs),
  })
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  const text = await res.text()
  const parsed = parseStock(text, { minItems })
  return { text, ...parsed, source: url, fetchedAt: new Date().toISOString() }
}

/** 读仓库里提交的快照。 */
export function readRepoStock(root, { minItems = MIN_ITEMS } = {}) {
  const text = readFileSync(join(root, "assets", "stock.json"), "utf8")
  const parsed = parseStock(text, { minItems })
  return { text, ...parsed, source: "repo", fetchedAt: null }
}

export function summarize({ items, styles, styleGraphs }) {
  return `items=${items.length} styles=${styles.length} styleGraphs=${styleGraphs.length}`
}
