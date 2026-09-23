import { spawnSync } from "node:child_process";
import { composeArgs } from "./dc08a-supervise.mjs";

const STREAM = "SQPH5PERSIST";
const SUBJECT = "stockquant.phase5.persistence";
const PAYLOAD = "stockquant-phase5-persistence-smoke-v1";
const MESSAGE_ID = "stockquant-phase5-persistence-smoke-v1";

function clientScript(mode) {
  return `import { connect, headers, RetentionPolicy, StorageType } from "nats";
const mode = ${JSON.stringify(mode)};
const stream = ${JSON.stringify(STREAM)};
const subject = ${JSON.stringify(SUBJECT)};
const payload = ${JSON.stringify(PAYLOAD)};
const messageId = ${JSON.stringify(MESSAGE_ID)};
const nc = await connect({ servers: "nats://nats:4222", timeout: 3000 });
try {
  const jsm = await nc.jetstreamManager();
  if (mode === "publish") {
    try { await jsm.streams.info(stream); throw new Error("refusing to overwrite an existing smoke stream"); }
    catch (error) { if (!String(error).includes("stream not found")) throw error; }
    await jsm.streams.add({ name: stream, subjects: [subject], storage: StorageType.File, retention: RetentionPolicy.Limits, max_msgs: 1, max_bytes: 4096, max_age: 86400000000000 });
    const h = headers(); h.set("Nats-Msg-Id", messageId);
    const ack = await nc.jetstream().publish(subject, new TextEncoder().encode(payload), { headers: h });
    console.log(JSON.stringify({ mode, stream, seq: ack.seq, status: "PASS" }));
  } else if (mode === "verify") {
    const info = await jsm.streams.info(stream);
    const stored = await jsm.streams.getMessage(stream, { seq: 1 });
    const actual = new TextDecoder().decode(stored.data);
    if (info.state.messages !== 1 || stored.subject !== subject || actual !== payload) throw new Error("persisted stream payload does not match the fixed smoke record");
    console.log(JSON.stringify({ mode, stream, messages: info.state.messages, seq: stored.seq, payload: actual, status: "PASS" }));
  } else {
    const info = await jsm.streams.info(stream);
    const stored = await jsm.streams.getMessage(stream, { seq: 1 });
    const actual = new TextDecoder().decode(stored.data);
    if (info.state.messages !== 1 || stored.subject !== subject || actual !== payload) throw new Error("refusing to delete a stream that does not match this smoke test");
    await jsm.streams.delete(stream);
    console.log(JSON.stringify({ mode, stream, status: "CLEANED" }));
  }
} finally { await nc.drain(); }
`;
}

export function runNatsPersistenceSmoke(mode, command = (binary, args, input) => spawnSync(binary, args, {
  encoding: "utf8",
  input,
  timeout: 10_000,
  stdio: ["pipe", "pipe", "pipe"],
})) {
  if (!["publish", "verify", "cleanup"].includes(mode)) throw new Error("usage: nats-persistence-smoke.mjs publish|verify|cleanup");
  const result = command("docker", [...composeArgs, "exec", "-T", "-w", "/workspace/services/platform-api-service", "platform-api-service", "node", "--input-type=module"], clientScript(mode));
  if (result.error || result.status !== 0) throw new Error(result.error ? String(result.error) : result.stderr || `NATS ${mode} failed with exit code ${result.status}`);
  return JSON.parse(result.stdout.trim());
}

if (import.meta.url === `file://${process.argv[1]}`) {
  try {
    const result = runNatsPersistenceSmoke(process.argv[2]);
    console.log(JSON.stringify(result, null, 2));
  } catch (error) {
    console.error(JSON.stringify({ status: "FAIL", error: String(error) }));
    process.exitCode = 1;
  }
}
