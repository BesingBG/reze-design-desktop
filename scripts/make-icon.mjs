import { writeFileSync, mkdirSync } from "node:fs"
import { join, dirname } from "node:path"
import { fileURLToPath } from "node:url"
import { Jimp } from "jimp"
import pngToIco from "png-to-ico"
import png2icons from "png2icons"

const __dirname = dirname(fileURLToPath(import.meta.url))
const root = join(__dirname, "..")
const sourcePath = join(root, "build", "icon-source.jpg")
const outDir = join(root, "build")

async function main() {
  const img = await Jimp.read(sourcePath)
  const img256 = img.clone().resize({ w: 256, h: 256 })
  const img1024 = img.clone().resize({ w: 1024, h: 1024 })

  const png256 = await img256.getBuffer("image/png")
  const png1024 = await img1024.getBuffer("image/png")
  const icoBuffer = await pngToIco(png256)
  const icnsBuffer = png2icons.createICNS(png1024, png2icons.BICUBIC)

  mkdirSync(outDir, { recursive: true })
  writeFileSync(join(outDir, "icon.ico"), icoBuffer)
  writeFileSync(join(outDir, "icon.png"), png1024)
  writeFileSync(join(outDir, "icon.icns"), icnsBuffer)
  console.log("已生成 build/icon.ico、build/icon.png、build/icon.icns")
}

main().catch((err) => {
  console.error("生成图标失败:", err)
  process.exit(1)
})
