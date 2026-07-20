import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { viteSingleFile } from "vite-plugin-singlefile";

// release/ に単一HTMLとして書き出す（GitHub Pagesの配備物もこのフォルダをそのまま使う）。
// base: "./" は file:// 直開きとPagesのサブパス配備の両方で崩れないようにするため。
export default defineConfig({
  base: "./",
  plugins: [react(), viteSingleFile()],
  build: {
    outDir: "release",
    emptyOutDir: true,
  },
});
