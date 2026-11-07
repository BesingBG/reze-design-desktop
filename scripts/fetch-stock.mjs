import { mkdirSync, writeFileSync } from "node:fs"
import { dirname, join } from "node:path"
import { fileURLToPath } from "node:url"
import { STOCK_URL, fetchStock, summarize } from "./lib/stock.mjs"

// 刷新仓库里的材质库快照:node scripts/fetch-stock.mjs [--url <接口地址>]
const __dirname = dirname(fileURLToPath(import.meta.url))
const root = join(__dirname, "..")

const at = process.argv.indexOf("--url")
const url = at >= 0 && process.argv[at + 1] ? process.argv[at + 1] : STOCK_URL

const { text, items, styles, styleGraphs, fetchedAt } = await fetchStock(url)

mkdirSync(join(root, "assets"), { recursive: true })
writeFileSync(join(root, "assets", "stock.json"), text.endsWith("\n") ? text : text + "\n")
writeFileSync(
  join(root, "assets", "stock.meta.json"),
  JSON.stringify(
    {
      source: url,
      fetchedAt,
      counts: { items: items.length, styles: styles.length, styleGraphs: styleGraphs.length },
    },
    null,
    2,
  ) + "\n",
)

console.log(`[stock] 已写入 assets/stock.json (${summarize({ items, styles, styleGraphs })}) @ ${fetchedAt}`)
