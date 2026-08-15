// 构建脚本：esbuild 产出正式 npm 包产物（lib/）。
//
//   node scripts/build.mjs
//
// 产物：
//   lib/client.js           客户端 bundle —— 包在 window.__ModuleLoader__.load 中，
//                           依赖（react / @deepseek-ai/dsh-client-ui-primitives）外部化，
//                           与 DSH 客户端模块装载器的格式一致。
//   lib/index.js            宿主 StatsService —— ESM，@deepseek-ai/dsh-typert-protocol 外部化。
//   lib/typert.host.js      宿主 Typert manifest（原样拷贝，zod 外部化）。
//   lib/typert.remote-client.js 客户端描述符（参考用，原样拷贝）。

import { build } from "esbuild";
import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const pkg = JSON.parse(readFileSync(join(root, "package.json"), "utf8"));
const ID = pkg.name;
const CLIENT_EXTERNALS = [
  "react",
  "react/jsx-runtime",
  "react-dom",
  "@deepseek-ai/dsh-client-ui-primitives",
  "@deepseek-ai/dsh-client-runtime/client",
];
const HOST_EXTERNALS = [
  "@deepseek-ai/dsh-typert-protocol",
  "zod",
  "node:*",
];

// ---- 1. 客户端 bundle ----
const client = await build({
  entryPoints: [join(root, "src/client.cjs")],
  bundle: true,
  format: "cjs",
  platform: "browser",
  target: "es2020",
  external: CLIENT_EXTERNALS,
  write: false,
  minify: false,
  legalComments: "none",
});
const body = client.outputFiles[0].text;
const wrapped = `window.__ModuleLoader__.load({
\tid: ${JSON.stringify(ID)},
\tfactory: (require) => {
\t\tvar module = { exports: {} };
\t\tvar exports = module.exports;
\t\tObject.defineProperty(exports, Symbol.toStringTag, { value: "Module" });
${body.split("\n").map((l) => (l ? "\t\t" + l : l)).join("\n")}
\t\treturn module.exports;
\t}
});
`;
writeFileSync(join(root, "lib/client.js"), wrapped);

// ---- 2. 宿主 ----
await build({
  entryPoints: [join(root, "src/index.js")],
  bundle: true,
  format: "esm",
  platform: "node",
  target: "node22",
  external: HOST_EXTERNALS,
  outfile: join(root, "lib/index.js"),
  legalComments: "none",
});

// ---- 3. Typert manifest（原样拷贝，zod 由运行环境解析）----
writeFileSync(join(root, "lib/typert.host.js"), readFileSync(join(root, "src/typert-host.js"), "utf8"));
writeFileSync(join(root, "lib/typert.remote-client.js"), readFileSync(join(root, "src/typert-remote-client.js"), "utf8"));

console.log("构建完成：lib/client.js / lib/index.js / lib/typert.host.js / lib/typert.remote-client.js");
