import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// The page shell is app.html (not index.html) so the server always serves it:
// it fills in the link-preview tags for each share link and the lock.
export default defineConfig({
  plugins: [react()],
  build: {
    outDir: "dist",
    assetsInlineLimit: 0,
    rollupOptions: { input: { app: "app.html" } },
  },
});
