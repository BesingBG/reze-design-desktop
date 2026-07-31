# Reze Design 桌面客户端

**Reze Design Desktop** is a cross-platform desktop app for editing, playing and rendering MMD (MikuMikuDance) models and VMD animation clips, built on top of [reze-design](https://github.com/AmyangXYZ/reze-design). It renders locally in real time via WebGPU and serves the UI from an embedded Next.js server — no external services required. Works on Windows & macOS.

Reze Design Desktop 是一款跨平台的开源 [MMD（MikuMikuDance）](https://sites.google.com/view/vpvp/) 视频渲染软件，支持编辑，播放和渲染 VMD/PMX 格式的模型动画，它是基于 [reze-design](https://github.com/AmyangXYZ/reze-design) 封装的桌面软件，使用 WebGPU 的实时渲染，可以更方便的在本地渲染MMD视频，支持window和MAC。


## 功能

- 离线本地渲染导出:Electron 内嵌 `next start`,无需外部服务
- WebGPU 自动检测与说明指引(双显卡/驱动问题排查)
- 发行剥离:内置版权资源(models/animations/audios)不出现在发行包内,打开为空场景,自行导入本地模型
- 在线访问作者站点、检查更新入口(配置于 `config.json`)
- Windows NSIS 向导式安装 / macOS 未签名 dmg(随附放行说明)

## 环境要求

- Node.js 22(`.nvmrc` 已锁定)
- 显卡支持 WebGPU(Windows: D3D12;macOS: Metal),详见 `resources/WebGPU-guide.md`

## 开发

```bash
# 拉取时含子模块
git clone --recurse-submodules <repo-url>
cd reze-design-desktop

npm install
npm run dev        # 启动 Electron + reze-design 开发服务器
```

## 打包

```bash
npm run dist        # 完整构建(staging 内注入剥离版场景并 next build)
npm run dist -- --skip-build   # 复用已有 .next(剥离不生效,不建议用于发行)
```

- Windows 产物:`dist/RezeDesign-<version>-Setup.exe`(NSIS 向导式)
- macOS 产物:`dist/RezeDesign-<version>.dmg`(未签名,安装见 `resources/MAC-install.md`)

图标由 `build/icon-source.jpg` 生成:

```bash
npm run make-icon   # 产出 build/icon.ico、icon.png、icon.icns
```

## 目录结构

```
electron/            Electron 主进程与 preload
scripts/             dev / dist / make-icon / after-pack
resources/           说明文档 + 发行剥离版默认场景
config.json          在线地址、更新地址、端口
reze-design/         子模块(上游 reze-design v0.3.0)
```

## License

[AGPL-3.0-or-later](LICENSE)


## 致谢
感谢 [AmyangXYZ](https://github.com/AmyangXYZ/) 创建并维护了优秀的 reze-engine MMD WebGPU引擎，以及其他相关项目。
