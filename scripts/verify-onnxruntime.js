#!/usr/bin/env node
/**
 * Ensures onnxruntime-node (pulled in via rmbg) resolves to a build whose npm
 * tarball includes native bindings for the current process.platform / process.arch.
 *
 * Some onnxruntime-node 1.24.x releases omitted darwin/x64 binaries from the
 * published package while Node still reports arch=x64, causing startup crashes
 * when background-removal tooling loads ONNX.
 *
 * Resolution: onnxruntime-node may be nested under `rmbg` rather than hoisted
 * to the package root, so we resolve/load it from that dependency context.
 */
import { createRequire } from "node:module";
import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const rootRequire = createRequire(path.join(root, "package.json"));
const rmbgRequire = createRequire(path.join(root, "node_modules/rmbg/package.json"));

let pkgRoot;
let loadOrt;

try {
  pkgRoot = path.dirname(rootRequire.resolve("onnxruntime-node/package.json"));
  loadOrt = () => {
    rootRequire("onnxruntime-node");
  };
} catch {
  try {
    pkgRoot = path.dirname(rmbgRequire.resolve("onnxruntime-node/package.json"));
    loadOrt = () => {
      rmbgRequire("onnxruntime-node");
    };
  } catch {
    console.error(
      "verify-onnxruntime: onnxruntime-node not found (expected via rmbg dependency)",
    );
    process.exit(1);
  }
}

const binding = path.join(
  pkgRoot,
  "bin",
  "napi-v6",
  process.platform,
  process.arch,
  "onnxruntime_binding.node",
);

if (!fs.existsSync(binding)) {
  console.error(`verify-onnxruntime: missing native binding at:\n  ${binding}`);
  console.error(
    "Install resolved to an onnxruntime-node version whose published tarball does not ship binaries for this OS/arch.",
  );
  process.exit(1);
}

try {
  loadOrt();
} catch (err) {
  console.error(
    "verify-onnxruntime: failed to load onnxruntime-node:",
    err instanceof Error ? err.message : err,
  );
  process.exit(1);
}

console.log("verify-onnxruntime: OK");
