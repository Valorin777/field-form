import { defineConfig } from "vite";
export default defineConfig({
  base: "./",
  build: {
    target: "es2022",
    rolldownOptions: {
      output: {
        codeSplitting: {
          groups: [
            { name: "three", test: /node_modules\/three\// },
            { name: "motion", test: /node_modules\/gsap\// },
          ],
        },
      },
    },
  },
});
