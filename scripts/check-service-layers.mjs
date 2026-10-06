import { readdir, readFile } from "node:fs/promises";
import { basename, join, relative, resolve, sep } from "node:path";

const requiredLayers = ["domain", "application", "ports", "adapters", "bootstrap"];
const codeExtensions = new Set([".ts", ".tsx", ".mts", ".cts"]);

async function filesBelow(directory) {
  const files = [];
  let entries;
  try { entries = await readdir(directory, { withFileTypes: true }); }
  catch (error) { if (error?.code === "ENOENT") return files; throw error; }
  for (const entry of entries) {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) files.push(...await filesBelow(path));
    else if (entry.isFile() && codeExtensions.has(entry.name.slice(entry.name.lastIndexOf(".")))) files.push(path);
  }
  return files;
}

function importedSpecifiers(source) {
  const specifiers = [];
  const pattern = /\b(?:import|export)\s+(?:type\s+)?(?:[^;\n]*?\s+from\s+)?["']([^"']+)["']/gu;
  for (const match of source.matchAll(pattern)) specifiers.push(match[1]);
  return specifiers;
}

const forbiddenByLayer = {
  domain: [
    { pattern: /(?:^|\/)adapters(?:\/|$)/u, label: "adapter imports" },
    { pattern: /(?:^|\/)bootstrap(?:\/|$)/u, label: "bootstrap imports" },
    { pattern: /^@nestjs\//u, label: "NestJS framework imports" },
    { pattern: /^(?:pg|express|fastify)$/u, label: "infrastructure/framework imports" },
  ],
  application: [
    { pattern: /(?:^|\/)adapters(?:\/|$)/u, label: "adapter imports" },
    { pattern: /(?:^|\/)bootstrap(?:\/|$)/u, label: "bootstrap imports" },
    { pattern: /^@nestjs\//u, label: "NestJS framework imports" },
    { pattern: /^(?:pg|express|fastify)$/u, label: "infrastructure/framework imports" },
  ],
  ports: [
    { pattern: /(?:^|\/)adapters(?:\/|$)/u, label: "adapter imports" },
    { pattern: /(?:^|\/)bootstrap(?:\/|$)/u, label: "bootstrap imports" },
    { pattern: /^@nestjs\//u, label: "NestJS framework imports" },
    { pattern: /^(?:pg|express|fastify)$/u, label: "infrastructure/framework imports" },
  ],
};

export async function checkServiceLayers(serviceDirectory) {
  const root = resolve(serviceDirectory);
  const src = join(root, "src");
  const present = new Set((await readdir(src, { withFileTypes: true })).filter((entry) => entry.isDirectory()).map((entry) => entry.name));
  const missingLayers = requiredLayers.filter((layer) => !present.has(layer));
  const violations = [];
  for (const layer of Object.keys(forbiddenByLayer)) {
    for (const file of await filesBelow(join(src, layer))) {
      const source = await readFile(file, "utf8");
      for (const specifier of importedSpecifiers(source)) {
        const rule = forbiddenByLayer[layer].find(({ pattern }) => pattern.test(specifier));
        if (rule) violations.push({ file: relative(root, file).split(sep).join("/"), layer, specifier, rule: rule.label });
      }
    }
  }
  if (basename(root) === "quant-research-service") {
    for (const file of await filesBelow(join(src, "bootstrap"))) {
      const source = await readFile(file, "utf8");
      if (/\b(?:pool|client)\.(?:query|connect)\s*\(/u.test(source)) violations.push({ file: relative(root, file).split(sep).join("/"), layer: "bootstrap", specifier: "PostgreSQL client call", rule: "database access must be behind repository adapters" });
    }
  }
  if (basename(root) === "market-data-service") {
    for (const file of await filesBelow(join(src, "bootstrap"))) {
      const source = await readFile(file, "utf8");
      if (/\bfetch\s*\(/u.test(source)) violations.push({ file: relative(root, file).split(sep).join("/"), layer: "bootstrap", specifier: "outbound HTTP fetch", rule: "external source transport must be behind adapters" });
    }
  }
  return { status: missingLayers.length === 0 && violations.length === 0 ? "PASS" : "INCOMPLETE", requiredLayers, missingLayers, violations };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const serviceFlag = process.argv.indexOf("--service");
  const serviceName = serviceFlag >= 0 ? process.argv[serviceFlag + 1] : undefined;
  if (!serviceName || !/^[a-z0-9-]+-(?:service|worker)$/u.test(serviceName)) {
    console.error("usage: node scripts/check-service-layers.mjs --service <service-or-worker-name>");
    process.exitCode = 2;
  } else {
    const result = await checkServiceLayers(resolve("services", serviceName));
    console.log(JSON.stringify({ service: serviceName, ...result }, null, 2));
    process.exitCode = result.status === "PASS" ? 0 : 2;
  }
}
