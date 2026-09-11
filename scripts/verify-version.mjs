import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

const args = process.argv.slice(2);
const version = args[args.indexOf("--version") + 1];
const versions = {
  V1: "v1-local-simulation",
  V2: "v2-data-and-replay",
  V3: "v3-research-and-ubuntu",
};

if (!versions[version]) {
  console.error("usage: pnpm verify:version -- --version V1|V2|V3");
  process.exit(2);
}

const root = resolve(process.cwd(), "docs/prd", versions[version]);
const plan = await readFile(resolve(root, "00-version-plan.md"), "utf8");
const acceptance = await readFile(resolve(root, "99-acceptance.md"), "utf8");
const stageRows = [...plan.matchAll(/^\| \[(V\d+\.\d+)\][^|]*\|[^|]*\|[^|]*\| ([^|]+) \|$/gm)]
  .map((match) => ({ stageId: match[1], status: match[2].trim() }));

if (stageRows.length === 0) {
  console.error(`no stage rows found for ${version}`);
  process.exit(1);
}

const unresolved = stageRows.filter(({ status }) => !/^PASS(?:\s|\(|（|$)/.test(status));
const hasAcceptancePlaceholder = /待填写|NOT_RUN|FAIL|PARTIALLY_IMPLEMENTED/.test(acceptance);
const result = {
  version,
  status: unresolved.length === 0 && !hasAcceptancePlaceholder ? "PASS" : "NOT_PASS",
  stages: stageRows,
  unresolvedStages: unresolved,
  acceptancePlaceholders: hasAcceptancePlaceholder,
};

console.log(JSON.stringify(result, null, 2));
process.exit(result.status === "PASS" ? 0 : 1);
