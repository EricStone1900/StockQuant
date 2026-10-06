import assert from "node:assert/strict";
import { mkdtemp, mkdir, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { checkServiceLayers } from "./check-service-layers.mjs";

test("portfolio-risk application depends on its repository port, not the Postgres adapter", async () => {
  const result = await checkServiceLayers(new URL("../services/portfolio-risk-service", import.meta.url).pathname);
  assert.deepEqual(result, { status: "PASS", requiredLayers: ["domain", "application", "ports", "adapters", "bootstrap"], missingLayers: [], violations: [] });
});

test("market-data application separates persistence adapters and the bootstrap composition root", async () => {
  const result = await checkServiceLayers(new URL("../services/market-data-service", import.meta.url).pathname);
  assert.deepEqual(result, { status: "PASS", requiredLayers: ["domain", "application", "ports", "adapters", "bootstrap"], missingLayers: [], violations: [] });
});

test("trade-execution application uses its outbox and Portfolio ports", async () => {
  const result = await checkServiceLayers(new URL("../services/trade-execution-service", import.meta.url).pathname);
  assert.deepEqual(result, { status: "PASS", requiredLayers: ["domain", "application", "ports", "adapters", "bootstrap"], missingLayers: [], violations: [] });
});

test("research-automation Artifact application depends on ports and keeps filesystem storage in adapters", async () => {
  const result = await checkServiceLayers(new URL("../services/research-automation-service", import.meta.url).pathname);
  assert.deepEqual(result, { status: "PASS", requiredLayers: ["domain", "application", "ports", "adapters", "bootstrap"], missingLayers: [], violations: [] });
});

test("decision-governance application uses authorization and Registry ports", async () => {
  const result = await checkServiceLayers(new URL("../services/decision-governance-service", import.meta.url).pathname);
  assert.deepEqual(result, { status: "PASS", requiredLayers: ["domain", "application", "ports", "adapters", "bootstrap"], missingLayers: [], violations: [] });
});

test("historical replay use cases depend on repository and downstream ports", async () => {
  const result = await checkServiceLayers(new URL("../services/historical-replay-worker", import.meta.url).pathname);
  assert.deepEqual(result, { status: "PASS", requiredLayers: ["domain", "application", "ports", "adapters", "bootstrap"], missingLayers: [], violations: [] });
});

test("Quant Research bootstrap delegates PostgreSQL access to repository adapters", async () => {
  const result = await checkServiceLayers(new URL("../services/quant-research-service", import.meta.url).pathname);
  assert.deepEqual(result, { status: "PASS", requiredLayers: ["domain", "application", "ports", "adapters", "bootstrap"], missingLayers: [], violations: [] });
});

test("layer check rejects adapters/framework dependencies in domain and application", async () => {
  const root = await mkdtemp(join(tmpdir(), "stockquant-layer-check-"));
  try {
    for (const layer of ["domain", "application", "ports", "adapters", "bootstrap"]) await mkdir(join(root, "src", layer), { recursive: true });
    await writeFile(join(root, "src", "domain", "entity.ts"), 'import { Controller } from "@nestjs/common";\n');
    await writeFile(join(root, "src", "application", "use-case.ts"), 'import { Repository } from "../adapters/repository.js";\n');
    await writeFile(join(root, "src", "adapters", "repository.ts"), 'import { Pool } from "pg";\n');
    const result = await checkServiceLayers(root);
    assert.equal(result.status, "INCOMPLETE");
    assert.deepEqual(result.violations.map(({ layer, rule }) => [layer, rule]), [
      ["domain", "NestJS framework imports"],
      ["application", "adapter imports"],
    ]);
  } finally { await rm(root, { recursive: true, force: true }); }
});

test("layer check reports a missing required architectural layer", async () => {
  const root = await mkdtemp(join(tmpdir(), "stockquant-layer-check-"));
  try {
    for (const layer of ["domain", "application", "adapters", "bootstrap"]) await mkdir(join(root, "src", layer), { recursive: true });
    const result = await checkServiceLayers(root);
    assert.equal(result.status, "INCOMPLETE");
    assert.deepEqual(result.missingLayers, ["ports"]);
  } finally { await rm(root, { recursive: true, force: true }); }
});

test("Quant Research layer check rejects direct PostgreSQL calls in bootstrap", async () => {
  const tempRoot = await mkdtemp(join(tmpdir(), "quant-research-layer-check-"));
  const root = join(tempRoot, "quant-research-service");
  try {
    await mkdir(root);
    for (const layer of ["domain", "application", "ports", "adapters", "bootstrap"]) await mkdir(join(root, "src", layer), { recursive: true });
    await writeFile(join(root, "src", "bootstrap", "main.ts"), 'const result = await pool.query("SELECT 1");\n');
    const result = await checkServiceLayers(root);
    assert.equal(result.status, "INCOMPLETE");
    assert.deepEqual(result.violations.map(({ layer, rule }) => [layer, rule]), [["bootstrap", "database access must be behind repository adapters"]]);
  } finally { await rm(tempRoot, { recursive: true, force: true }); }
});

test("Market Data layer check rejects outbound provider HTTP in bootstrap", async () => {
  const tempRoot = await mkdtemp(join(tmpdir(), "market-data-layer-check-"));
  const root = join(tempRoot, "market-data-service");
  try {
    for (const layer of ["domain", "application", "ports", "adapters", "bootstrap"]) await mkdir(join(root, "src", layer), { recursive: true });
    await writeFile(join(root, "src", "bootstrap", "main.ts"), 'const response = await fetch("https://provider.test/");\n');
    const result = await checkServiceLayers(root);
    assert.equal(result.status, "INCOMPLETE");
    assert.deepEqual(result.violations.map(({ layer, rule }) => [layer, rule]), [["bootstrap", "external source transport must be behind adapters"]]);
  } finally { await rm(tempRoot, { recursive: true, force: true }); }
});
