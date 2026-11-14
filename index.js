import fs from "fs";
import path from "path";
import { execFileSync } from "child_process";
import { createRequire } from "module";

const require = createRequire(import.meta.url);
const rootDir = process.cwd();
const builtServer = path.join(rootDir, "dist", "server.cjs");

if (process.env.NODE_ENV === "production" && fs.existsSync(builtServer)) {
  require(builtServer);
} else {
  const runtimeDir = path.join(rootDir, ".runtime");
  const sourceFiles = [
    "server.ts",
    path.join("bot", "index.ts"),
    path.join("bot", "ai.ts"),
    path.join("bot", "automod.ts"),
    path.join("bot", "music.ts"),
  ];

  const needsCompile = sourceFiles.some((relPath) => {
    const srcPath = path.join(rootDir, relPath);
    const outPath = path.join(runtimeDir, relPath.replace(/\.ts$/, ".js"));
    if (!fs.existsSync(outPath)) return true;
    return fs.statSync(srcPath).mtimeMs > fs.statSync(outPath).mtimeMs;
  });

  if (needsCompile) {
    fs.mkdirSync(runtimeDir, { recursive: true });
    fs.writeFileSync(path.join(runtimeDir, "package.json"), JSON.stringify({ type: "commonjs" }));

    // Transpile in a short-lived child process so TypeScript (~50MB RAM) is freed before the bot runs
    const transpileScript = `
      const fs = require("fs");
      const path = require("path");
      const ts = require("typescript");
      const rootDir = process.cwd();
      const runtimeDir = path.join(rootDir, ".runtime");
      const files = ${JSON.stringify(sourceFiles)};
      const compilerOptions = {
        target: ts.ScriptTarget.ES2022,
        module: ts.ModuleKind.CommonJS,
        esModuleInterop: true,
        allowSyntheticDefaultImports: true,
      };
      for (const relPath of files) {
        const srcPath = path.join(rootDir, relPath);
        const outPath = path.join(runtimeDir, relPath.replace(/\\.ts$/, ".js"));
        fs.mkdirSync(path.dirname(outPath), { recursive: true });
        const source = fs.readFileSync(srcPath, "utf8");
        const result = ts.transpileModule(source, { compilerOptions, fileName: srcPath });
        fs.writeFileSync(outPath, result.outputText, "utf8");
      }
    `;
    execFileSync(process.execPath, ["-e", transpileScript], { cwd: rootDir, stdio: "inherit" });
  }

  process.env.SKIP_VITE = "true";
  require(path.join(runtimeDir, "server.js"));
}
