import { createHash, randomBytes, randomUUID } from "node:crypto";
import { spawnSync } from "node:child_process";
import { chmod, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { writeUniqueEvidence } from "./unique-evidence.mjs";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const sourceFiles = [
  "scripts/test-isolated-cluster-paired-backup.mjs",
  "scripts/create-cluster-paired-backup.mjs",
  "scripts/cluster-paired-backup.mjs",
  "scripts/backup-retention.mjs",
  "scripts/unique-evidence.mjs",
  "infra/compose/postgres-init.sql",
];
const sourceSha256 = Object.fromEntries(await Promise.all(sourceFiles.map(async (path) => [path, createHash("sha256").update(await readFile(resolve(root, path))).digest("hex")] )));
const runId = randomUUID().replaceAll("-", "").slice(0, 16);
const artifactVolume = "research-artifacts-v1";
const helperImage = "node:24.1.0-slim";
const work = await mkdtemp(join(tmpdir(), `stockquant-paired-cluster-${runId}-`));
const project = work.split("/").at(-1);
const backupRoot = join(work, "backups");
await chmod(work, 0o700);
await (await import("node:fs/promises")).mkdir(backupRoot, { mode: 0o700 });

const passwords = Object.fromEntries([
  "PLATFORM_API", "PORTFOLIO_RISK", "TRADE_EXECUTION", "TRADE_EXECUTION_TEST", "HISTORICAL_REPLAY",
  "DECISION_GOVERNANCE", "QUANT_RESEARCH", "RESEARCH_AUTOMATION", "MARKET_DATA"
].map((service) => [`STOCKQUANT_DATABASE_PASSWORD_${service}`, randomBytes(24).toString("hex")]));
const environment = {
  ...process.env,
  ...passwords,
  STOCKQUANT_POSTGRES_SUPERUSER_PASSWORD: randomBytes(24).toString("hex"),
};
const composeEnvironment = { ...passwords, STOCKQUANT_POSTGRES_SUPERUSER_PASSWORD: environment.STOCKQUANT_POSTGRES_SUPERUSER_PASSWORD };
await writeFile(join(work, ".env"), `${Object.entries(composeEnvironment).map(([key, value]) => `${key}=${value}`).join("\n")}\n`, { mode: 0o600, flag: "wx" });
const quote = (value) => JSON.stringify(value);
const composeFile = join(work, "compose.yml");
const seedFile = join(work, "20-artifact-seed.sql");
const sqlString = (value) => `'${value.replaceAll("'", "''")}'`;
const model = Buffer.from("isolated-v1-paired-artifact\n");
const modelHash = createHash("sha256").update(model).digest("hex");
const testRunId = randomUUID();
const qlibTestRunId = randomUUID();
const accountId = randomUUID();
const orderId = randomUUID();
const fillId = randomUUID();
const outboxId = randomUUID();
const namespace = `v1-3-paired-backup-${testRunId}`;
const clientOrderId = `backup-${testRunId}`;
const artifactNamespace = `research/v1-paired-backup/${testRunId}/model`;
const artifactId = "weights.bin";
const artifactPath = `${artifactNamespace}/${modelHash}/${artifactId}`;
const qlibArtifactNamespace = `research/${qlibTestRunId}/qlib-fixture`;
const qlibArtifactPath = `${qlibArtifactNamespace}/${modelHash}/${modelHash}`;
const v14BacktestRunId = randomUUID();
const v14OwnerId = "paired-backup-owner";
const v14Assertions = [{ assertionId: "V1.4-BACKUP-001", status: "PASS", expected: { status: "COMPLETED" }, actual: { status: "COMPLETED" } }];
const v14Run = {
  testRunId: v14BacktestRunId,
  stageId: "V1.4",
  scenarioId: "normal",
  seed: 20261009,
  status: "COMPLETED",
  assertions: v14Assertions,
  evidence: {
    dataVersion: "v1.4-backup-fixture-v1",
    fixtureSha256: modelHash,
    codeVersion: "backup-fixture-code-v1",
    executionPolicy: { initialCashCents: 100_000, targetQuantity: 10, participationRateBasisPoints: 10_000, slippageBasisPoints: 0, fixedFeeCents: 0 },
    costModel: { modelId: "backup-fixture-cost-v1", currency: "CNY" },
  },
};
function canonicalJson(value) {
  if (value === null || typeof value !== "object") return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(canonicalJson).join(",")}]`;
  return `{${Object.entries(value).sort(([left], [right]) => left.localeCompare(right)).map(([key, item]) => `${JSON.stringify(key)}:${canonicalJson(item)}`).join(",")}}`;
}
const v14ResultSha256 = createHash("sha256").update(canonicalJson(v14Run)).digest("hex");
const v14Manifest = {
  backtestRunId: v14BacktestRunId,
  stageId: v14Run.stageId,
  scenarioId: v14Run.scenarioId,
  seed: v14Run.seed,
  status: v14Run.status,
  dataVersion: v14Run.evidence.dataVersion,
  fixtureSha256: v14Run.evidence.fixtureSha256,
  codeVersion: v14Run.evidence.codeVersion,
  executionPolicy: v14Run.evidence.executionPolicy,
  costModel: v14Run.evidence.costModel,
  resultSha256: v14ResultSha256,
};
const v14ManifestSha256 = createHash("sha256").update(canonicalJson(v14Manifest)).digest("hex");
const v14DurableReport = { resultSha256: v14ResultSha256, manifestSha256: v14ManifestSha256 };
const v14ReportPayload = { ...v14Run, durableReport: v14DurableReport };
const v14ReportArtifactRef = {
  schemaVersion: "artifact-ref.v1",
  artifactId: v14ResultSha256,
  testRunId: v14BacktestRunId,
  ownerId: v14OwnerId,
  kind: "BACKTEST_REPORT",
  namespace: `research/${v14BacktestRunId}/daily-backtest`,
  mediaType: "application/vnd.stockquant.v14-backtest-report+json",
  sha256: v14ResultSha256,
  status: "PUBLISHED",
  sourceRef: `quant-research-service:v1.4:${v14BacktestRunId}`,
};

const seedSql = String.raw`\connect platform_api
CREATE TABLE acceptance_stage_runs (
  test_run_id UUID PRIMARY KEY, stage_id TEXT NOT NULL, scenario_id TEXT NOT NULL,
  scenario_version TEXT NOT NULL, owner_id TEXT NOT NULL, namespace TEXT NOT NULL UNIQUE,
  status TEXT NOT NULL, seed INTEGER NOT NULL, assertions JSONB NOT NULL, evidence JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(), completed_at TIMESTAMPTZ
);
INSERT INTO acceptance_stage_runs(test_run_id,stage_id,scenario_id,scenario_version,owner_id,namespace,status,seed,assertions,evidence)
VALUES (${sqlString(testRunId)},'V1.3','normal','backup-fixture-v1','paired-backup-owner',${sqlString(namespace)},'WAITING',20261009,'[]'::jsonb,
  jsonb_build_object('testRunId',${sqlString(testRunId)},'evidenceScope','PAIRED_BACKUP_SYNTHETIC_BUSINESS_FACTS','brokerMode','FAKE'));
INSERT INTO acceptance_stage_runs(test_run_id,stage_id,scenario_id,scenario_version,owner_id,namespace,status,seed,assertions,evidence)
VALUES (${sqlString(qlibTestRunId)},'V1.2','normal','backup-fixture-v1','paired-backup-owner',${sqlString(`v1-2-paired-backup-${qlibTestRunId}`)},'COMPLETED',20261009,'[]'::jsonb,
  jsonb_build_object('testRunId',${sqlString(qlibTestRunId)},'evidenceScope','PAIRED_BACKUP_SYNTHETIC_QLIB_ARTIFACT'));
INSERT INTO acceptance_stage_runs(test_run_id,stage_id,scenario_id,scenario_version,owner_id,namespace,status,seed,assertions,evidence)
VALUES (${sqlString(v14BacktestRunId)},'V1.4','normal','1.1.0',${sqlString(v14OwnerId)},${sqlString(`v1-4-normal-${v14BacktestRunId}`)},'COMPLETED',${v14Run.seed},${sqlString(JSON.stringify(v14Assertions))}::jsonb,
  ${sqlString(JSON.stringify({ reportPayload: v14ReportPayload, reportArtifactRef: v14ReportArtifactRef, v14Task: { phase: "COMPLETED", quantBacktestRunId: v14BacktestRunId } }))}::jsonb);
CREATE TABLE qlib_fixture_artifacts (
  artifact_id CHAR(64) NOT NULL CHECK (artifact_id ~ '^[a-f0-9]{64}$'),
  test_run_id UUID NOT NULL REFERENCES acceptance_stage_runs(test_run_id) ON DELETE RESTRICT,
  owner_id TEXT NOT NULL,
  media_type TEXT NOT NULL CHECK (media_type='application/vnd.stockquant.qlib-fixture-model+json'),
  sha256 CHAR(64) NOT NULL CHECK (sha256 ~ '^[a-f0-9]{64}$'),
  payload JSONB,
  status TEXT NOT NULL DEFAULT 'PUBLISHED' CHECK (status IN ('PENDING','PUBLISHED','RETAINED','EXPIRED')),
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY(test_run_id, artifact_id)
);
INSERT INTO qlib_fixture_artifacts(artifact_id,test_run_id,owner_id,media_type,sha256,payload,status)
VALUES (${sqlString(modelHash)},${sqlString(qlibTestRunId)},'paired-backup-owner','application/vnd.stockquant.qlib-fixture-model+json',${sqlString(modelHash)},NULL,'PUBLISHED');
\connect quant_research
CREATE TABLE research_backtest_runs (
  backtest_run_id UUID PRIMARY KEY,
  stage_id TEXT NOT NULL CHECK (stage_id='V1.4'),
  scenario_id TEXT NOT NULL CHECK (scenario_id IN ('normal','rejection','recovery','market-restrictions','historical-fees','corporate-actions')),
  seed INTEGER NOT NULL CHECK (seed >= 0),
  status TEXT NOT NULL CHECK (status IN ('COMPLETED','FAILED')),
  result_payload JSONB NOT NULL,
  result_sha256 CHAR(64) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE TABLE research_backtest_manifests (
  backtest_run_id UUID PRIMARY KEY REFERENCES research_backtest_runs(backtest_run_id) ON DELETE RESTRICT,
  manifest_payload JSONB NOT NULL,
  manifest_sha256 CHAR(64) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
INSERT INTO research_backtest_runs(backtest_run_id,stage_id,scenario_id,seed,status,result_payload,result_sha256)
VALUES (${sqlString(v14BacktestRunId)},'V1.4','normal',${v14Run.seed},'COMPLETED',${sqlString(JSON.stringify(v14Run))}::jsonb,${sqlString(v14ResultSha256)});
INSERT INTO research_backtest_manifests(backtest_run_id,manifest_payload,manifest_sha256)
VALUES (${sqlString(v14BacktestRunId)},${sqlString(JSON.stringify(v14Manifest))}::jsonb,${sqlString(v14ManifestSha256)});
\connect portfolio_risk
CREATE TABLE accounts (
  account_id UUID PRIMARY KEY, namespace TEXT NOT NULL, test_run_id UUID NOT NULL, owner_id TEXT NOT NULL,
  fixture_account_ref TEXT NOT NULL, market TEXT NOT NULL, environment_mode TEXT NOT NULL, broker_mode TEXT NOT NULL,
  cash_amount NUMERIC(20,4) NOT NULL, currency CHAR(3) NOT NULL, initialization_key TEXT NOT NULL,
  input_hash CHAR(64) NOT NULL, ledger_version INTEGER NOT NULL DEFAULT 1, created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(namespace,initialization_key)
);
CREATE TABLE ledger_entries (
  entry_id UUID PRIMARY KEY, account_id UUID NOT NULL REFERENCES accounts(account_id), namespace TEXT NOT NULL,
  entry_type TEXT NOT NULL, amount NUMERIC(20,4) NOT NULL, currency CHAR(3) NOT NULL,
  effective_at TIMESTAMPTZ NOT NULL, source_ref TEXT NOT NULL, created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(account_id,source_ref)
);
CREATE TABLE account_positions (account_id UUID NOT NULL REFERENCES accounts(account_id),security TEXT NOT NULL,quantity BIGINT NOT NULL,updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),PRIMARY KEY(account_id,security));
CREATE TABLE recorded_fills (
  external_fill_id TEXT PRIMARY KEY,account_id UUID NOT NULL REFERENCES accounts(account_id),namespace TEXT NOT NULL,
  security TEXT NOT NULL,quantity BIGINT NOT NULL,price NUMERIC(20,4) NOT NULL,currency CHAR(3) NOT NULL,
  effective_at TIMESTAMPTZ NOT NULL,created_at TIMESTAMPTZ NOT NULL DEFAULT now(),fee NUMERIC(20,4) NOT NULL DEFAULT 0,
  original_fee NUMERIC(20,4),fee_revision INTEGER NOT NULL DEFAULT 0,side TEXT NOT NULL DEFAULT 'BUY',reservation_id UUID
);
INSERT INTO accounts(account_id,namespace,test_run_id,owner_id,fixture_account_ref,market,environment_mode,broker_mode,cash_amount,currency,initialization_key,input_hash,ledger_version)
VALUES (${sqlString(accountId)},${sqlString(namespace)},${sqlString(testRunId)},'paired-backup-owner','CN_A','CN_A','PAPER','FAKE',899.9,'CNY','paired-backup-init',${sqlString(modelHash)},3);
INSERT INTO ledger_entries(entry_id,account_id,namespace,entry_type,amount,currency,effective_at,source_ref) VALUES
(${sqlString(randomUUID())},${sqlString(accountId)},${sqlString(namespace)},'INITIAL_CASH',1000,'CNY','2026-10-09T09:30:00Z','paired-backup-init'),
(${sqlString(randomUUID())},${sqlString(accountId)},${sqlString(namespace)},'TRADE_FILL',-100.1,'CNY','2026-10-09T09:31:00Z',${sqlString(fillId)});
INSERT INTO account_positions(account_id,security,quantity) VALUES (${sqlString(accountId)},'600000.SH',10);
INSERT INTO recorded_fills(external_fill_id,account_id,namespace,security,quantity,price,currency,effective_at,fee,original_fee,side)
VALUES (${sqlString(fillId)},${sqlString(accountId)},${sqlString(namespace)},'600000.SH',10,10,'CNY','2026-10-09T09:31:00Z',0.1,0.1,'BUY');
\connect trade_execution
CREATE TABLE fake_broker_orders (
  order_id UUID PRIMARY KEY,namespace TEXT NOT NULL,account_id UUID NOT NULL,client_order_id TEXT NOT NULL,
  security TEXT NOT NULL,requested_quantity BIGINT NOT NULL,status TEXT NOT NULL,rejection_reason TEXT,
  request_fingerprint TEXT,cancel_prior_status TEXT,execution_context JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),UNIQUE(namespace,client_order_id)
);
CREATE TABLE fake_broker_fills (
  external_fill_id UUID PRIMARY KEY,order_id UUID NOT NULL REFERENCES fake_broker_orders(order_id),quantity BIGINT NOT NULL,
  price NUMERIC(20,4) NOT NULL,fee NUMERIC(20,4) NOT NULL DEFAULT 0,original_fee NUMERIC(20,4) NOT NULL,
  fee_revision INTEGER NOT NULL DEFAULT 0,effective_at TIMESTAMPTZ NOT NULL,broker_sequence BIGINT,report_fingerprint TEXT,UNIQUE(order_id)
);
CREATE TABLE fake_broker_outbox (
  event_id UUID PRIMARY KEY,order_id UUID NOT NULL REFERENCES fake_broker_orders(order_id),event_type TEXT NOT NULL,
  payload JSONB NOT NULL,status TEXT NOT NULL DEFAULT 'PENDING',attempts INTEGER NOT NULL DEFAULT 0,last_error TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),delivered_at TIMESTAMPTZ,claim_token UUID,lease_until TIMESTAMPTZ,
  UNIQUE(order_id,event_type)
);
INSERT INTO fake_broker_orders(order_id,namespace,account_id,client_order_id,security,requested_quantity,status,request_fingerprint)
VALUES (${sqlString(orderId)},${sqlString(namespace)},${sqlString(accountId)},${sqlString(clientOrderId)},'600000.SH',10,'FILLED',${sqlString(modelHash)});
INSERT INTO fake_broker_fills(external_fill_id,order_id,quantity,price,fee,original_fee,effective_at,broker_sequence)
VALUES (${sqlString(fillId)},${sqlString(orderId)},10,10,0.1,0.1,'2026-10-09T09:31:00Z',1);
INSERT INTO fake_broker_outbox(event_id,order_id,event_type,payload,status,attempts,delivered_at)
VALUES (${sqlString(outboxId)},${sqlString(orderId)},'FILL_POST',jsonb_build_object('testRunId',${sqlString(testRunId)},'externalFillId',${sqlString(fillId)}),'DELIVERED',1,'2026-10-09T09:31:01Z');
\connect research_automation
CREATE TABLE research_artifact_refs (namespace text NOT NULL, artifact_id text NOT NULL, sha256 text NOT NULL, status text NOT NULL);
INSERT INTO research_artifact_refs(namespace, artifact_id, sha256, status) VALUES (${sqlString(artifactNamespace)}, ${sqlString(artifactId)}, ${sqlString(modelHash)}, 'PUBLISHED');
`;
await writeFile(seedFile, seedSql, { mode: 0o600, flag: "wx" });
const initSql = resolve(root, "infra/compose/postgres-init.sql");
const compose = `services:\n  postgres:\n    image: postgres:16.9-alpine\n    environment:\n      POSTGRES_DB: postgres\n      POSTGRES_USER: postgres\n      POSTGRES_PASSWORD: \${STOCKQUANT_POSTGRES_SUPERUSER_PASSWORD:?required}\n${Object.keys(passwords).map((key) => `      ${key}: \${${key}:?required}\n`).join("")}    volumes:\n      - pg-data:/var/lib/postgresql/data\n      - ${quote(`${initSql}:/docker-entrypoint-initdb.d/10-init.sql:ro`)}\n      - ${quote(`${seedFile}:/docker-entrypoint-initdb.d/20-artifact-seed.sql:ro`)}\n    healthcheck:\n      test: [CMD-SHELL, pg_isready -U postgres -d postgres]\n      interval: 1s\n      timeout: 3s\n      retries: 60\nvolumes:\n  pg-data:\n  ${artifactVolume}:\n`;
await writeFile(composeFile, compose, { mode: 0o600, flag: "wx" });

const run = (command, args, options = {}) => {
  const result = spawnSync(command, args, { cwd: root, env: environment, encoding: "utf8", maxBuffer: 16 * 1024 * 1024, ...options });
  if (result.error) throw result.error;
  if (result.status !== 0) throw new Error(`${command} exited ${result.status}: ${(result.stderr ?? "").slice(-3000)}`);
  return (result.stdout ?? "").trim();
};
const composeArgs = ["compose", "-f", composeFile];
let stackStarted = false;
let backupResult;
try {
  stackStarted = true;
  run("docker", [...composeArgs, "up", "-d", "--wait"]);
  const postgresImageId = run("docker", ["image", "inspect", "postgres:16.9-alpine", "--format", "{{.Id}}"]);
  const backupHelperImageId = run("docker", ["image", "inspect", helperImage, "--format", "{{.Id}}"]);
  const volumeName = `${project}_${artifactVolume}`;
  const seedProgram = `const fs=await import('node:fs/promises'); const paths=['/data/${artifactPath}','/data/${qlibArtifactPath}']; for(const p of paths){await fs.mkdir(p.slice(0,p.lastIndexOf('/')),{recursive:true}); await fs.writeFile(p,Buffer.from('${model.toString("base64")}','base64'),{flag:'wx'});}`;
  run("docker", ["run", "--rm", "--pull", "never", "--network", "none", "--mount", `type=volume,src=${volumeName},dst=/data`, "--entrypoint", "node", helperImage, "-e", seedProgram]);
  const runArgs = [join(root, "scripts/create-cluster-paired-backup.mjs"), `--confirm-writes-quiesced=cluster/${volumeName}`, `--verify-business-run=${testRunId}`, `--verify-v14-backtest-run=${v14BacktestRunId}`];
  const outputWithV14 = run(process.execPath, runArgs, {
      env: {
        PATH: process.env.PATH ?? "/usr/bin:/bin",
        HOME: process.env.HOME ?? "/tmp",
        ...(process.env.DOCKER_CONFIG ? { DOCKER_CONFIG: process.env.DOCKER_CONFIG } : {}),
        STOCKQUANT_BACKUP_DIR: backupRoot,
        STOCKQUANT_BACKUP_ARTIFACT_VOLUME: volumeName,
        STOCKQUANT_BACKUP_COMPOSE_FILE: composeFile,
        STOCKQUANT_BACKUP_HELPER_IMAGE: helperImage,
      },
      timeout: 120_000,
  });
  backupResult = JSON.parse(outputWithV14);
  const manifestPath = join(backupResult.directory, "manifest.json");
  const manifest = JSON.parse(await readFile(manifestPath, "utf8"));
  const pairedBusinessRun = manifest.businessFactValidation;
  if (backupResult.status !== "PASS" || manifest.restoreValidation.publishedArtifactRefs !== 2 || !manifest.databaseInventory.databases.includes("research_automation") || !manifest.databaseInventory.databases.includes("platform_api")) throw new Error("isolated cluster paired backup did not verify the seeded Research and V1.2 Qlib ArtifactRefs");
  if (!pairedBusinessRun || pairedBusinessRun.testRunId !== testRunId || pairedBusinessRun.run.status !== "WAITING" || pairedBusinessRun.trade.orderId !== orderId || pairedBusinessRun.trade.fillId !== fillId || pairedBusinessRun.trade.outboxStatus !== "DELIVERED" || pairedBusinessRun.portfolio.accountId !== accountId || pairedBusinessRun.portfolio.ledgerEntryCount !== 2 || pairedBusinessRun.portfolio.fillId !== fillId || pairedBusinessRun.portfolio.positionQuantity !== 10) throw new Error("isolated paired backup did not restore the linked TestRun/order/fill/outbox/account/ledger business facts");
  const pairedV14Run = manifest.v14BacktestValidation;
  if (!pairedV14Run || pairedV14Run.backtestRunId !== v14BacktestRunId || pairedV14Run.testRunId !== v14BacktestRunId || pairedV14Run.ownerId !== v14OwnerId || pairedV14Run.resultSha256 !== v14ResultSha256 || pairedV14Run.manifestSha256 !== v14ManifestSha256 || !Object.values(pairedV14Run.relationChecks).every(Boolean)) throw new Error("isolated paired backup did not restore the linked V1.4 Quant BacktestRun/Manifest and Platform TestRun report projection");
  if (!manifest.databaseInventory.databases.includes("platform_api") || !manifest.databaseInventory.databases.includes("portfolio_risk") || !manifest.databaseInventory.databases.includes("trade_execution")) throw new Error("isolated V1 cluster backup is missing required service databases");
  run("docker", [...composeArgs, "down", "--volumes", "--remove-orphans"]);
  stackStarted = false;
  const remaining = [
    run("docker", ["ps", "--all", "--quiet", "--filter", `label=com.docker.compose.project=${project}`]),
    run("docker", ["network", "ls", "--quiet", "--filter", `label=com.docker.compose.project=${project}`]),
    run("docker", ["volume", "ls", "--quiet", "--filter", `label=com.docker.compose.project=${project}`]),
  ].filter(Boolean);
  if (remaining.length) throw new Error(`isolated project resources remain after cleanup: ${remaining.join(",")}`);
  const report = {
    schemaVersion: "stockquant.v1.isolated-cluster-paired-backup.v1",
    status: "PASS",
    scope: "isolated-test-only",
    composeProject: project,
    sourceDatabaseInventory: manifest.databaseInventory.databases,
    artifactVolume: volumeName,
    environment: { platform: process.platform, architecture: process.arch, nodeVersion: process.version, postgresImageId, backupHelperImageId },
    sourceSha256,
    seededPublishedArtifactRef: { namespace: artifactNamespace, artifactId, sha256: modelHash, restoredContentPath: artifactPath },
    seededV12QlibArtifactRef: { testRunId: qlibTestRunId, namespace: qlibArtifactNamespace, artifactId: modelHash, sha256: modelHash, restoredContentPath: qlibArtifactPath },
    pairedBusinessFacts: pairedBusinessRun,
    v14BacktestValidation: pairedV14Run,
    restoreValidation: manifest.restoreValidation,
    backupManifestSha256: createHash("sha256").update(await readFile(manifestPath)).digest("hex"),
    activeProjectOrVolumeTouched: false,
    exactProjectResourcesRemoved: true,
    realBrokerCalls: 0,
    externalSourceCalls: 0,
    at: new Date().toISOString(),
  };
  const date = new Date().toISOString().slice(0, 10);
  const evidence = writeUniqueEvidence(join(root, "evidence/audits"), `${date}-v1-isolated-cluster-paired-backup-${runId}.json`, `${JSON.stringify(report, null, 2)}\n`);
  process.stdout.write(`${JSON.stringify({ ...report, evidencePath: evidence.path.replace(`${root}/`, ""), evidenceSha256: evidence.sha256 })}\n`);
} finally {
  if (stackStarted) {
    try { run("docker", [...composeArgs, "down", "--volumes", "--remove-orphans"]); }
    catch (error) { process.stderr.write(`isolated Compose cleanup failed for ${project}: ${String(error)}\n`); process.exitCode = 1; }
  }
  await rm(work, { recursive: true, force: true });
}
