// electron.vite.config.ts
import { defineConfig, externalizeDepsPlugin } from "electron-vite";
import { resolve } from "path";
var __electron_vite_injected_dirname = "D:\\webof _up_nz\\gptulternative\\desktop";
var electron_vite_config_default = defineConfig({
  main: {
    plugins: [externalizeDepsPlugin()],
    build: {
      outDir: "dist/main",
      rollupOptions: {
        input: resolve(__electron_vite_injected_dirname, "src/main/index.ts")
      }
    },
    resolve: {
      alias: {
        "@main": resolve(__electron_vite_injected_dirname, "src/main"),
        "@preload": resolve(__electron_vite_injected_dirname, "src/preload")
      }
    }
  },
  preload: {
    plugins: [externalizeDepsPlugin()],
    build: {
      outDir: "dist/preload",
      rollupOptions: {
        input: resolve(__electron_vite_injected_dirname, "src/preload/index.ts")
      }
    }
  },
  renderer: {
    // Renderer is loaded from frontend/dist/ or localhost in dev
    // No separate renderer build needed since we reuse the web app
    build: {
      outDir: "dist/renderer",
      emptyOutDir: false
    }
  }
});
export {
  electron_vite_config_default as default
};
