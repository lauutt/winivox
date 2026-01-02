import { defineConfig } from "vite";
import { resolve } from "path";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    host: true
  },
  build: {
    rollupOptions: {
      input: {
        main: resolve(__dirname, "index.html"),
        upload: resolve(__dirname, "upload/index.html"),
        library: resolve(__dirname, "library/index.html"),
        profile: resolve(__dirname, "profile/index.html"),
        profilePublic: resolve(__dirname, "profile-public/index.html")
      }
    }
  }
});
