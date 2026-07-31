// 发行剥离版默认场景:不引用默认版权资源(models/animations/audios)。
// 由 scripts/dist.mjs 在构建 staging 时注入,替代子模块内的原版;子模块工作区不被改动。
// 结构须与 reze-design/lib/default-scene.ts 保持一致,子模块升级时需同步复核。

import { builtinEffect } from "@/lib/background-effects"
import { libraryGraph } from "@/lib/materials"
import { parseSceneDoc, type Scene, type SceneDoc } from "@/lib/scene"

export const DEFAULT_SCENE_DOC: SceneDoc = {
  version: 1,
  name: "My first scene",
  assets: {
    models: [],
    cameraAnimation: null,
    audio: null,
    backdrop: null,
    skybox: null,
  },
  settings: {
    camera: { distance: 26.2, target: [0, 11.4, 0] },
    world: { color: "#ed6aff", strength: 0.66 },
    sun: { color: "#ffffff", strength: 2.0, azimuth: 205, elevation: 21 },
    bloom: { enabled: true, threshold: 0.5, knee: 0.5, radius: 4.0, intensity: 0.05, color: "#ffc9c9" },
    background: { color: "#4b004f", effect: "Shining Stars" },
    grade: { preset: "Neutral", intensity: 1 },
    ground: { color: "#c800de", size: 160, opacity: 0.42, shadow: true, grid: "#fafaf9", gridEnabled: true },
  },
}

export const DEFAULT_SCENE: Scene = parseSceneDoc(DEFAULT_SCENE_DOC, builtinEffect, libraryGraph)
