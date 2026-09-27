import { useEffect, useMemo, useState } from "react";
import { createRoot } from "react-dom/client";
import type { V24ObservationRevisionList, V24PaperReadiness, V24PaperStageRunAccepted, V24PaperStageRunRequest, V24PaperStageRunResult } from "../../../packages/contracts/generated/types.js";
import "./styles.css";

type Scenario = { scenarioId: "normal" | "rejection" | "recovery"; version: string; title: string; expected: string };
type Assertion = { assertionId: string; status: "PASS" | "FAIL" | "WAITING"; expected: unknown; actual: unknown; evidence: Record<string, unknown> };
type TestRun = {
  testRunId: string;
  scenarioId: string;
  status: string;
  namespace: string;
  accountId: string | null;
  error: string | null;
  assertions: Assertion[];
};
type AccountDetail = {
  evidenceVersion: string;
  ownerId: string;
  mode: { environmentMode: string; brokerMode: string };
  account: { accountId: string; market: string; fixtureAccountRef: string; namespace: string; testRunId: string; cash: { amount: string; currency: string }; positionCount: number; ledgerEntryCount: number; ledgerVersion: number };
};
type V31Run = TestRun & { evidence?: Record<string, unknown> };
type V31PromotionGate = { stageStatus: "PASS" | "NOT_RUN"; humanAcceptance: "ACCEPTED" | "NOT_RUN"; evidenceSha256: string; acceptedAt?: string; acceptedBy?: string };

function parseCsvHeaders(line: string): string[] {
  const headers: string[] = []; let field = ""; let quoted = false;
  for (let index = 0; index < line.length; index += 1) {
    const character = line[index];
    if (quoted && character === '"' && line[index + 1] === '"') { field += '"'; index += 1; }
    else if (character === '"') quoted = !quoted;
    else if (character === "," && !quoted) { headers.push(field.trim()); field = ""; }
    else field += character;
  }
  headers.push(field.trim());
  return headers;
}

async function sha256Bytes(bytes: ArrayBuffer): Promise<string> {
  return [...new Uint8Array(await crypto.subtle.digest("SHA-256", bytes))].map((value) => value.toString(16).padStart(2, "0")).join("");
}

function base64Bytes(bytes: Uint8Array): string {
  let binary = "";
  for (let offset = 0; offset < bytes.length; offset += 0x8000) binary += String.fromCharCode(...bytes.subarray(offset, Math.min(offset + 0x8000, bytes.length)));
  return btoa(binary);
}

let sessionRequest: Promise<unknown> | null = null;
async function ensureSession() {
  sessionRequest ??= fetch("/api/v1/session", { credentials: "include" }).then(async (response) => {
    if (!response.ok) throw new Error(`${response.status} ${await response.text()}`);
    return response.json();
  });
  return sessionRequest;
}

async function api<T>(path: string, init?: RequestInit): Promise<T> {
  if (path !== "/api/v1/session") await ensureSession();
  const response = await fetch(path, { credentials: "include", headers: { "content-type": "application/json", ...(init?.headers ?? {}) }, ...init });
  if (!response.ok) throw new Error(`${response.status} ${await response.text()}`);
  return response.json() as Promise<T>;
}

function App() {
  const [scenarios, setScenarios] = useState<Scenario[]>([]);
  const [run, setRun] = useState<TestRun | null>(null);
  const [runId, setRunId] = useState(() => window.localStorage.getItem("stockquant:v11:testRunId") ?? "");
  const [account, setAccount] = useState<AccountDetail | null>(null);
  const [usAccount, setUsAccount] = useState<AccountDetail | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [capabilities, setCapabilities] = useState<{ brokerMode: string; liveTradingEnabled: boolean } | null>(null);

  const route = useMemo(() => window.location.pathname, []);
  if (route === "/acceptance/v1/v1.2") return <V12Acceptance />;
  if (route === "/acceptance/v1/v1.3") return <V13Acceptance />;
  if (route === "/acceptance/v1/v1.4") return <V14Acceptance />;
  if (route === "/acceptance/v1/v1.5") return <V15Acceptance />;
  if (route === "/acceptance/v2/v2.1") return <V21Acceptance />;
  if (route === "/acceptance/v2/v2.2") return <V22Acceptance />;
  if (route === "/acceptance/v2/v2.3") return <V23Acceptance />;
  if (route === "/acceptance/v2/v2.4") return <V24Acceptance />;
  if (route === "/acceptance/v2/v2.5") return <V25Acceptance />;
  if (route === "/acceptance/v3/v3.1") return <V31Acceptance />;
  if (route === "/acceptance/v3/v3.2") return <V32Acceptance />;
  if (route === "/acceptance/v3/v3.3") return <V33Acceptance />;
  if (route === "/acceptance/v2/dc06") return <Dc06Acceptance />;
  if (route === "/acceptance/v2/dc08") return <Dc08Acceptance />;
  const loadScenarios = async () => {
    const [nextScenarios, nextCapabilities] = await Promise.all([
      api<Scenario[]>("/api/v1/acceptance/v1/v1.1/scenarios"),
      api<{ brokerMode: string; liveTradingEnabled: boolean }>("/api/v1/capabilities")
    ]);
    setScenarios(nextScenarios);
    setCapabilities(nextCapabilities);
  };

  useEffect(() => {
    void (async () => {
      try {
        await api("/api/v1/session");
        await loadScenarios();
      } catch (cause) {
        setError(cause instanceof Error ? cause.message : "无法连接平台 API");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  useEffect(() => {
    if (!runId) return;
    void api<TestRun>(`/api/v1/acceptance/runs/${runId}`).then(setRun).catch((cause) => setError(String(cause)));
    const storedUsAccountId = window.localStorage.getItem("stockquant:v11:usAccountId");
    if (storedUsAccountId) void api<AccountDetail>(`/api/v1/accounts/${storedUsAccountId}`).then(setUsAccount).catch(() => window.localStorage.removeItem("stockquant:v11:usAccountId"));
  }, [runId]);

  useEffect(() => {
    if (!run || !["QUEUED", "RUNNING"].includes(run.status)) return;
    const timer = window.setInterval(() => {
      void api<TestRun>(`/api/v1/acceptance/runs/${run.testRunId}`).then(setRun).catch((cause) => setError(String(cause)));
    }, 500);
    return () => window.clearInterval(timer);
  }, [run]);

  useEffect(() => {
    if (!run?.accountId) {
      setAccount(null);
      return;
    }
    void api<AccountDetail>(`/api/v1/accounts/${run.accountId}`).then(setAccount).catch((cause) => setError(String(cause)));
  }, [run?.accountId]);

  const start = async (scenarioId: Scenario["scenarioId"]) => {
    setError(null);
    try {
      const accepted = await api<{ testRunId: string }>("/api/v1/acceptance/v1/v1.1/runs", {
        method: "POST",
        body: JSON.stringify({ scenarioId, seed: 20260907 })
      });
      window.localStorage.setItem("stockquant:v11:testRunId", accepted.testRunId);
      window.localStorage.removeItem("stockquant:v11:usAccountId");
      setRunId(accepted.testRunId);
      setUsAccount(null);
      setRun(await api<TestRun>(`/api/v1/acceptance/runs/${accepted.testRunId}`));
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "无法创建验收运行");
    }
  };

  const initializeUsAccount = async () => {
    if (!run) return;
    try {
      const detail = await api<AccountDetail>(`/api/v1/acceptance/runs/${run.testRunId}/accounts/us`, { method: "POST", body: "{}" });
      window.localStorage.setItem("stockquant:v11:usAccountId", detail.account.accountId);
      setUsAccount(detail);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "无法初始化 US 模拟账户");
    }
  };

  const continueRecovery = async () => {
    if (!run) return;
    await api(`/api/v1/acceptance/runs/${run.testRunId}/continue-recovery`, { method: "POST", body: "{}" });
    setRun(await api<TestRun>(`/api/v1/acceptance/runs/${run.testRunId}`));
  };

  if (route !== "/" && route !== "/acceptance/v1/v1.1") {
    return <main><h1>页面不存在</h1><a href="/acceptance/v1/v1.1">打开 V1.1 验收中心</a></main>;
  }

  return (
    <main>
      <header>
        <p className="eyebrow">StockQuant · 开发验收中心</p>
        <h1>V1.1 环境、账户初始化与 Web 验收中心</h1>
        <p>本页面仅操作隔离的 PAPER + FAKE 模拟账户；LIVE 与真实券商配置均被服务端拒绝。</p>
        {capabilities && <p className="mode">Broker: {capabilities.brokerMode} · LIVE: {String(capabilities.liveTradingEnabled)}</p>}
      </header>
      {loading && <p>正在载入验收能力…</p>}
      {error && <p role="alert" className="error">{error}</p>}
      <section aria-labelledby="scenarios-title">
        <h2 id="scenarios-title">验收场景</h2>
        <div className="cards">
          {scenarios.map((scenario) => <article key={scenario.scenarioId}>
            <h3>{scenario.title}</h3>
            <p>{scenario.expected}</p>
            <button onClick={() => void start(scenario.scenarioId)}>准备隔离运行：{scenario.scenarioId}</button>
          </article>)}
        </div>
      </section>
      <section aria-labelledby="run-title">
        <h2 id="run-title">当前运行与后端证据</h2>
        {!run && <p>尚未创建运行。每次点击场景都会创建新的 testRunId 和 namespace。</p>}
        {run && <>
          <dl>
            <dt>testRunId</dt><dd data-testid="test-run-id">{run.testRunId}</dd>
            <dt>状态</dt><dd data-testid="run-status">{run.status}</dd>
            <dt>namespace</dt><dd>{run.namespace}</dd>
            <dt>accountId</dt><dd>{run.accountId ?? "尚未创建"}</dd>
          </dl>
          {run.status === "WAITING" && <div className="waiting"><p>请按受控命令重启组合服务后，再继续验证原运行。</p><button onClick={() => void continueRecovery()}>重启后继续核对</button></div>}
          {run.error && <p role="alert" className="error">{run.error}</p>}
          <table>
            <thead><tr><th>断言</th><th>状态</th><th>预期</th><th>实际</th></tr></thead>
            <tbody>{run.assertions.map((assertion) => <tr key={assertion.assertionId}><td>{assertion.assertionId}</td><td>{assertion.status}</td><td><code>{JSON.stringify(assertion.expected)}</code></td><td><code>{JSON.stringify(assertion.actual)}</code></td></tr>)}</tbody>
          </table>
        </>}
      </section>
      {account && <section aria-labelledby="account-title">
        <h2 id="account-title">账户详情与账本证据</h2>
        <dl>
          <dt>accountId</dt><dd data-testid="account-detail-id">{account.account.accountId}</dd>
          <dt>市场</dt><dd data-testid="account-detail-market">{account.account.market}</dd>
          <dt>账户 Fixture</dt><dd>{account.account.fixtureAccountRef}</dd>
          <dt>现金</dt><dd data-testid="account-detail-cash">{account.account.cash.amount} {account.account.cash.currency}</dd>
          <dt>持仓数量</dt><dd data-testid="account-detail-positions">{account.account.positionCount}</dd>
          <dt>账本条目</dt><dd data-testid="account-detail-ledger">{account.account.ledgerEntryCount}</dd>
          <dt>账本版本</dt><dd>{account.account.ledgerVersion}</dd>
        </dl>
        <pre data-testid="account-detail-evidence">{JSON.stringify(account, null, 2)}</pre>
      </section>}
      {run && <section aria-labelledby="dual-account-title">
        <h2 id="dual-account-title">双市场模拟账户</h2>
        {!usAccount && <button onClick={() => void initializeUsAccount()}>初始化 US_EQUITY 账户</button>}
        {usAccount && <dl>
          <dt>US accountId</dt><dd data-testid="us-account-detail-id">{usAccount.account.accountId}</dd>
          <dt>市场</dt><dd data-testid="us-account-detail-market">{usAccount.account.market}</dd>
          <dt>现金</dt><dd data-testid="us-account-detail-cash">{usAccount.account.cash.amount} {usAccount.account.cash.currency}</dd>
          <dt>持仓数量</dt><dd>{usAccount.account.positionCount}</dd>
          <dt>账本条目</dt><dd>{usAccount.account.ledgerEntryCount}</dd>
        </dl>}
      </section>}
    </main>
  );
}

function V12Acceptance() {
  const [normal, setNormal] = useState<any>(null); const [bad, setBad] = useState<any>(null); const [probe, setProbe] = useState<any>(null); const [factor, setFactor] = useState<any>(null); const [rdagent, setRdagent] = useState<any>(null); const [error, setError] = useState<string | null>(null);
  const run = async (path: string, setter: (value: any)=>void) => { try { const response = await fetch(path, { credentials:"include" }); if (!response.ok) throw new Error(`${response.status}`); setter(await response.json()); } catch (cause) { setError(String(cause)); } };
  return <main><header><p className="eyebrow">StockQuant · 开发验收中心</p><h1>V1.2 小样本数据与 Qlib 环境探针</h1><p>FIXTURE / SIMULATION_ONLY；Qlib 探针未通过时不得伪称因子计算成功。</p></header>{error && <p role="alert" className="error">{error}</p>}<section><h2>数据导入与质量</h2><button onClick={()=>void run('/api/v1/acceptance/v1/v1.2/data/normal',setNormal)}>预览正常 Fixture</button><button onClick={()=>void run('/api/v1/acceptance/v1/v1.2/data/bad-future',setBad)}>预览未来数据拒绝样本</button>{normal && <pre data-testid="normal-preview">{JSON.stringify(normal,null,2)}</pre>}{bad && <pre data-testid="bad-preview">{JSON.stringify(bad,null,2)}</pre>}</section><section><h2>Qlib 与因子</h2><button onClick={()=>void run('/api/v1/acceptance/v1/v1.2/quant/probe',setProbe)}>运行 Qlib CPU 探针</button><button onClick={()=>void run('/api/v1/acceptance/v1/v1.2/quant/factors',setFactor)}>预览基础因子排名</button><button onClick={()=>void run('/api/v1/acceptance/v1/v1.2/quant/rdagent-probe',setRdagent)}>运行 RD-Agent 兼容探针</button>{probe && <pre data-testid="qlib-probe">{JSON.stringify(probe,null,2)}</pre>}{factor && <pre data-testid="factor-preview">{JSON.stringify(factor,null,2)}</pre>}{rdagent && <pre data-testid="rdagent-probe">{JSON.stringify(rdagent,null,2)}</pre>}</section></main>;
}

function V13Acceptance() {
  const [scenario, setScenario] = useState<string>("normal");
  const [run, setRun] = useState<any>(null); const [error, setError] = useState<string | null>(null);
  const start = async () => { try { setError(null); const accepted = await api<any>("/api/v1/acceptance/v1/v1.3/runs", { method: "POST", body: JSON.stringify({ scenarioId: scenario, seed: 20260907 }) }); setRun(await api<any>(`/api/v1/acceptance/v1/v1.3/runs/${accepted.testRunId}`)); } catch (cause) { setError(String(cause)); } };
  return <main><header><p className="eyebrow">StockQuant · 开发验收中心</p><h1>V1.3 治理、风控与模拟券商交易链路</h1><p>仅 PAPER + FAKE；所有订单、成交、余额和故障均由隔离模拟环境生成。</p></header>{error && <p role="alert" className="error">{error}</p>}<section><h2>场景</h2><select aria-label="验收场景" value={scenario} onChange={(event)=>setScenario(event.target.value)}><option value="normal">全成与不可变账本</option><option value="rejection">治理与风控拒绝</option><option value="recovery">UNKNOWN与重复成交恢复</option></select><button onClick={()=>void start()}>运行 V1.3 场景</button></section>{run && <section><h2>业务时间线与后端证据</h2><dl><dt>testRunId</dt><dd data-testid="v13-test-run-id">{run.testRunId}</dd><dt>状态</dt><dd data-testid="v13-run-status">{run.status}</dd><dt>账户</dt><dd>{run.evidence.accountId}</dd></dl><pre data-testid="v13-evidence">{JSON.stringify(run.evidence,null,2)}</pre><table><thead><tr><th>断言</th><th>状态</th><th>预期</th><th>实际</th></tr></thead><tbody>{run.assertions.map((item:any)=><tr key={item.assertionId}><td>{item.assertionId}</td><td>{item.status}</td><td><code>{JSON.stringify(item.expected)}</code></td><td><code>{JSON.stringify(item.actual)}</code></td></tr>)}</tbody></table></section>}</main>;
}

function V14Acceptance() {
  const [scenario, setScenario] = useState("normal"); const [run, setRun] = useState<any>(null); const [error, setError] = useState<string | null>(null);
  const start = async () => { try { setError(null); const accepted = await api<any>("/api/v1/acceptance/v1/v1.4/runs", { method: "POST", body: JSON.stringify({ scenarioId: scenario, seed: 20260907 }) }); setRun(await api<any>(`/api/v1/acceptance/v1/v1.4/runs/${accepted.testRunId}`)); } catch (cause) { setError(String(cause)); } };
  return <main><header><p className="eyebrow">StockQuant · 开发验收中心</p><h1>V1.4 日线历史回测与可核对报告</h1><p>DAILY_BAR / BACKTEST / FAKE；收盘信号最早下一交易时点成交。</p></header>{error && <p role="alert" className="error">{error}</p>}<section><h2>回测场景</h2><select aria-label="回测场景" value={scenario} onChange={(e)=>setScenario(e.target.value)}><option value="normal">日线回测与净值</option><option value="rejection">未来成交与公司行动拒绝</option><option value="recovery">取消与固定输入复跑</option></select><button onClick={()=>void start()}>运行回测</button></section>{run && <section><h2>回测报告</h2><dl><dt>testRunId</dt><dd data-testid="v14-test-run-id">{run.testRunId}</dd><dt>状态</dt><dd data-testid="v14-run-status">{run.status}</dd></dl><pre data-testid="v14-evidence">{JSON.stringify(run.evidence,null,2)}</pre><table><thead><tr><th>断言</th><th>状态</th></tr></thead><tbody>{run.assertions.map((a:any)=><tr key={a.assertionId}><td>{a.assertionId}</td><td>{a.status}</td></tr>)}</tbody></table></section>}</main>;
}

function V15Acceptance() { const [scenario, setScenario] = useState("normal"); const [run, setRun] = useState<any>(null); const [error, setError] = useState<string | null>(null); const start = async () => { try { setError(null); const a = await api<any>("/api/v1/acceptance/v1/v1.5/runs", { method: "POST", body: JSON.stringify({ scenarioId: scenario, seed: 20260907 }) }); setRun(await api<any>(`/api/v1/acceptance/v1/v1.5/runs/${a.testRunId}`)); } catch (e) { setError(String(e)); } }; return <main><header><p className="eyebrow">StockQuant · 开发验收中心</p><h1>V1.5 无人调度、故障恢复与 V1 验收</h1><p>后台工作流、日历调度、恢复与备份；订单仍为 PAPER + FAKE。</p></header>{error && <p role="alert" className="error">{error}</p>}<section><h2>调度场景</h2><select aria-label="调度场景" value={scenario} onChange={(e)=>setScenario(e.target.value)}><option value="normal">后台调度与 60 日 HOLD</option><option value="rejection">暂停与窗口拒绝</option><option value="recovery">Worker/总线与备份恢复</option></select><button onClick={()=>void start()}>运行 V1.5 场景</button></section>{run && <section><h2>恢复与全链路证据</h2><dl><dt>testRunId</dt><dd data-testid="v15-test-run-id">{run.testRunId}</dd><dt>状态</dt><dd data-testid="v15-run-status">{run.status}</dd></dl><pre data-testid="v15-evidence">{JSON.stringify(run.evidence,null,2)}</pre><table><thead><tr><th>断言</th><th>状态</th></tr></thead><tbody>{run.assertions.map((a:any)=><tr key={a.assertionId}><td>{a.assertionId}</td><td>{a.status}</td></tr>)}</tbody></table></section>}</main>; }

function V21Acceptance() {
  const storageKey = "stockquant:v21:testRunId";
  const basePath = "/api/v1/acceptance/v2/v2.1";
  const [data, setData] = useState<any>(null); const [error, setError] = useState<string | null>(null);
  const [runId, setRunId] = useState(() => window.localStorage.getItem(storageKey) ?? "");
  const load = async (path: string) => { try { setError(null); const r = await api<any>(path); setData((old: any) => ({ ...(old ?? {}), [path.split("/").pop()!]: r })); } catch (e) { setError(String(e)); } };
  const over = async () => { try { const securities = Array.from({ length: 101 }, (_, i) => `${String(600000 + i).padStart(6, "0")}.SH`); await api(`${basePath}/watchlist`, { method: "PUT", body: JSON.stringify({ securities }) }); } catch (e) { setError(String(e)); } };
  const run = async (scenarioId: string) => { try { setError(null); const accepted = await api<any>(`${basePath}/runs`, { method: "POST", body: JSON.stringify({ scenarioId, seed: 20260907 }) }); window.localStorage.setItem(storageKey, accepted.testRunId); setRunId(accepted.testRunId); const result = await api<any>(`${basePath}/runs/${accepted.testRunId}`); setData((old: any) => ({ ...(old ?? {}), run: result })); } catch (e) { setError(String(e)); } };
  useEffect(() => { if (!runId) return; void api<any>(`${basePath}/runs/${runId}`).then((result) => setData((old: any) => ({ ...(old ?? {}), run: result }))).catch((e) => { window.localStorage.removeItem(storageKey); setRunId(""); setError(String(e)); }); }, [runId]);
  return <main><header><p className="eyebrow">StockQuant · 开发验收中心</p><h1>V2.1 免费行情、新闻聚合与在线股票池</h1><p>真实来源能力与小样本验收；不触发交易。</p></header>{error && <p role="alert" className="error">{error}</p>}<section><h2>来源与股票池</h2><button onClick={()=>void load(`${basePath}/sources`)}>检查来源能力</button><button onClick={()=>void load(`${basePath}/sampling`)}>查看20/30分钟规则</button><button onClick={()=>void load(`${basePath}/watchlist`)}>查看股票池</button><button onClick={()=>void load(`${basePath}/quotes`)}>采集实时快照</button><button onClick={()=>void load(`${basePath}/news/live`)}>抓取实时新闻</button><button onClick={()=>void load(`${basePath}/news`)}>查看新闻去重样本</button><button onClick={()=>void over()}>提交101只并验证拒绝</button></section><section><h2>统一场景运行</h2><button onClick={()=>void run("normal")}>运行正常</button><button onClick={()=>void run("rejection")}>运行容量拒绝</button><button onClick={()=>void run("recovery")}>运行熔断恢复</button></section>{data?.run && <section aria-label="V2.1 持久运行"><h2>当前持久运行</h2><dl><dt>testRunId</dt><dd data-testid="v21-test-run-id">{data.run.testRunId}</dd><dt>状态</dt><dd data-testid="v21-run-status">{data.run.status}</dd></dl></section>}{data && <pre data-testid="v21-evidence">{JSON.stringify(data,null,2)}</pre>}</main>; }

function V22Acceptance() {
  const storageKey = "stockquant:v22:testRunId";
  const uploadStorageKey = "stockquant:v22:csvUpload";
  const basePath = "/api/v1/acceptance/v2/v2.2";
  const [data, setData] = useState<any>(null); const [error, setError] = useState<string | null>(null);
  const [runId, setRunId] = useState(() => window.localStorage.getItem(storageKey) ?? "");
  const [csvFile, setCsvFile] = useState<File | null>(null); const [csvContent, setCsvContent] = useState(""); const [csvHeaders, setCsvHeaders] = useState<string[]>([]); const [csvMapping, setCsvMapping] = useState<Record<string, string>>({});
  const [csvFrequency, setCsvFrequency] = useState<"1m" | "5m">("1m");
  const [csvTimestampSemantics, setCsvTimestampSemantics] = useState<"BAR_START" | "BAR_END">("BAR_START");
  const [uploadSession, setUploadSession] = useState<{ uploadId: string; expectedSha256: string; metadataSha256: string; mapping?: Record<string, string>; provenance?: typeof csvProvenance; frequency?: "1m" | "5m"; timestampSemantics?: "BAR_START" | "BAR_END"; fileFormat?: "CSV" | "PARQUET" } | null>(() => { try { const value = window.localStorage.getItem(uploadStorageKey); return value ? JSON.parse(value) : null; } catch { return null; } });
  const [csvProvenance, setCsvProvenance] = useState({ sourceName: "", sourceReference: "", licenseStatement: "", licenseVerification: "UNCONFIRMED" as "OPERATOR_CONFIRMED" | "UNCONFIRMED", acquiredAt: "" });
  const load = async (path: string, body?: any) => { try { setError(null); const r = await api<any>(path, body ? { method: "POST", body: JSON.stringify(body) } : undefined); setData((old: any) => ({ ...(old ?? {}), [path.split("/").pop()!]: r })); } catch (e) { setError(String(e)); } };
  const csvFields = ["securityId", "timestamp", "open", "high", "low", "close", "volume", "amount"];
  const uploadCsv = async (action: "preview" | "import") => {
    try {
      setError(null);
      const provenance = { ...csvProvenance, sourceName: csvProvenance.sourceName.trim(), sourceReference: csvProvenance.sourceReference.trim() || null, licenseStatement: csvProvenance.licenseStatement.trim(), acquiredAt: new Date(csvProvenance.acquiredAt).toISOString() };
      const semantics = { market: "CN_A", frequency: csvFrequency, adjustment: "RAW", timezone: "Asia/Shanghai", timestampSemantics: csvTimestampSemantics, volumeUnit: "SHARES", amountUnit: "CNY" };
      const fileFormat = csvFile?.name.toLowerCase().endsWith(".parquet") ? "PARQUET" : "CSV";
      const metadata = { fileFormat, mapping: csvMapping, provenance, ...semantics };
      if (!csvFile || (fileFormat === "CSV" && csvFile.size <= 700_000)) {
        const result = await api<any>(`${basePath}/csv/${action}`, { method: "POST", body: JSON.stringify({ content: csvContent, ...metadata }) });
        setData((old: any) => ({ ...(old ?? {}), csv: result })); return;
      }
      if (csvFile.size > 64 * 1024 * 1024) throw new Error("分钟文件超过 64 MiB 上传上限");
      const expectedSha256 = await sha256Bytes(await csvFile.arrayBuffer());
      const metadataSha256 = await sha256Bytes(new TextEncoder().encode(JSON.stringify(metadata)).buffer);
      let session = uploadSession;
      if (session && (session.expectedSha256 !== expectedSha256 || session.metadataSha256 !== metadataSha256)) {
        await api(`${basePath}/${session.fileFormat?.toLowerCase() ?? "csv"}/uploads/${session.uploadId}/cancel`, { method: "POST", body: "{}" }).catch(() => undefined);
        session = null; setUploadSession(null); window.localStorage.removeItem(uploadStorageKey);
      }
      if (!session) {
        session = { uploadId: crypto.randomUUID(), expectedSha256, metadataSha256, mapping: csvMapping, provenance: csvProvenance, frequency: csvFrequency, timestampSemantics: csvTimestampSemantics, fileFormat };
        setUploadSession(session); window.localStorage.setItem(uploadStorageKey, JSON.stringify(session));
      }
      const created = await api<any>(`${basePath}/${fileFormat.toLowerCase()}/uploads`, { method: "POST", body: JSON.stringify({ uploadId: session.uploadId, expectedSha256, expectedBytes: csvFile.size, metadata }) });
      const progress = await api<any>(`${basePath}/${fileFormat.toLowerCase()}/uploads/${session.uploadId}`);
      for (let index = 0; index < created.expectedChunks; index += 1) {
        if (progress.receivedChunks.includes(index)) continue;
        const chunk = new Uint8Array(await csvFile.slice(index * 512 * 1024, Math.min((index + 1) * 512 * 1024, csvFile.size)).arrayBuffer());
        const sha256 = await sha256Bytes(chunk.buffer.slice(chunk.byteOffset, chunk.byteOffset + chunk.byteLength));
        await api(`${basePath}/${fileFormat.toLowerCase()}/uploads/${session.uploadId}/chunks/${index}`, { method: "PUT", body: JSON.stringify({ contentBase64: base64Bytes(chunk), sha256 }) });
      }
      const result = await api<any>(`${basePath}/${fileFormat.toLowerCase()}/uploads/${session.uploadId}/${action === "preview" ? "preview" : "finalize"}`, { method: "POST", body: "{}" });
      setData((old: any) => ({ ...(old ?? {}), csv: result }));
      if (action === "import") { setUploadSession(null); window.localStorage.removeItem(uploadStorageKey); }
    } catch (e) { setError(String(e)); }
  };
  const cancelCsvUpload = async () => { if (!uploadSession) return; try { const result = await api<any>(`${basePath}/${uploadSession.fileFormat?.toLowerCase() ?? "csv"}/uploads/${uploadSession.uploadId}/cancel`, { method: "POST", body: "{}" }); setData((old: any) => ({ ...(old ?? {}), csvUpload: result })); setUploadSession(null); window.localStorage.removeItem(uploadStorageKey); } catch (e) { setError(String(e)); } };
  const run = async (scenarioId: string, uploadId?: string, fileFormat: "CSV" | "PARQUET" = "CSV") => { try { setError(null); const accepted = await api<any>(`${basePath}/runs`, { method: "POST", body: JSON.stringify({ scenarioId, seed: 20260907, ...(uploadId ? { uploadId, fileFormat } : {}) }) }); window.localStorage.setItem(storageKey, accepted.testRunId); setRunId(accepted.testRunId); const result = await api<any>(`${basePath}/runs/${accepted.testRunId}`); setData((old: any) => ({ ...(old ?? {}), run: result })); } catch (e) { setError(String(e)); } };
  useEffect(() => { if (!runId) return; void api<any>(`${basePath}/runs/${runId}`).then((result) => setData((old: any) => ({ ...(old ?? {}), run: result }))).catch((e) => { window.localStorage.removeItem(storageKey); setRunId(""); setError(String(e)); }); }, [runId]);
  return <main><header><p className="eyebrow">StockQuant · 开发验收中心</p><h1>V2.2 历史分钟数据导入与校验</h1><p>CN分钟Fixture与分块 CSV/Parquet 上传，支持 1m/5m 与显式时间戳语义；不触发交易。</p></header>{error && <p role="alert" className="error">{error}</p>}<section><h2>导入与预览</h2><button onClick={()=>void load(`${basePath}/preview`)}>预览分钟数据</button><button onClick={()=>void load(`${basePath}/import`, { fixture: "normal" })}>导入正常文件</button><button onClick={()=>void load(`${basePath}/import`, { fixture: "bad" })}>导入坏文件并拒绝</button></section><section><h2>分钟文件上传</h2><label>分钟频率 <select aria-label="分钟频率" value={csvFrequency} onChange={(event)=>{setCsvFrequency(event.target.value as "1m"|"5m");setData((old:any)=>({...old,csv:null}));}}><option value="1m">1分钟</option><option value="5m">5分钟</option></select></label><label>时间戳语义 <select aria-label="时间戳语义" value={csvTimestampSemantics} onChange={(event)=>{setCsvTimestampSemantics(event.target.value as "BAR_START"|"BAR_END");setData((old:any)=>({...old,csv:null}));}}><option value="BAR_START">源时间代表bar开始</option><option value="BAR_END">源时间代表bar结束</option></select></label><p>支持 CSV 与 Parquet 列映射；仅限 CN_A、1分钟或5分钟、RAW；按上海时区解释时间戳，成交量单位为股、成交额单位为人民币；最多64 MiB/100000行，每块512 KiB；分块预览最多显示100条Bar样本，并用barsTruncated提示，错误明细保持完整。时间戳支持上海本地 YYYY-MM-DD HH:mm 与 BaoStock YYYYMMDDHHmmssSSS 格式。</p><label>CSV 或 Parquet 文件 <input type="file" accept=".csv,text/csv,.parquet,application/vnd.apache.parquet" onChange={async (event)=>{const file=event.currentTarget.files?.[0]; if(!file)return; if(file.size>64*1024*1024){setError("分钟文件超过64 MiB限制");return;} const isParquet=file.name.toLowerCase().endsWith(".parquet"); const headerText=isParquet?"":await file.slice(0,128*1024).text(); const content=!isParquet&&file.size<=700_000?await file.text():""; const firstLine=headerText.replace(/^\uFEFF/,"").split(/\r?\n/,1)[0]??""; const headers=isParquet?[...csvFields]:parseCsvHeaders(firstLine); const savedSha=uploadSession&&(file.size>700_000||isParquet)?await sha256Bytes(await file.arrayBuffer()):null; const canResume=Boolean(uploadSession&&savedSha===uploadSession.expectedSha256&&uploadSession.mapping&&uploadSession.provenance&&uploadSession.fileFormat===(isParquet?"PARQUET":"CSV")); const defaultMapping=Object.fromEntries(csvFields.map((field)=>[field,isParquet?field:headers.find((header)=>header.toLowerCase()===field.toLowerCase())??headers[0]??""])); setCsvFile(file); setCsvContent(content); setCsvHeaders(headers); setCsvMapping(canResume?uploadSession!.mapping!:defaultMapping); if(canResume){setCsvProvenance(uploadSession!.provenance!);setCsvFrequency(uploadSession!.frequency??"1m");setCsvTimestampSemantics(uploadSession!.timestampSemantics??"BAR_START");} setData((old:any)=>({...old,csv:null}));}} /></label>{csvHeaders.length>0 && <><p>选择 CSV 源列，或填写 Parquet 源列名；每个目标字段必须对应一个不同的源列：</p>{csvFields.map((field)=><label key={field}>{field}{csvFile?.name.toLowerCase().endsWith(".parquet")?<input aria-label={`${field} Parquet 源列名`} value={csvMapping[field]??""} onChange={(event)=>{setCsvMapping((old)=>({...old,[field]:event.target.value}));setData((old:any)=>({...old,csv:null}));}} />:<select aria-label={`${field} CSV 源列`} value={csvMapping[field]??""} onChange={(event)=>{setCsvMapping((old)=>({...old,[field]:event.target.value}));setData((old:any)=>({...old,csv:null}));}}>{csvHeaders.map((header)=><option key={header} value={header}>{header}</option>)}</select>}</label>)}<h3>数据来源与许可</h3><label>数据来源名称 <input value={csvProvenance.sourceName} onChange={(event)=>{setCsvProvenance((old)=>({...old,sourceName:event.target.value}));setData((old:any)=>({...old,csv:null}));}} /></label><label>来源链接或引用（可留空） <input value={csvProvenance.sourceReference} onChange={(event)=>{setCsvProvenance((old)=>({...old,sourceReference:event.target.value}));setData((old:any)=>({...old,csv:null}));}} /></label><label>许可声明 <input value={csvProvenance.licenseStatement} onChange={(event)=>{setCsvProvenance((old)=>({...old,licenseStatement:event.target.value}));setData((old:any)=>({...old,csv:null}));}} /></label><label>取得时间 <input type="datetime-local" value={csvProvenance.acquiredAt} onChange={(event)=>{setCsvProvenance((old)=>({...old,acquiredAt:event.target.value}));setData((old:any)=>({...old,csv:null}));}} /></label><label><input type="checkbox" checked={csvProvenance.licenseVerification==="OPERATOR_CONFIRMED"} onChange={(event)=>{setCsvProvenance((old)=>({...old,licenseVerification:event.target.checked?"OPERATOR_CONFIRMED":"UNCONFIRMED"}));setData((old:any)=>({...old,csv:null}));}} /> 我确认已核对许可允许研究使用（这是操作者声明，不代表系统完成法律审查）</label><p>许可未确认的导入仍会保留来源记录，但会标记为不可用于研究。</p><button disabled={!csvFile||!csvProvenance.sourceName.trim()||!csvProvenance.licenseStatement.trim()||!csvProvenance.acquiredAt} onClick={()=>void uploadCsv("preview")}>上传并预览</button><button disabled={!data?.csv||data.csv.errors?.length>0||data.csv.acceptedRows===0} onClick={()=>void uploadCsv("import")}>确认并导入</button>{data?.csv?.uploadId&&data.csv.status==="PUBLISHED"&&<button data-testid="v22-record-upload-run" onClick={()=>void run("uploaded-csv",data.csv.uploadId,csvFile?.name.toLowerCase().endsWith(".parquet")?"PARQUET":"CSV")}>将此文件导入记入验收运行</button>}{uploadSession&&<button onClick={()=>void cancelCsvUpload()}>取消此上传并释放配额</button>}</>}</section><section><h2>统一场景运行</h2><button onClick={()=>void run("normal")}>运行正常</button><button onClick={()=>void run("rejection")}>运行质量拒绝</button><button onClick={()=>void run("recovery")}>运行重复幂等</button></section>{data?.run && <section aria-label="V2.2 持久运行"><h2>当前持久运行</h2><dl><dt>testRunId</dt><dd data-testid="v22-test-run-id">{data.run.testRunId}</dd><dt>状态</dt><dd data-testid="v22-run-status">{data.run.status}</dd></dl></section>}{data && <pre data-testid="v22-evidence">{JSON.stringify(data,null,2)}</pre>}</main>; }

function V23Acceptance() { const [data, setData] = useState<any>(null); const [error, setError] = useState<string | null>(null); const load = async (path: string) => { try { setError(null); const preview = await api<any>(path); setData((old: any) => ({ ...(old ?? {}), preview })); } catch (e) { setError(String(e)); } }; const run = async (scenarioId: string, defer = false) => { try { setError(null); const accepted = await api<any>("/api/v1/acceptance/v2/v2.3/runs", { method: "POST", body: JSON.stringify({ scenarioId, seed: 20260907, defer }) }); const result = defer ? accepted : await api<any>(`/api/v1/acceptance/v2/v2.3/runs/${accepted.testRunId}`); setData((old: any) => ({ ...(old ?? {}), run: result })); } catch (e) { setError(String(e)); } }; const worker = async (action?: string) => { const id = data?.run?.testRunId; if (!id) return; try { setError(null); const path = action ? `/api/v1/acceptance/v2/v2.3/runs/${id}/worker/${action}` : `/api/v1/acceptance/v2/v2.3/runs/${id}/worker`; const result = await api<any>(path, action ? { method: "POST", body: "{}" } : undefined); setData((old: any) => ({ ...(old ?? {}), worker: result })); } catch (e) { setError(String(e)); } }; const research = data?.run?.evidence?.crossService?.research; return <main><header><p className="eyebrow">StockQuant · 开发验收中心</p><h1>V2.3 日频决策、分钟撮合与历史事件回放</h1><p>MINUTE_BAR / BACKTEST / FAKE；虚拟时钟、确定性事件屏障、检查点恢复与 Qlib 研究 Artifact。</p></header>{error && <p role="alert" className="error">{error}</p>}<section><h2>回放数据</h2><button onClick={()=>void load("/api/v1/acceptance/v2/v2.3/preview")}>预览回放数据</button></section><section><h2>统一场景运行</h2><button onClick={()=>void run("normal")}>运行正常回放</button><button onClick={()=>void run("rejection")}>运行未来信息拒绝</button><button onClick={()=>void run("recovery")}>运行检查点恢复</button><button onClick={()=>void run("normal", true)}>启动可暂停长回放</button></section>{data?.run && <section><h2>Worker 生命周期</h2><button onClick={()=>void worker()}>查询状态</button><button onClick={()=>void worker("pause")}>暂停</button><button onClick={()=>void worker("resume")}>恢复</button><button onClick={()=>void worker("cancel")}>取消</button>{data.worker && <pre data-testid="v23-worker-status">{JSON.stringify(data.worker,null,2)}</pre>}</section>}{research && <section><h2>量化研究 Artifact</h2><p data-testid="v23-research-status">{research.status} · {research.adapter} · {research.dataMode} · modelCalls={research.modelCalls}</p><code data-testid="v23-research-hash">{research.artifactHash}</code></section>}{data && <pre data-testid="v23-evidence">{JSON.stringify(data,null,2)}</pre>}</main>; }

function V24Acceptance() {
  const [data, setData] = useState<any>(null); const [error, setError] = useState<string | null>(null);
  const [observations, setObservations] = useState<Array<{ observationDate: string; testRunId: string | null; reconciliationStatus: string; errors: string[] }>>([]);
  const [revisionData, setRevisionData] = useState<V24ObservationRevisionList | null>(null);
  const [paperReadiness, setPaperReadiness] = useState<V24PaperReadiness | null>(null);
  const call = async (path: string, init?: RequestInit) => { try { setError(null); setData(await api<any>(path, init)); } catch (e) { setError(String(e)); } };
  const loadObservations = async () => { try { setError(null); setObservations(await api<Array<{ observationDate: string; testRunId: string | null; reconciliationStatus: string; errors: string[] }>>("/api/v1/acceptance/v2/v2.4/observations")); } catch (e) { setError(String(e)); } };
  const loadRevisions = async (testRunId: string) => { try { setError(null); setRevisionData(await api<V24ObservationRevisionList>(`/api/v1/acceptance/v2/v2.4/runs/${testRunId}/revisions`)); } catch (e) { setError(String(e)); } };
  const loadPaperReadiness = async () => { try { setError(null); setPaperReadiness(await api<V24PaperReadiness>("/api/v1/acceptance/v2/v2.4/paper-readiness?market=CN_A")); } catch (e) { setError(String(e)); } };
  const run = async (scenarioId: V24PaperStageRunRequest["scenarioId"]) => { try { setError(null); setRevisionData(null); const request: V24PaperStageRunRequest = { scenarioId, seed: 20260907 }; const accepted = await api<V24PaperStageRunAccepted>("/api/v1/acceptance/v2/v2.4/runs", { method: "POST", body: JSON.stringify(request) }); const result = await api<V24PaperStageRunResult>(`/api/v1/acceptance/v2/v2.4/runs/${accepted.testRunId}`); setData(result); } catch (e) { setError(String(e)); } };
  const summary = data?.targetDays !== undefined && data?.countedDays !== undefined ? data : null;
  const policyReadiness = paperReadiness?.policyReadiness;
  const mandateReadiness = paperReadiness?.mandateReadiness;
  return <main><header><p className="eyebrow">StockQuant · 开发验收中心</p><h1>V2.4 真实时钟下持续模拟交易</h1><p data-testid="v24-mode">PAPER / NOT_CONNECTED / FAKE；Mandate 仍为 PREPARATION_ONLY，LIVE 激活关闭。未接通的场景会显示 WAITING，不生成模拟成交证据。</p></header>{error && <p role="alert" className="error">{error}</p>}<section><h2>运行配置</h2><button onClick={()=>void loadPaperReadiness()}>检查 Paper 就绪门禁</button><button onClick={()=>void call("/api/v1/acceptance/v2/v2.4/preview")}>查看采样与执行窗口</button><button onClick={()=>void call("/api/v1/acceptance/v2/v2.4/scheduler/status")}>查看调度状态</button><button onClick={()=>void call("/api/v1/acceptance/v2/v2.4/observation-summary")}>查看日终观察进度</button><button onClick={()=>void loadObservations()}>查看观察记录</button><button onClick={()=>void call("/api/v1/acceptance/v2/v2.4/scheduler/start", { method: "POST", body: "{}" })}>启动调度</button><button onClick={()=>void call("/api/v1/acceptance/v2/v2.4/scheduler/tick", { method: "POST", body: "{}" })}>执行一次采样 Tick</button><button onClick={()=>void call("/api/v1/acceptance/v2/v2.4/scheduler/stop", { method: "POST" })}>停止调度</button><button onClick={()=>void run("normal")}>检查正常路径前置</button><button onClick={()=>void run("rejection")}>检查拒绝路径前置</button><button onClick={()=>void run("recovery")}>检查恢复路径前置</button></section>{paperReadiness && <section aria-label="Paper 就绪门禁"><h2>Paper 就绪门禁</h2><p data-testid="v24-paper-readiness">{paperReadiness.market} · {paperReadiness.status} · {paperReadiness.environmentMode}/{paperReadiness.brokerMode}</p><p>策略：{policyReadiness?.status}；Mandate：{mandateReadiness?.status}</p><p>风控：{paperReadiness.riskEvaluation.status}；资源预留：{paperReadiness.resourceReservation.status}；下单：{paperReadiness.orderSubmissionEnabled ? "开启" : "关闭"}</p><p>LIVE：{paperReadiness.liveTradingEnabled ? "开启" : "关闭"}</p></section>}{summary && <section aria-label="日终观察汇总"><h2>日终观察汇总</h2><dl><dt>有效日终观察</dt><dd data-testid="v24-observed-days">{summary.countedDays}/{summary.targetDays}</dd><dt>剩余观察日</dt><dd data-testid="v24-remaining-days">{summary.remainingDays}</dd><dt>状态</dt><dd data-testid="v24-observation-status">{summary.status}</dd></dl></section>}{observations.length > 0 && <section aria-label="观察运行历史"><h2>观察运行历史</h2><ul>{observations.filter((item) => item.testRunId).map((item) => <li key={item.testRunId} data-testid={`v24-observation-run-${item.testRunId}`}>{item.observationDate} · {item.reconciliationStatus} · {item.errors.length} 个错误 <button onClick={() => void loadRevisions(item.testRunId!)}>查看 {item.observationDate} 修订历史</button></li>)}</ul></section>}{revisionData && <section aria-label="观察证据修订历史"><h2>观察证据修订历史</h2><p>TestRun：{revisionData.testRunId}；修订数：{revisionData.revisions.length}</p>{revisionData.revisions.length === 0 ? <p>此运行没有历史修订。</p> : revisionData.revisions.map((revision) => <article key={revision.revisionId}><h3>修订 {revision.revisionId} · {revision.reason}</h3><p>原状态：{revision.priorStatus}；记录时间：{revision.recordedAt}</p><pre>{JSON.stringify({ assertions: revision.priorAssertions, evidence: revision.priorEvidence }, null, 2)}</pre></article>)}</section>}{data && <pre data-testid="v24-evidence">{JSON.stringify(data,null,2)}</pre>}</main>; }

function V25Acceptance() { const [data, setData] = useState<any>(null); const [error, setError] = useState<string | null>(null); const call = async (path: string, init?: RequestInit) => { try { setError(null); setData(await api<any>(path, init)); } catch (e) { setError(String(e)); } }; const run = async (scenarioId: string) => { try { setError(null); const accepted = await api<any>("/api/v1/acceptance/v2/v2.5/runs", { method: "POST", body: JSON.stringify({ scenarioId, seed: 20260907 }) }); setData(await api<any>(`/api/v1/acceptance/v2/v2.5/runs/${accepted.testRunId}`)); } catch (e) { setError(String(e)); } }; return <main><header><p className="eyebrow">StockQuant · 开发验收中心</p><h1>V2.5 历史数据扩容与 V2 验收</h1><p>20只 × 60交易日扩容档；BACKTEST / FIXTURE / FAKE。V2.4 20日观察门禁仍待完成。</p></header>{error && <p role="alert" className="error">{error}</p>}<section><h2>扩容与资源</h2><button onClick={()=>void call("/api/v1/acceptance/v2/v2.5/preview")}>查看扩容档与预算</button><button onClick={()=>void run("normal")}>运行扩容与模型验证</button><button onClick={()=>void run("rejection")}>运行资源/缓存拒绝</button><button onClick={()=>void run("recovery")}>运行任务恢复</button></section>{data && <pre data-testid="v25-evidence">{JSON.stringify(data,null,2)}</pre>}</main>; }

function V31Acceptance() {
  const testRunStorageKey = "stockquant:v31:testRunId";
  const [data, setData] = useState<V31Run | Record<string, unknown> | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [artifact, setArtifact] = useState<{ ref: Record<string, unknown>; contentBase64: string } | null>(null);
  const [gate, setGate] = useState<V31PromotionGate | null>(null);
  const [acceptanceNote, setAcceptanceNote] = useState("");
  const call = async (path: string, init?: RequestInit) => {
    try { setError(null); setData(await api<Record<string, unknown>>(path, init)); }
    catch (cause) { setError(String(cause)); }
  };
  useEffect(() => {
    const savedTestRunId = window.localStorage.getItem(testRunStorageKey);
    if (savedTestRunId) void call(`/api/v1/acceptance/v3/v3.1/runs/${encodeURIComponent(savedTestRunId)}`);
  }, []);
  const run = async (scenarioId: string) => {
    try {
      setError(null);
      const accepted = await api<{ testRunId: string }>("/api/v1/acceptance/v3/v3.1/runs", { method: "POST", body: JSON.stringify({ scenarioId, seed: 20260907 }) });
      window.localStorage.setItem(testRunStorageKey, accepted.testRunId);
      setData(await api<V31Run>(`/api/v1/acceptance/v3/v3.1/runs/${accepted.testRunId}`));
    } catch (cause) { setError(String(cause)); }
  };
  const runData = data as V31Run | null;
  useEffect(() => {
    if (!runData?.testRunId) { setGate(null); return; }
    void api<V31PromotionGate>(`/api/v1/acceptance/v3/v3.1/runs/${encodeURIComponent(runData.testRunId)}/promotion-gate`).then(setGate).catch((cause) => setError(String(cause)));
  }, [runData?.testRunId, runData?.status]);
  const refresh = async () => {
    if (runData?.testRunId) await call(`/api/v1/acceptance/v3/v3.1/runs/${encodeURIComponent(runData.testRunId)}`);
  };
  const acceptExactRun = async () => {
    if (!runData?.testRunId || gate?.stageStatus !== "PASS" || acceptanceNote.trim().length < 8) return;
    try {
      await api(`/api/v1/acceptance/v3/v3.1/runs/${encodeURIComponent(runData.testRunId)}/acceptance`, { method: "POST", body: JSON.stringify({ confirmation: "ACCEPT_EXACT_V31_RUN", note: acceptanceNote.trim() }) });
      setGate(await api<V31PromotionGate>(`/api/v1/acceptance/v3/v3.1/runs/${encodeURIComponent(runData.testRunId)}/promotion-gate`));
      setError(null);
    } catch (cause) { setError(cause instanceof Error ? cause.message : String(cause)); }
  };
  const readArtifact = async (ref?: Record<string, unknown>) => {
    const orchestration = runData?.evidence?.orchestration as Record<string, unknown> | undefined;
    const selected = ref ?? orchestration?.inputRef as Record<string, unknown> | undefined;
    if (!runData?.testRunId || !selected || selected.status !== "PUBLISHED" || typeof selected.artifactId !== "string") return;
    try { setArtifact(await api(`/api/v1/acceptance/v3/v3.1/runs/${runData.testRunId}/artifacts/${encodeURIComponent(selected.artifactId)}`)); }
    catch (cause) { setError(String(cause)); }
  };
  const evidence = runData?.evidence ?? {};
  const orchestration = evidence.orchestration as Record<string, unknown> | undefined;
  const inputRef = orchestration?.inputRef as Record<string, unknown> | undefined;
  const runnerJob = orchestration?.runnerJob as Record<string, unknown> | undefined;
  const outputRef = Array.isArray(runnerJob?.artifacts) ? (runnerJob.artifacts as Record<string, unknown>[]).find((item) => item.kind === "OUTPUT" && item.status === "PUBLISHED") : undefined;
  const orchestrationBudget = orchestration?.budget as Record<string, unknown> | undefined;
  const modelCall = orchestration?.modelCall as Record<string, unknown> | undefined;
  const experiment = evidence.experiment as Record<string, unknown> | undefined;
  const experimentRecord = typeof experiment?.first === "object" && experiment.first ? experiment.first as Record<string, unknown> : experiment;
  return <main>
    <header><p className="eyebrow">StockQuant · 开发验收中心</p><h1>V3.1 研究实验编排准备</h1><p>RESEARCH / FIXTURE / FAKE；真实模型保持关闭。固定离线流水线仅在后端显式测试模式开启时出现。</p></header>
    {error && <p role="alert" className="error">{error}</p>}
    <section><h2>固定输入与能力</h2><button onClick={() => void call("/api/v1/acceptance/v3/v3.1/preview")}>查看 V3.1 准备状态</button>{(data as Record<string, unknown> | null)?.fixedPipelineAvailable === true && <p data-testid="v31-fixed-pipeline-available">固定 Fixture 流水线可用于本地验收；没有外部模型调用。</p>}</section>
    <section><h2>准备场景</h2><button onClick={() => void run("normal")}>运行正常前置检查</button><button onClick={() => void run("rejection")}>运行 LIVE 拒绝</button><button onClick={() => void run("recovery")}>运行取消与幂等恢复</button>{(data as Record<string, unknown> | null)?.fixedPipelineAvailable === true && <button data-testid="v31-run-fixed-pipeline" onClick={() => void run("fixed-pipeline")}>运行固定代码全链路</button>}</section>
    {runData?.testRunId && <section aria-label="V3.1 TestRun 编排摘要">
      <h2>当前 TestRun 编排</h2><button data-testid="v31-refresh" onClick={() => void refresh()}>刷新同一 TestRun</button>
      <dl><dt>testRunId</dt><dd data-testid="v31-test-run-id">{runData.testRunId}</dd><dt>场景</dt><dd>{runData.scenarioId}</dd><dt>TestRun 状态</dt><dd data-testid="v31-run-status">{runData.status}</dd><dt>Experiment 状态</dt><dd data-testid="v31-experiment-status">{String(experimentRecord?.status ?? "未创建")}</dd><dt>输入 Artifact</dt><dd data-testid="v31-artifact-status">{String(inputRef?.status ?? "未发布")}</dd><dt>Runner Job</dt><dd data-testid="v31-runner-status">{String(runnerJob?.status ?? "未提交")}</dd><dt>执行状态</dt><dd data-testid="v31-execution-status">{String(runnerJob?.execution ?? "未启动")}</dd><dt>前置条件</dt><dd data-testid="v31-prerequisite-status">{String(runnerJob?.prerequisiteStatus ?? "未检查")}</dd>{modelCall && <><dt>模型来源 / 调用</dt><dd data-testid="v31-model-provider">{String(modelCall.providerMode)} / {String(modelCall.modelCalls)}</dd><dt>模型成本 / 预算</dt><dd data-testid="v31-budget-state">{String(modelCall.actualCostCents)} cents / {String(orchestrationBudget?.status ?? "未知")}</dd></>}</dl>
      <section aria-label="V3.1 精确运行人工接受"><h3>用户验收门禁</h3><p data-testid="v31-promotion-stage-status">阶段证据：{gate?.stageStatus ?? "读取中"}</p><p data-testid="v31-human-acceptance-status">人工接受：{gate?.humanAcceptance ?? "读取中"}</p>{gate?.stageStatus === "PASS" && gate.humanAcceptance === "NOT_RUN" && <><label>针对此 TestRun 的验收说明 <input aria-label="V3.1 验收说明" value={acceptanceNote} onChange={(event) => setAcceptanceNote(event.target.value)} /></label><button data-testid="v31-accept-exact-run" disabled={acceptanceNote.trim().length < 8} onClick={() => void acceptExactRun()}>接受此 V3.1 精确运行</button><p>确认只绑定当前运行的证据 SHA-256，不能批准候选或启用策略。</p></>}</section>
      {inputRef?.status === "PUBLISHED" && <section aria-label="当前运行输入 Artifact"><h3>运行输入 Artifact</h3><p><code>{String(inputRef.artifactId)}</code> · SHA-256 <code>{String(inputRef.sha256)}</code></p><button data-testid="v31-read-artifact" onClick={() => void readArtifact(inputRef)}>读取当前运行输入</button>{artifact && artifact.ref.artifactId === inputRef.artifactId && <><p data-testid="v31-artifact-read-hash">已验证引用：{String(artifact.ref.sha256)}</p><a data-testid="v31-artifact-download" download={`${String(inputRef.artifactId)}.json`} href={`data:application/json;base64,${artifact.contentBase64}`}>下载 Artifact</a></>}</section>}
      {outputRef && <section aria-label="当前运行输出 Artifact"><h3>Runner 输出 Artifact</h3><p><code>{String(outputRef.artifactId)}</code> · SHA-256 <code>{String(outputRef.sha256)}</code></p><button data-testid="v31-read-output-artifact" onClick={() => void readArtifact(outputRef)}>读取输出指标</button>{artifact && artifact.ref.artifactId === outputRef.artifactId && <><p data-testid="v31-output-artifact-read-hash">已验证引用：{String(artifact.ref.sha256)}</p><a data-testid="v31-output-artifact-download" download={`${String(outputRef.artifactId)}.json`} href={`data:application/json;base64,${artifact.contentBase64}`}>下载指标 JSON</a><pre data-testid="v31-output-metrics">{(() => { try { return JSON.stringify(JSON.parse(atob(artifact.contentBase64)), null, 2); } catch { return "输出内容不是JSON"; } })()}</pre></>}</section>}
      {runData.assertions && <table><thead><tr><th>断言</th><th>状态</th><th>预期</th></tr></thead><tbody>{runData.assertions.map((assertion) => <tr key={assertion.assertionId}><td>{assertion.assertionId}</td><td>{assertion.status}</td><td><code>{JSON.stringify(assertion.expected)}</code></td></tr>)}</tbody></table>}
      <details><summary>查看原始后端证据</summary><pre data-testid="v31-evidence">{JSON.stringify(runData, null, 2)}</pre></details>
    </section>}
  </main>;
}

function V32Acceptance() {
  const [id, setId] = useState("");
  const [submitRunId, setSubmitRunId] = useState(() => window.localStorage.getItem("stockquant:v31:testRunId") ?? "");
  const [submitResult, setSubmitResult] = useState<Record<string, unknown> | null>(null);
  const [decisionResult, setDecisionResult] = useState<Record<string, unknown> | null>(null);
  const [bindingResult, setBindingResult] = useState<Record<string, unknown> | null>(null);
  const [mandateId, setMandateId] = useState("");
  const [accountId, setAccountId] = useState("");
  const [result, setResult] = useState<Record<string, unknown> | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const submit = async () => {
    const testRunId = submitRunId.trim();
    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(testRunId)) { setError("请输入有效的 V3.1 TestRun UUID"); return; }
    setLoading(true); setError(null); setSubmitResult(null);
    try { setSubmitResult(await api<Record<string, unknown>>(`/api/v1/acceptance/v3/v3.2/runs/${encodeURIComponent(testRunId)}/promotion-submission`, { method: "POST", body: JSON.stringify({ confirmation: "SUBMIT_V32_PROMOTION_REQUEST" }) })); }
    catch (cause) { setError(cause instanceof Error ? cause.message : String(cause)); }
    finally { setLoading(false); }
  };
  const inspect = async () => {
    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id.trim())) { setError("请输入有效的 PromotionRequest UUID"); return; }
    setLoading(true); setError(null); setResult(null);
    try { setResult(await api<Record<string, unknown>>(`/api/v1/acceptance/v3/v3.2/promotions/${encodeURIComponent(id.trim())}`)); }
    catch (cause) { setError(cause instanceof Error ? cause.message : String(cause)); }
    finally { setLoading(false); }
  };
  const decide = async (decision: "APPROVE" | "REJECT") => {
    const promotionRequestId = id.trim();
    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(promotionRequestId)) { setError("请先读取有效的 PromotionRequest"); return; }
    setLoading(true); setError(null); setDecisionResult(null);
    try {
      const response = await api<Record<string, unknown>>(`/api/v1/acceptance/v3/v3.2/promotions/${encodeURIComponent(promotionRequestId)}/decision`, { method: "POST", body: JSON.stringify({ decision, confirmation: "REVIEW_EXACT_PROMOTION_VERSION" }) });
      setDecisionResult(response.decision as Record<string, unknown>);
      await inspect();
    } catch (cause) { setError(cause instanceof Error ? cause.message : String(cause)); }
    finally { setLoading(false); }
  };
  const assessBinding = async () => {
    const mandate = mandateId.trim();
    const account = accountId.trim();
    const testRunId = payload?.testRunId;
    const versionFingerprint = persistedDecision?.versionFingerprint;
    const candidateArtifact = payload?.candidateArtifact as Record<string, unknown> | undefined;
    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(mandate) || !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(account)) { setError("请输入有效的 Mandate UUID 和模拟账户 UUID"); return; }
    if (typeof testRunId !== "string" || typeof versionFingerprint !== "string" || !candidateArtifact) { setError("当前候选缺少已批准的精确版本证据"); return; }
    setLoading(true); setError(null); setBindingResult(null);
    try {
      const session = await ensureSession() as { ownerId?: string };
      if (typeof session.ownerId !== "string") throw new Error("当前用户会话未返回 ownerId");
      setBindingResult(await api<Record<string, unknown>>("/api/v1/acceptance/v3/v3.2/candidate-mandate-binding", { method: "POST", body: JSON.stringify({ schemaVersion: "v3.2-candidate-mandate-binding-command-v1", mandateId: mandate, testRunId, ownerId: session.ownerId, accountId: account, market: "CN_A", environmentMode: "PAPER", brokerMode: "FAKE", strategyVersion: versionFingerprint, candidateArtifact: { artifactId: candidateArtifact.artifactId, namespace: candidateArtifact.namespace, sha256: candidateArtifact.sha256 } }) }));
    } catch (cause) { setError(cause instanceof Error ? cause.message : String(cause)); }
    finally { setLoading(false); }
  };
  const request = result?.request as Record<string, unknown> | undefined;
  const payload = request?.request as Record<string, unknown> | undefined;
  const reportResult = result?.validationReport as Record<string, unknown> | null | undefined;
  const validationReport = reportResult?.report as Record<string, unknown> | undefined;
  const persistedDecision = request?.decision as Record<string, unknown> | null | undefined;
  return <main><header><p className="eyebrow">StockQuant · 开发验收中心</p><h1>V3.2 候选验证记录</h1><p>发起前会重新检查该 TestRun 的 V3.1 精确证据和用户验收；提交只创建待独立验证的 PromotionRequest，不会批准候选或修改 Registry。</p></header>
    <section aria-label="从 V3.1 TestRun 提交 PromotionRequest"><h2>提交研究候选进行独立验证</h2><label>V3.1 TestRun UUID <input aria-label="V3.1 TestRun UUID" value={submitRunId} onChange={(event) => setSubmitRunId(event.target.value)} /></label><button data-testid="v32-submit-promotion" disabled={loading} onClick={() => void submit()}>{loading ? "提交状态确认中…" : "提交此 TestRun 的 PromotionRequest"}</button>{submitResult && <><p data-testid="v32-submit-status">提交状态：{String(submitResult.status)}</p>{Array.isArray(submitResult.blockers) && <ul>{submitResult.blockers.map((blocker) => <li key={String(blocker)}>{String(blocker)}</li>)}</ul>}{typeof submitResult.promotionRequestId === "string" && <p>PromotionRequest：<code>{submitResult.promotionRequestId}</code></p>}<p>人工验收记录：{String(submitResult.humanAcceptance ?? "由 V3.1 精确运行页面单独记录")}</p></>}</section>
    <section><h2>查询已提交记录</h2><label>PromotionRequest UUID <input aria-label="PromotionRequest UUID" value={id} onChange={(event)=>setId(event.target.value)} /></label><button onClick={()=>void inspect()} disabled={loading}>{loading ? "读取中…" : "读取记录"}</button>{error && <p role="alert" className="error">{error}</p>}</section>
    {request && payload && <section aria-label="PromotionRequest 精确版本"><h2>PromotionRequest 精确版本</h2><p>来源：<strong>{String(payload.candidateSource)}</strong> · 状态：<strong>{String(request.status)}</strong></p><dl><dt>PromotionRequest ID</dt><dd>{String(request.promotionRequestId)}</dd><dt>TestRun ID</dt><dd>{String(payload.testRunId)}</dd><dt>Experiment ID</dt><dd>{String(payload.experimentId)}</dd><dt>候选 Artifact SHA-256</dt><dd><code>{String((payload.candidateArtifact as Record<string, unknown>)?.sha256)}</code></dd><dt>代码 SHA-256</dt><dd><code>{String(payload.codeSha256)}</code></dd><dt>数据 Manifest SHA-256</dt><dd><code>{String(payload.dataManifestSha256)}</code></dd><dt>指标 Manifest SHA-256</dt><dd><code>{String(payload.metricsManifestSha256)}</code></dd><dt>验证计划 SHA-256</dt><dd><code>{String(payload.validationPlanSha256)}</code></dd><dt>创建时间</dt><dd>{String(request.createdAt)}</dd></dl>{persistedDecision && <p data-testid="v32-registry-decision">决定：{String(persistedDecision.decision)} · Registry：{String(persistedDecision.registryStatus)} · 激活：{String(persistedDecision.activation)} · 版本指纹：<code>{String(persistedDecision.versionFingerprint)}</code></p>}</section>}
    {result && <section aria-label="独立验证报告"><h2>独立验证</h2><p data-testid="v32-validation-status">{reportResult ? String(validationReport?.disposition ?? "报告已保存") : "NOT_RUN：Quant 尚无持久化验证报告"}</p>{reportResult && <pre>{JSON.stringify(reportResult, null, 2)}</pre>}{reportResult && !persistedDecision && <div aria-label="精确版本审批"><p>以下决定将绑定上方候选、代码、数据、指标、验证计划及本报告指纹。批准后仍保持禁用，须另行满足 Mandate。</p>{validationReport?.disposition === "ELIGIBLE_FOR_REVIEW" && <button data-testid="v32-approve-version" disabled={loading} onClick={() => void decide("APPROVE")}>批准此精确候选版本</button>}<button data-testid="v32-reject-version" disabled={loading} onClick={() => void decide("REJECT")}>拒绝此精确候选版本</button></div>}{decisionResult && <p data-testid="v32-decision-result">决定已记录：{String(decisionResult.decision)} · {String(decisionResult.activation)}</p>}<p>Registry 状态：<strong>{String(result.registryMutation)}</strong> · 策略激活：<strong>{String(result.activation)}</strong></p><p>批准记录属于 Quant 精确版本 Registry；它不会激活策略，也不会修改 Mandate。</p></section>}
    {persistedDecision?.decision === "APPROVE" && persistedDecision.registryStatus === "CANDIDATE_APPROVED" && <section aria-label="候选到模拟 Mandate 精确版本核对"><h2>核对候选与模拟 Mandate 版本绑定</h2><p>仅核对已批准候选的精确指纹与 Artifact 是否一致；不会创建 Mandate、验证账户可用性或激活策略。</p><label>拟议 Mandate UUID <input aria-label="拟议 Mandate UUID" value={mandateId} onChange={(event) => setMandateId(event.target.value)} /></label><label>拟议模拟账户 UUID <input aria-label="拟议模拟账户 UUID" value={accountId} onChange={(event) => setAccountId(event.target.value)} /></label><button data-testid="v32-check-mandate-binding" disabled={loading} onClick={() => void assessBinding()}>核对已批准候选版本</button>{bindingResult && <div data-testid="v32-mandate-binding-result"><p>核对结果：{String(bindingResult.status)} · {String(bindingResult.reason)}</p><p>版本指纹：<code>{String(bindingResult.versionFingerprint ?? persistedDecision.versionFingerprint)}</code></p><p>账户验证：{String(bindingResult.accountValidation ?? "NOT_PERFORMED")} · Mandate 持久化：{String(bindingResult.mandatePersistence ?? "NOT_PERFORMED")} · 策略激活：{String(bindingResult.activation ?? "NOT_PERFORMED")}</p></div>}</section>}
  </main>;
}

type V33RunnerQueue = { schemaVersion: "v3.3-runner-cursor-queue-v1"; testRunId: string; afterCursor: string | null; nextAfterCursor: string | null; limit: number; jobs: Array<{ jobId: string; status: string; submittedAt: string; startedAt: string | null; completedAt: string | null; attempt: number; retryOf: string | null; artifacts: unknown[]; execution: { exitCode?: number | null; durationMs?: number } | null }>; hasMore: boolean };
type V33RunnerBudget = { schemaVersion: "v3.3-runner-budget-v1"; testRunId: string; offset: number; limit: number; rows: Array<{ jobId: string; experimentId: string; requestedCents?: number; reservedCents?: number; settledCents?: number; unknownReservedCents?: number; status: string; source: string }>; hasMore: boolean; coverage: { jobsOnPage: number; experimentsOnPage: number; budgetsFound: number; budgetsMissing: number }; note: string };

function V33Acceptance() {
  const [testRunId, setTestRunId] = useState("");
  const [readinessRun, setReadinessRun] = useState<any>(null);
  const [sourceV31TestRunId, setSourceV31TestRunId] = useState("");
  const [promotionRequestId, setPromotionRequestId] = useState("");
  const [queue, setQueue] = useState<V33RunnerQueue | null>(null);
  const [budget, setBudget] = useState<V33RunnerBudget | null>(null);
  const [budgetError, setBudgetError] = useState<string | null>(null);
  const [offset, setOffset] = useState(0);
  const [pageCursors, setPageCursors] = useState<Array<string | null>>([null]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const pageSize = 25;

  const readQueue = async (pageNumber = 0, requestedId = testRunId, cursorOverride?: string | null) => {
    const nextOffset = pageNumber * pageSize;
    const id = requestedId.trim();
    const afterCursor = cursorOverride === undefined ? pageCursors[pageNumber] ?? null : cursorOverride;
    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/iu.test(id)) {
      setError("请输入有效的 V3.3 TestRun UUID");
      return;
    }
    setLoading(true); setError(null);
    try {
      const cursorQuery = new URLSearchParams({ limit: String(pageSize) });
      if (afterCursor !== null) cursorQuery.set("afterCursor", afterCursor);
      const result = await api<V33RunnerQueue>(`/api/v1/acceptance/v3/v3.3/runs/${encodeURIComponent(id)}/research/queue/cursor?${cursorQuery}`);
      if (result.schemaVersion !== "v3.3-runner-cursor-queue-v1" || result.testRunId !== id || result.afterCursor !== afterCursor || result.limit !== pageSize) throw new Error("队列响应与请求的 TestRun 或游标不匹配");
      setQueue(result); setOffset(nextOffset);
      setPageCursors((previous) => { const updated = previous.slice(0, pageNumber + 1); if (result.nextAfterCursor !== null) updated[pageNumber + 1] = result.nextAfterCursor; return updated; });
      try {
        const snapshot = await api<V33RunnerBudget>(`/api/v1/acceptance/v3/v3.3/runs/${encodeURIComponent(id)}/research/budget?offset=${nextOffset}&limit=${pageSize}`);
        if (snapshot.schemaVersion !== "v3.3-runner-budget-v1" || snapshot.testRunId !== id || snapshot.offset !== nextOffset) throw new Error("预算响应与请求的 TestRun 或分页不匹配");
        setBudget(snapshot); setBudgetError(null);
      } catch (cause) { setBudget(null); setBudgetError(cause instanceof Error ? cause.message : String(cause)); }
    } catch (cause) {
      setQueue(null);
      setBudget(null);
      setError(cause instanceof Error ? cause.message : String(cause));
    } finally { setLoading(false); }
  };

  const createReadinessRun = async (scenarioId: "normal" | "rejection" | "recovery") => {
    setLoading(true); setError(null); setReadinessRun(null);
    try {
      const created = await api<any>("/api/v1/acceptance/v3/v3.3/runs", { method: "POST", body: JSON.stringify({ scenarioId, seed: 20260907, ...(sourceV31TestRunId.trim() ? { sourceV31TestRunId: sourceV31TestRunId.trim() } : {}), ...(promotionRequestId.trim() ? { promotionRequestId: promotionRequestId.trim() } : {}) }) });
      if (!created.testRunId || created.status !== "WAITING") throw new Error("V3.3 readiness run did not persist an explicit WAITING result");
      const stored = await api<any>(`/api/v1/acceptance/v3/v3.3/runs/${encodeURIComponent(created.testRunId)}`);
      if (stored.testRunId !== created.testRunId || stored.stageId !== "V3.3" || stored.scenarioId !== scenarioId || stored.status !== "WAITING") throw new Error("Stored V3.3 TestRun does not match the created WAITING run");
      setReadinessRun(stored); setTestRunId(stored.testRunId);
      setPageCursors([null]);
      await readQueue(0, stored.testRunId, null);
    } catch (cause) { setError(cause instanceof Error ? cause.message : String(cause)); }
    finally { setLoading(false); }
  };

  return <main>
    <header><p className="eyebrow">StockQuant · 开发验收中心</p><h1>V3.3 研究队列与预算证据</h1><p>可创建仅记录门禁状态的 WAITING 准备态 TestRun，并只读查看已有 TestRun 的 Runner 尝试和当前页关联实验的持久预算记录。准备态不会派发任务、改变预算或 Paper 状态；V3.3 正式工作流仍待实现，缺少合格前置时保持 WAITING。</p></header>
    <section aria-label="创建等待态阶段运行"><h2>记录阶段准备状态</h2><p>提供精确的 V3.1 与 PromotionRequest UUID 可核验对应门禁；这会持久化场景元数据，不创建 Runner Job，也不调用模型。</p><label>已接受的 V3.1 TestRun UUID <input aria-label="已接受的 V3.1 TestRun UUID" value={sourceV31TestRunId} onChange={(event) => setSourceV31TestRunId(event.target.value)} /></label><label>PromotionRequest UUID <input aria-label="PromotionRequest UUID" value={promotionRequestId} onChange={(event) => setPromotionRequestId(event.target.value)} /></label><button data-testid="v33-create-normal" disabled={loading} onClick={() => void createReadinessRun("normal")}>记录正常场景</button><button data-testid="v33-create-rejection" disabled={loading} onClick={() => void createReadinessRun("rejection")}>记录预算/故障拒绝场景</button><button data-testid="v33-create-recovery" disabled={loading} onClick={() => void createReadinessRun("recovery")}>记录恢复场景</button>{readinessRun && <section aria-label="持久化运行状态"><h3>{readinessRun.scenarioId} · {readinessRun.status}</h3><p>TestRun：<code>{readinessRun.testRunId}</code> · seed {readinessRun.seed}</p><details open><summary>未通过门禁与执行事实</summary><pre data-testid="v33-readiness-evidence">{JSON.stringify(readinessRun.evidence, null, 2)}</pre></details></section>}</section>
    <section aria-label="读取已有研究队列"><h2>读取已有 TestRun 队列</h2><label>V3.3 TestRun UUID <input aria-label="V3.3 TestRun UUID" value={testRunId} onChange={(event) => setTestRunId(event.target.value)} /></label><button data-testid="v33-read-queue" disabled={loading} onClick={() => { setPageCursors([null]); void readQueue(0, testRunId, null); }}>{loading ? "读取中…" : "读取只读队列和预算"}</button>{error && <p role="alert" className="error">{error}</p>}</section>
    <section aria-label="V3.3能力边界"><h2>当前能力边界</h2><dl><dt>准备态 TestRun 元数据</dt><dd data-testid="v33-readiness-status">PERSISTED_WAITING_ONLY</dd><dt>Runner 队列读取</dt><dd>OWNER_SCOPED_READ_ONLY</dd><dt>实验预算读取</dt><dd data-testid="v33-budget-status">OWNER_SCOPED_LEDGER_READ_ONLY</dd><dt>正式业务工作流 / Runner 派发</dt><dd data-testid="v33-business-status">NOT_IMPLEMENTED</dd><dt>全阶段预算控制</dt><dd data-testid="v33-stage-budget-status">NOT_IMPLEMENTED</dd><dt>Paper 并行可用性</dt><dd data-testid="v33-paper-status">NOT_CHECKED</dd></dl><p>预算仅覆盖当前队列页中 Runner Job 所引用实验的账本记录；未关联 Job 的预留不在此页，重试可能重复显示同一实验且不能按行求和。账本值也不是供应商账单。读取结果不会让 V3.1/V3.2 前置或 V3.3 阶段验收变为通过。</p></section>
    {queue && <section aria-label="研究队列结果"><h2>Runner 队列</h2><p data-testid="v33-queue-scope">TestRun：<code>{queue.testRunId}</code> · {queue.jobs.length} 条 · 偏移 {offset} · 每页 {queue.limit}</p>{queue.jobs.length === 0 ? <p data-testid="v33-queue-empty">此 TestRun 当前没有 Runner Job。</p> : <table><thead><tr><th>Job</th><th>状态</th><th>尝试</th><th>提交时间</th><th>完成时间</th><th>退出码</th><th>Artifact 数</th></tr></thead><tbody>{queue.jobs.map((job) => <tr key={job.jobId}><td><code>{job.jobId}</code>{job.retryOf && <small>重试自 {job.retryOf}</small>}</td><td>{job.status}</td><td>{job.attempt}</td><td>{job.submittedAt}</td><td>{job.completedAt ?? "—"}</td><td>{job.execution?.exitCode ?? "—"}</td><td>{job.artifacts.length}</td></tr>)}</tbody></table>}<div><button data-testid="v33-previous-page" disabled={loading || offset === 0} onClick={() => void readQueue(Math.max(0, Math.floor(offset / pageSize) - 1))}>上一页</button><button data-testid="v33-next-page" disabled={loading || !queue.hasMore || !queue.nextAfterCursor} onClick={() => void readQueue(Math.floor(offset / pageSize) + 1, testRunId, queue.nextAfterCursor)}>下一页</button></div><details><summary>查看原始队列证据</summary><pre data-testid="v33-queue-evidence">{JSON.stringify(queue, null, 2)}</pre></details></section>}
    {budgetError && <p role="alert" className="error">预算账本读取失败：{budgetError}</p>}
    {budget && <section aria-label="V3.3持久预算证据"><h2>实验预算账本（本页 Runner Job）</h2><p>{budget.coverage.budgetsFound}/{budget.coverage.experimentsOnPage} 个不同实验可找到账本；缺失 {budget.coverage.budgetsMissing}。金额单位为 USD cents；费用未知时保留为 UNKNOWN。</p>{budget.rows.length === 0 ? <p>此页无Runner Job，因此没有可归属的实验预算行。</p> : <table><thead><tr><th>实验</th><th>申请额度</th><th>预留</th><th>已结算</th><th>未知预留</th><th>账本状态</th><th>来源</th></tr></thead><tbody>{budget.rows.map((row) => <tr key={`${row.jobId}:${row.experimentId}`}><td><code>{row.experimentId}</code></td><td>{row.requestedCents ?? "—"}</td><td>{row.reservedCents ?? "—"}</td><td>{row.settledCents ?? "—"}</td><td>{row.unknownReservedCents ?? "—"}</td><td>{row.status}</td><td>{row.source}</td></tr>)}</tbody></table>}<p>{budget.note}</p><details><summary>查看预算账本原始证据</summary><pre data-testid="v33-budget-evidence">{JSON.stringify(budget, null, 2)}</pre></details></section>}
  </main>;
}

function Dc06Acceptance() { const [data, setData] = useState<any>(null); const [error, setError] = useState<string | null>(null); const call = async (path: string, init?: RequestInit) => { try { setError(null); setData(await api<any>(path, init)); } catch (e) { setError(String(e)); } }; const run = async (scenarioId: string) => { try { setError(null); const accepted = await api<any>("/api/v1/acceptance/v2/dc06/runs", { method: "POST", body: JSON.stringify({ scenarioId, seed: 20260907 }) }); setData(await api<any>(`/api/v1/acceptance/v2/dc06/runs/${accepted.testRunId}`)); } catch (e) { setError(String(e)); } }; return <main><header><p className="eyebrow">StockQuant · 开发验收中心</p><h1>DC-06 多项目数据交付</h1><p>项目隔离、分页、导出脱敏和令牌恢复；仅调用真实 market-data-service，不触发交易。</p></header>{error && <p role="alert" className="error">{error}</p>}<section><h2>交付能力</h2><button onClick={()=>void call("/api/v1/acceptance/v2/dc06/preview")}>查看项目配置</button><button onClick={()=>void run("normal")}>运行分页与脱敏</button><button onClick={()=>void run("rejection")}>运行跨项目拒绝</button><button onClick={()=>void run("recovery")}>运行令牌恢复</button></section>{data && <pre data-testid="dc06-evidence">{JSON.stringify(data,null,2)}</pre>}</main>; }

function Dc08Acceptance() { const [data, setData] = useState<any>(null); const [error, setError] = useState<string | null>(null); const refresh = async () => { try { setError(null); setData(await api<any>("/api/v1/acceptance/v2/dc08/preview")); } catch (e) { setError(String(e)); } }; return <main><header><p className="eyebrow">StockQuant · 开发验收中心</p><h1>DC-08A 分钟采集观察</h1><p>只读查看正式订阅、服务就绪状态和缺口；不会从 Web 页面开启采集。</p></header>{error && <p role="alert" className="error">{error}</p>}<section><h2>当前状态</h2><button onClick={()=>void refresh()}>刷新采集状态</button></section>{data && <section><dl><dt>订阅</dt><dd data-testid="dc08-subscription-id">{data.subscriptionId}</dd><dt>采集器</dt><dd data-testid="dc08-executor-status">{data.ready?.collectionExecutor}</dd><dt>订阅是否启用</dt><dd data-testid="dc08-schedule-enabled">{String(data.schedule?.enabled)}</dd><dt>开放缺口</dt><dd data-testid="dc08-open-gaps">{data.gaps?.open?.length ?? 0}</dd></dl><pre data-testid="dc08-evidence">{JSON.stringify(data,null,2)}</pre></section>}</main>; }

createRoot(document.getElementById("root")!).render(<App />);
