# Reze Design(macOS)安装与运行说明

本应用未购买 Apple 开发者签名,属个人分发的 unsigned 版本。首次运行时 macOS 的 Gatekeeper 会拦截,按下面任一方法放行即可。应用本身安全,仅因未签名被拦截。

## 安装

1. 双击 `RezeDesign-*.dmg`
2. 将 `Reze Design.app` 拖入"应用程序"文件夹
3. 从"应用程序"或 Launchpad 打开

## 首次打开被拦截怎么办(三选一)

**方法一(推荐):右键打开**

1. 在"应用程序"中找到 `Reze Design.app`
2. **按住 Control 键**点按(或点按右键)→ 选择"打开"
3. 在弹出的提示中点"打开"

**方法二:终端解除隔离**

打开"终端"(Terminal),执行:

```bash
xattr -dr com.apple.quarantine "/Applications/Reze Design.app"
```

然后正常双击打开即可。

**方法三:系统设置允许**

系统设置 → 隐私与安全性 → 在"仍要打开"处选择"允许"。

## 说明

- 离线模式本地渲染导出无需联网,不依赖账号/数据库。
- "在线访问作者站点"会用系统浏览器打开 https://reze.design/ 。
- 在线站点需登录,账号体系在作者站点侧维护。
- 本机若提示无法启用 WebGPU,请参照随包文档《WebGPU-guide.md》(或先切到独立显卡再试)。
