import { defineConfig } from "vite";
import tailwindcss from "@tailwindcss/vite";
import tsConfigPaths from "vite-tsconfig-paths";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import viteReact from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [
    tailwindcss(),
    tsConfigPaths({ projects: ["./tsconfig.json"] }),
    tanstackStart({
      // Redirect TanStack Start's bundled server entry to src/server.ts,
      // our SSR error wrapper.
      server: { entry: "server" },
      importProtection: {
        behavior: "error",
        client: {
          files: ["**/server/**"],
          specifiers: ["server-only"],
        },
      },
    }),
    viteReact(),
  ],
  // Vite uses PostCSS in dev and only runs Lightning CSS at build, so
  // build-time transforms can break the built output while the dev preview
  // looks fine. Running Lightning CSS in both keeps the preview honest.
  css: { transformer: "lightningcss" },
  server: { host: "::", port: 8080 },
});
