const { contextBridge } = require("electron")

contextBridge.exposeInMainWorld("rezeDesktop", {
  checkWebGPU: async () => {
    try {
      if (typeof navigator === "undefined" || !navigator.gpu) {
        return { supported: false, reason: "no-gpu-api" }
      }
      const adapter = await navigator.gpu.requestAdapter()
      return { supported: !!adapter, reason: adapter ? undefined : "no-adapter" }
    } catch (err) {
      return { supported: false, reason: "error", error: String(err) }
    }
  },
})
