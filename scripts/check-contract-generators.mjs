import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { listClientGenerators, validateGeneratorRegistration } from "./contract-generator-registration.mjs";

const root = resolve(new URL("..", import.meta.url).pathname);
const packageJson = JSON.parse(await readFile(resolve(root, "package.json"), "utf8"));
const generators = await listClientGenerators(resolve(root, "scripts"));
const { generateMissing, checkMissing } = validateGeneratorRegistration(
  generators,
  packageJson.scripts["contracts:generate"] ?? "",
  packageJson.scripts["contracts:check"] ?? "",
);
if (generateMissing.length || checkMissing.length) {
  throw new Error(`Contract client generators are not registered (generate: ${generateMissing.join(", ") || "none"}; check: ${checkMissing.join(", ") || "none"})`);
}
console.log(`Contract client generator registration checked: ${generators.length} generators are included in generation and drift checking`);
