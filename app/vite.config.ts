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
      // Static single-page app: the data comes from the data repo over
      // jsDelivr at runtime, so there is no server. Prerender a shell as
      // dist/client/index.html, served for every route and hydrated on the
      // client (see public/_redirects for the SPA fallback). Deploy the static
      // dist/client output to any static host (e.g. Cloudflare Pages).
      spa: { enabled: true, prerender: { outputPath: "/index" } },
      // Redirect TanStack Start's bundled server entry to src/server.ts,
      // our error wrapper (used while prerendering the shell).
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
