import tailwindcss from "tailwindcss";
import autoprefixer from "autoprefixer";

const ensureSourceFile = () => ({
  postcssPlugin: "ensure-source-file",
  Once(root) {
    const fallbackFile = root.source?.input?.file || "virtual:generated.css";
    root.walkDecls((decl) => {
      if (!decl.source?.input?.file) {
        decl.source = {
          ...decl.source,
          input: { ...(decl.source?.input ?? {}), file: fallbackFile },
        };
      }
    });
  },
});
ensureSourceFile.postcss = true;

export default {
  plugins: [tailwindcss(), autoprefixer(), ensureSourceFile()],
};
