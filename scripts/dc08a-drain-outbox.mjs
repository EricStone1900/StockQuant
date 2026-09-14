import { mkdir, appendFile } from "node:fs/promises";
import { resolve } from "node:path";
import { spawnSync } from "node:child_process";

const compose = ["compose", "-f", "infra/compose/docker-compose.yml"];

function run(args) {
  const result = spawnSync("docker", args, { encoding: "utf8", stdio: ["pipe", "pipe", "pipe"] });
  if (result.status !== 0) throw new Error(result.stderr?.trim() || `docker command failed: ${args.join(" ")}`);
  return result.stdout ?? "";
}

export function parseOutboxRows(output) {
  const text = String(output).trim();
  if (!text) return [];
  return text.split("\n").map((line) => {
    const [eventId, eventKey, runId, eventType, payload, createdAt] = line.split("\t");
    return { eventId, eventKey, runId, eventType, payload: JSON.parse(payload), createdAt };
  });
}

export function markSentSql(eventIds) {
  if (!eventIds.length) return null;
  if (eventIds.some((id) => !/^[0-9a-f-]{36}$/i.test(id))) throw new Error("outbox event id is invalid");
  return `UPDATE market_data_collection_outbox SET sent_at=now() WHERE sent_at IS NULL AND event_id IN (${eventIds.map((id) => `'${id}'`).join(",")})`;
}

export async function drainCollectionOutbox({ subscriptionId = process.env.DC08A_SUBSCRIPTION_ID ?? "dc08a-20260914-short-v1", outputDir = process.env.DC08A_OUTPUT_DIR ?? "evidence/dc08a", query = (sql) => run([...compose, "exec", "-T", "postgres", "psql", "-U", "market_data", "-d", "market_data", "-At", "-F", "\t", "-c", sql]), append = appendFile, makeDir = mkdir } = {}) {
  if (!/^[a-z0-9-]+$/i.test(subscriptionId)) throw new Error("subscription id is invalid");
  const rows = parseOutboxRows(query(`SELECT o.event_id,o.event_key,o.run_id,o.event_type,o.payload,o.created_at FROM market_data_collection_outbox o JOIN market_data_collection_runs r ON r.run_id=o.run_id WHERE o.sent_at IS NULL AND r.subscription_id='${subscriptionId}' AND r.status <> 'CANCELLED' ORDER BY o.created_at LIMIT 100`));
  if (!rows.length) return { delivered: 0, path: null };
  const directory = resolve(outputDir);
  await makeDir(directory, { recursive: true });
  const path = resolve(directory, "collection-outbox-deliveries.jsonl");
  await append(path, `${rows.map((row) => JSON.stringify({ deliveredAt: new Date().toISOString(), sink: "LOCAL_AUDIT_EVIDENCE", ...row })).join("\n")}\n`);
  query(markSentSql(rows.map((row) => row.eventId)));
  return { subscriptionId, delivered: rows.length, path };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  try { console.log(JSON.stringify(await drainCollectionOutbox(), null, 2)); } catch (error) { console.error(JSON.stringify({ status: "FAILED", error: String(error) })); process.exitCode = 1; }
}
