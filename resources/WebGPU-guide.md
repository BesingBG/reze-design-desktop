# Reze Design 设备支持清单

本项目(基于 `reze-engine`)通过 **WebGPU** 在浏览器中做 MMD 实时渲染,渲染器**没有 WebGL 兜底**。WebGPU 不可用 = 项目的核心渲染功能不可用。

**核心门槛一句话**:Windows 上显卡必须支持 **DirectX 12(D3D12)**;macOS 上必须支持 **Metal**。

---

## 1. 系统要求

| 系统 | 要求 |
| --- | --- |
| Windows | Windows 10(1809 或更新)或 Windows 11 |
| macOS | macOS 26 或更新 |
| 其他 | Android 12+(仅部分 GPU)、Linux 支持尚在推进,不建议依赖 |

浏览器访问即可运行;若需在本地跑开发环境,还需要 Node.js 22+(见项目 `README.md`),两者是不同层面的要求。

---

## 2. 浏览器要求

| 浏览器 | 最低版本 | 备注 |
| --- | --- | --- |
| Chrome / Edge | **113** | 建议使用最新版(实测 150 正常) |
| Firefox | **141** | 目前仅 Windows |
| Safari | **26** | 仅较新的 macOS / iOS 系统 |

> 浏览器版本只是"API 是否开启"的前提。真正决定能否渲染的是下一层的 **GPU 硬件与驱动**。

---

## 3. GPU 硬件要求(核心门槛)

Windows 上 WebGPU 依赖 **D3D12** 后端,因此显卡是否支持 D3D12 是硬性分水岭。

| 厂商 | 最低参考型号 | 说明 |
| --- | --- | --- |
| Intel | **UHD 630 及以上(2018+)** | HD 4000 / Iris 5000 系列(Haswell / Broadwell,2013–2014)**不支持 D3D12,不可用** |
| NVIDIA | **GTX 900 / 1000 系列及以上** | |
| AMD | **RX 400 系列及以上** | GCN 1.0(HD 7000 / 8000、R9 200 系列)理论支持 D3D12 11_0,但**可用性无保障**,实际往往因驱动/黑名单拿不到适配器 |

判断方法:显卡能否驱动 D3D12(可参考设备厂商官网或 `dxdiag`),不要只看"能打游戏/能显示画面"。

---

## 4. 驱动要求

- 显卡驱动需**保持更新**;停更多年的老驱动会被 Chromium 的 GPU 黑名单拦截,导致 WebGPU 不可用。
- 已停产显卡(如 AMD HD 8000 系列,官方早已停止更新驱动)即使硬件支持 D3D12,也可能被浏览器拒绝。
- 建议:优先选仍在官方支持期内的显卡;安装驱动后重启并复查 `chrome://gpu`。

---

## 5. 双显卡笔记本:必须手动指定独立显卡(重点)

**现象**:Chromium 在笔记本上默认优先用"省电"的核显。若核显不支持 D3D12(如 Intel Haswell 核显),`navigator.gpu.requestAdapter()` 会返回 `null`,页面报:

```
WebGPU is not supported in this browser.
```

**解决步骤**(Windows):
1. 打开:设置 → 系统 → 显示 → 图形
2. 点"添加应用"→ 添加 `chrome.exe`(及 `msedge.exe`)
3. 在列表中点击该应用 → 选项 → 选择 **高性能**(独立显卡) → 保存
4. 完全重启浏览器,重新打开项目

**注意事项**:
- `chrome.exe` 和 `msedge.exe` **都要分别设置**,换浏览器不会继承。
- 本机实测(Lenovo 20351):Intel Iris 5100 核显(Haswell,无 D3D12)无法启用 WebGPU;在图形设置里把 Chrome 切到 AMD Radeon HD 8500M(独显)后,WebGPU 正常、功能可用。
- 浏览器升级后建议复查该设置是否仍生效。

---

## 6. 如何验证 WebGPU 是否可用

1. 打开 `chrome://gpu`,查看:
   - **Graphics Feature Status** → WebGPU 行
   - **GL_RENDERER**:确认当前实际使用哪块 GPU(若仍显示 Intel HD/Iris 系列,说明没切到独显)
2. 在页面控制台(F12)运行:
   ```js
   navigator.gpu.requestAdapter().then(a => console.log('adapter:', a))
   ```
   返回 `GPUAdapter` 对象 = 可用;返回 `null`(并提示 `No available adapters.`) = 不可用。
3. 报错来源:`WebGPU is not supported in this browser.` 抛自 `reze-engine` 的 `init()`,即 `requestAdapter()` 返回 `null` 或 `requestDevice()` 失败。

---

## 7. 故障排查速查

按顺序排查:

1. 浏览器是否为 Chrome/Edge 113+ 或 Firefox 141+(Windows)。
2. 显卡是否支持 D3D12 / Metal。
3. 驱动是否过旧(查看 `chrome://gpu` 有无 blocklist 提示)。
4. 双显卡笔记本是否已在"图形设置"中指定独显。
5. 确认 `chrome://gpu` 的 GL_RENDERER 显示的是独显。

**强制解锁(仅作流程验证,不推荐用于实际使用)**:
`chrome://flags/#enable-unsafe-webgpu` → Enabled → 重启,可绕过黑名单拿到软件适配器(SwiftShader)。但软件渲染性能极差,**不适合**本项目的 MMD 实时渲染与 4K/60fps 视频导出,只能用来验证流程是否走通。

---

## 8. 性能预期与设备建议

- 本机实测(AMD GCN 1.0 独显):WebGPU 功能**可用**;但实时渲染、4K/60fps 视频导出等重负载会明显偏慢。
- 建议运行设备:**近 5 年内**的笔记本 / 台式机,显卡达到以下任一标准:
  - Intel **UHD 630 及以上**
  - NVIDIA **GTX 1000 系列及以上**
  - AMD **RX 400 系列及以上**
- 更新驱动、插电运行(避免电池节能降频)可改善性能。
