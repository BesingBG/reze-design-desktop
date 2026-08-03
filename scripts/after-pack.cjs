const { cpSync, existsSync } = require("node:fs")
const { join } = require("node:path")

exports.default = async function afterPack(context) {
  const { appOutDir, packager, electronPlatformName } = context
  const resourcesDir =
    electronPlatformName === "darwin"
      ? join(appOutDir, `${packager.appInfo.productFilename}.app`, "Contents", "Resources")
      : join(appOutDir, "resources")
  const src = join(packager.projectDir, "dist-resources", "reze-design")
  const dest = join(resourcesDir, "reze-design")
  if (!existsSync(join(src, "node_modules"))) return
  cpSync(join(src, "node_modules"), join(dest, "node_modules"), { recursive: true })
}
