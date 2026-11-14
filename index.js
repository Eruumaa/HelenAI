import fs from "fs";
import path from "path";
import { createRequire } from "module";
import ts from "typescript";

const require = createRequire(import.meta.url);
const rootDir = process.cwd();
const builtServer = path.join(rootDir, "dist", "server.cjs");

if (process.env.NODE_ENV === "production" && fs.existsSync(builtServer)) {
  require(builtServer);
} else {
  const runtimeDir = path.join(rootDir, ".runtime");
  fs.mkdirSync(runtimeDir, { recursive: true });
  fs.writeFileSync(path.join(runtimeDir, "package.json"), JSON.stringify({ type: "commonjs" }));

  const sourceFiles = [
    path.join(rootDir, "server.ts"),
    path.join(rootDir, "bot", "index.ts"),
    path.join(rootDir, "bot", "ai.ts"),
    path.join(rootDir, "bot", "automod.ts"),
    path.join(rootDir, "bot", "music.ts"),
  ];

  const compilerOptions = {
    target: ts.ScriptTarget.ES2022,
    module: ts.ModuleKind.CommonJS,
    moduleResolution: ts.ModuleResolutionKind.Node10,
    esModuleInterop: true,
    allowSyntheticDefaultImports: true,
    skipLibCheck: true,
    sourceMap: false,
    outDir: runtimeDir,
    rootDir,
  };

  const program = ts.createProgram(sourceFiles, compilerOptions);
  program.emit();

  require(path.join(runtimeDir, "server.js"));
}
