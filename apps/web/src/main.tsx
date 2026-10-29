import { useEffect, useMemo, useState } from "react";
import { createRoot } from "react-dom/client";
import type { V11AcceptanceRun, V24ObservationRevisionList, V24PaperReadiness, V24PaperStageRunAccepted, V24PaperStageRunRequest, V24PaperStageRunResult } from "../../../packages/contracts/generated/types.js";
import { parseV11AcceptanceRun } from "./v11-acceptance-run-contract.js";
import v13TradeFixture from "../../../fixtures/v1/v1.3/trading-loop-scenarios.json";
import v13TradeFixtureManifest from "../../../fixtures/v1/v1.3/manifest.json";
import v13MultiLegFixture from "../../../fixtures/v1/v1.3-multileg-v1.0.4/trading-loop-scenarios.json";
import v13MultiLegFixtureManifest from "../../../fixtures/v1/v1.3-multileg-v1.0.4/manifest.json";
import { getV15CapabilityRows } from "./v15-capability-status.js";
import "./styles.css";

type Scenario = { scenarioId: "normal" | "auto-trade" | "rejection" | "recovery" | "external-reconciliation" | "crossday-settlement"; version: string; title: string; expected: string };
type Assertion = { assertionId: string; status: "PASS" | "FAIL" | "WAITING"; expected: unknown; actual: unknown; evidence: Record<string, unknown> };
const V14_RUN_STORAGE_KEY = "stockquant:v14:lastTestRunId";
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

async function getV11AcceptanceRun(path: string): Promise<V11AcceptanceRun> {
  return parseV11AcceptanceRun(await api<unknown>(path));
}

function App() {
  const [scenarios, setScenarios] = useState<Scenario[]>([]);
  const [run, setRun] = useState<V11AcceptanceRun | null>(null);
  const [runId, setRunId] = useState(() => window.localStorage.getItem("stockquant:v11:testRunId") ?? "");
  const [account, setAccount] = useState<AccountDetail | null>(null);
  const [usAccount, setUsAccount] = useState<AccountDetail | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [capabilities, setCapabilities] = useState<{ brokerMode: string; liveTradingEnabled: boolean } | null>(null);

  const route = useMemo(() => window.location.pathname, []);
  if (route === "/acceptance/v1/v1.2") return <V12Acceptance />;
  if (route === "/acceptance/v1/v1.3") return <><p data-testid="v13-fixture-version">交易Fixture：{v13TradeFixture.fixtureId} · {v13TradeFixture.fixtureVersion} · SHA-256 {v13TradeFixtureManifest.files[0].sha256}</p><V13Acceptance /></>;
  if (route === "/acceptance/v1/v1.4") return <V14Acceptance />;
  if (route === "/acceptance/v1/v1.5") return <V15Acceptance />;
  if (route === "/acceptance/v2/v2.1") return <V21Acceptance />;
  if (route === "/acceptance/v2/v2.2") return <V22Acceptance />;
  if (route === "/acceptance/v2/v2.3") return <V23Acceptance />;
  if (route === "/acceptance/v2/v2.4") return <V24Acceptance />;
  if (route === "/acceptance/v2/v2.4/c5-local") return <C5LocalEngineering />;
  if (route === "/paper") return <V24PaperOverview />;
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
    void getV11AcceptanceRun(`/api/v1/acceptance/runs/${runId}`).then(setRun).catch((cause) => setError(String(cause)));
    const storedUsAccountId = window.localStorage.getItem("stockquant:v11:usAccountId");
    if (storedUsAccountId) void api<AccountDetail>(`/api/v1/accounts/${storedUsAccountId}`).then(setUsAccount).catch(() => window.localStorage.removeItem("stockquant:v11:usAccountId"));
  }, [runId]);

  useEffect(() => {
    if (!run || !["QUEUED", "RUNNING"].includes(run.status)) return;
    const timer = window.setInterval(() => {
      void getV11AcceptanceRun(`/api/v1/acceptance/runs/${run.testRunId}`).then(setRun).catch((cause) => setError(String(cause)));
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
      setRun(await getV11AcceptanceRun(`/api/v1/acceptance/runs/${accepted.testRunId}`));
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
    setRun(await getV11AcceptanceRun(`/api/v1/acceptance/runs/${run.testRunId}`));
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
  const [normal, setNormal] = useState<any>(null); const [bad, setBad] = useState<any>(null); const [researchFixture, setResearchFixture] = useState<any>(null); const [probe, setProbe] = useState<any>(null); const [factor, setFactor] = useState<any>(null); const [rdagent, setRdagent] = useState<any>(null); const [scenario, setScenario] = useState("normal"); const [stageRun, setStageRun] = useState<any>(null); const [runId, setRunId] = useState(() => new URLSearchParams(window.location.search).get("runId") ?? ""); const [error, setError] = useState<string | null>(null);
  const run = async (path: string, setter: (value: any)=>void) => { try { setError(null); setter(await api<any>(path)); } catch (cause) { setError(String(cause)); } };
  useEffect(() => {
    if (!runId) return;
    let active = true;
    void (async () => {
      try {
        for (let attempt = 0; attempt < 600; attempt += 1) {
          const current = await api<any>(`/api/v1/acceptance/v1/v1.2/runs/${runId}`);
          if (!active) return;
          setStageRun(current);
          if (["COMPLETED", "FAILED", "WAITING", "CANCELLED"].includes(current.status)) return;
          await new Promise(resolve => setTimeout(resolve, 250));
        }
        throw new Error(`V1.2 TestRun polling timed out: ${runId}`);
      } catch (cause) { if (active) setError(String(cause)); }
    })();
    return () => { active = false; };
  }, [runId]);
  const startStageRun = async () => { try { setError(null); setStageRun(null); const accepted = await api<any>("/api/v1/acceptance/v1/v1.2/runs", { method:"POST", body:JSON.stringify({ scenarioId: scenario, seed: 20260907 }) }); setRunId(accepted.testRunId); window.history.replaceState(null, "", `${window.location.pathname}?runId=${encodeURIComponent(accepted.testRunId)}`); } catch (cause) { setError(String(cause)); } };
  const cancelStageRun = async () => { if (!runId) return; try { setError(null); const result = await api<any>(`/api/v1/acceptance/v1/v1.2/runs/${runId}/cancel`, { method: "POST" }); setStageRun((current: any) => current ? { ...current, evidence: { ...current.evidence, qlibTask: { ...current.evidence?.qlibTask, cancelRequested: result.cancelRequested } } } : current); } catch (cause) { setError(String(cause)); } };
  return <main><header><p className="eyebrow">StockQuant · 开发验收中心</p><h1>V1.2 小样本数据与 Qlib 环境探针</h1><p>FIXTURE / SIMULATION_ONLY；Qlib 探针未通过时不得伪称因子计算成功。</p></header>{error && <p role="alert" className="error">{error}</p>}<section><h2>数据导入与质量</h2><button onClick={()=>void run('/api/v1/acceptance/v1/v1.2/data/normal',setNormal)}>预览正常 Fixture</button><button onClick={()=>void run('/api/v1/acceptance/v1/v1.2/data/bad-future',setBad)}>预览未来数据拒绝样本</button><button onClick={()=>void run('/api/v1/acceptance/v1/v1.2/data/research',setResearchFixture)}>读取双市场研究 Fixture</button>{normal && <pre data-testid="normal-preview">{JSON.stringify(normal,null,2)}</pre>}{bad && <pre data-testid="bad-preview">{JSON.stringify(bad,null,2)}</pre>}{researchFixture && <pre data-testid="research-fixture-preview">{JSON.stringify({fixtureVersion:researchFixture.fixtureVersion,dataMode:researchFixture.dataMode,securityCount:researchFixture.securities?.length,barCount:researchFixture.bars?.length,markets:[...new Set(researchFixture.securities?.map((item:any)=>item.market))]},null,2)}</pre>}</section><section><h2>Qlib 与因子</h2><button onClick={()=>void run('/api/v1/acceptance/v1/v1.2/quant/probe',setProbe)}>运行 Qlib CPU 探针</button><button onClick={()=>void run('/api/v1/acceptance/v1/v1.2/quant/factors',setFactor)}>检查策略输出状态</button><button onClick={()=>void run('/api/v1/acceptance/v1/v1.2/quant/rdagent-probe',setRdagent)}>运行 RD-Agent 兼容探针</button>{probe && <pre data-testid="qlib-probe">{JSON.stringify(probe,null,2)}</pre>}{factor && <pre data-testid="factor-preview">{JSON.stringify(factor,null,2)}</pre>}{rdagent && <pre data-testid="rdagent-probe">{JSON.stringify(rdagent,null,2)}</pre>}</section><section><h2>持久化验收运行</h2><label>验收场景<select aria-label="V1.2 验收场景" value={scenario} onChange={event=>setScenario(event.target.value)}><option value="normal">正常数据与因子</option><option value="rejection">未来数据拒绝</option><option value="recovery">Qlib 探针可用性核验（不执行故障恢复）</option></select></label><button onClick={()=>void startStageRun()}>运行 V1.2 场景</button>{stageRun && <><dl><dt>testRunId</dt><dd data-testid="v12-test-run-id">{stageRun.testRunId}</dd><dt>状态</dt><dd data-testid="v12-run-status">{stageRun.status}</dd><dt>执行阶段</dt><dd data-testid="v12-task-phase">{stageRun.evidence?.qlibTask?.phase ?? "NOT_REPORTED"}</dd></dl>{stageRun.status === "RUNNING" && stageRun.evidence?.qlibTask?.phase !== "PUBLISHING_ARTIFACT" && <button data-testid="cancel-v12-run" disabled={stageRun.evidence?.qlibTask?.cancelRequested === true} onClick={()=>void cancelStageRun()}>{stageRun.evidence?.qlibTask?.cancelRequested ? "已请求取消" : "取消运行"}</button>}<pre data-testid="v12-run-evidence">{JSON.stringify(stageRun.evidence,null,2)}</pre><table><thead><tr><th>断言</th><th>状态</th><th>预期</th><th>实际</th></tr></thead><tbody>{stageRun.assertions.map((item:any)=><tr key={item.assertionId}><td>{item.assertionId}</td><td>{item.status}</td><td><code>{JSON.stringify(item.expected)}</code></td><td><code>{JSON.stringify(item.actual)}</code></td></tr>)}</tbody></table></>}</section></main>;
}

function V13Acceptance() {
  const [scenario, setScenario] = useState<string>("normal");
  const [clockAdvances, setClockAdvances] = useState<any[]>([]);
  const [run, setRun] = useState<any>(null); const [account, setAccount] = useState<any>(null); const [proposal, setProposal] = useState<any>(null); const [execution, setExecution] = useState<any>(null); const [sequenceReport, setSequenceReport] = useState<any>(null); const [feeCorrection, setFeeCorrection] = useState<any>(null); const [autoMandate, setAutoMandate] = useState<any>(null); const [reconciliation, setReconciliation] = useState<any>(null); const [market, setMarket] = useState<keyof typeof v13TradeFixture.markets>("CN_A"); const [error, setError] = useState<string | null>(null);
  const readUrl = () => new URLSearchParams(window.location.search);
  const runId = readUrl().get("runId");
  useEffect(() => { if (!runId) return; let active = true; void (async () => { try { const value = await api<any>(`/api/v1/acceptance/v1/v1.3/runs/${runId}`); if (!active) return; setRun(value); const clock = await api<any>(`/api/v1/acceptance/v1/v1.3/runs/${runId}/clock`); if (active) setClockAdvances(clock.advances ?? []); const reconciliationResult = await api<any>(`/api/v1/acceptance/v1/v1.3/runs/${runId}/reconciliation`); if (active) setReconciliation(reconciliationResult); const accountId = readUrl().get("accountId"); const proposalId = readUrl().get("proposalId"); const mandateId = readUrl().get("mandateId"); if (accountId) { const accountResult = await api<any>(`/api/v1/accounts/${accountId}`); if (active && accountResult.account?.testRunId === runId) { setAccount(accountResult.account); setMarket(accountResult.account.market as keyof typeof v13TradeFixture.markets); } } if (proposalId) { const proposalResult = await api<any>(`/api/v1/acceptance/v1/v1.3/runs/${runId}/proposals/${proposalId}`); if (active) setProposal(proposalResult); const orderIds = [`v13-auto-${proposalId}`, `v13-${proposalId}`]; for (const clientOrderId of orderIds) { try { const order = await api<any>(`/api/v1/acceptance/v1/v1.3/runs/${runId}/proposals/${proposalId}/orders/${encodeURIComponent(clientOrderId)}`); if (active) { setExecution(order); if (order.reconciliation) setReconciliation(order.reconciliation); } break; } catch (cause) { if (!String(cause).startsWith("Error: 404 ")) throw cause; } } } if (mandateId) { const mandateResult = await api<any>(`/api/v1/acceptance/v1/v1.3/runs/${runId}/auto-mandates/${mandateId}`); if (active) setAutoMandate(mandateResult); const budget = await api<any>(`/api/v1/acceptance/v1/v1.3/runs/${runId}/auto-mandates/${mandateId}/versions/${mandateResult.mandateVersion}/budget`); if (active) setExecution((current:any) => current ? { ...current, mandateBudgetVerification: budget } : current); } } catch (cause) { if (active) setError(String(cause)); } })(); return () => { active = false; }; }, [runId]);
  const start = async () => { try { setError(null); const accepted = await api<any>("/api/v1/acceptance/v1/v1.3/runs", { method: "POST", body: JSON.stringify({ scenarioId: scenario, seed: v13TradeFixture.seed }) }); window.history.replaceState(null, "", `${window.location.pathname}?runId=${encodeURIComponent(accepted.testRunId)}`); setAccount(null); setProposal(null); setAutoMandate(null); setExecution(null); setReconciliation(null); setClockAdvances([]); setRun(await api<any>(`/api/v1/acceptance/v1/v1.3/runs/${accepted.testRunId}`)); } catch (cause) { setError(String(cause)); } };
  const persistQuery = (key: string, value: string) => { const params = readUrl(); params.set(key, value); window.history.replaceState(null, "", `${window.location.pathname}?${params.toString()}`); };
  const initialize = async () => { if (!run) return; try { setError(null); const value = await api<any>(`/api/v1/acceptance/v1/v1.3/runs/${run.testRunId}/accounts`, { method: "POST", body: JSON.stringify({ market }) }); setAccount(value.account); if (value.run) setRun(value.run); if (value.initializationAdvance) setClockAdvances((current:any[]) => current.some((item) => item.sequence === value.initializationAdvance.sequence) ? current : [...current, value.initializationAdvance]); persistQuery("accountId", value.account.accountId); } catch (cause) { setError(String(cause)); } };
  const recordExternalOrder = async () => { if (!run) return; try { setError(null); const value = await api<any>(`/api/v1/acceptance/v1/v1.3/runs/${run.testRunId}/external-orders/observe`, { method: "POST", body: "{}" }); setReconciliation(value.reconciliation); } catch (cause) { setError(String(cause)); } };
  const advanceSession = async () => { if (!run || !account) return; try { setError(null); const result = await api<any>(`/api/v1/acceptance/v1/v1.3/runs/${run.testRunId}/clock/advance-session`, { method: "POST", body: JSON.stringify({ accountId: account.accountId, expectedClock: run.evidence.runClockNow }) }); const event = result.event; if (!event?.toClock || !event?.calendarVersion) throw new Error("Session advance response omitted its persisted event"); setRun((current: any) => current ? { ...current, evidence: { ...current.evidence, runClockNow: event.toClock, calendarVersion: event.calendarVersion, sessionAdvanceSequence: event.sequence } } : current); setClockAdvances((current: any[]) => current.some((item) => item.sequence === event.sequence) ? current : [...current, event]); } catch (cause) { setError(String(cause)); } };
  const createProposal = async (mode: "MANUAL_APPROVAL" | "AUTO_POLICY" = "MANUAL_APPROVAL", operation: "HOLD" | "REBALANCE" = "REBALANCE", quantity?: number, multiLeg = false, fixtureCase: "normal" | "strictSuccess" | "strictInsufficient" = "normal") => { if (!run || !account) return; try { setError(null); const marketFixture = v13TradeFixture.markets[market]; const fixedScenario = fixtureCase === "normal" ? v13MultiLegFixture.scenarios.normal[market] as any : fixtureCase === "strictSuccess" ? v13MultiLegFixture.scenarios.strictSettledCash.success : v13MultiLegFixture.scenarios.strictSettledCash.insufficientCash; const legs = operation === "HOLD" ? [] : multiLeg ? fixedScenario.legs.map((leg: any) => ({ legId: leg.legId, securityId: leg.security ?? leg.securityId, side: leg.side, quantity: leg.quantity })) : [{ legId: "leg-1", securityId: marketFixture.security, side: "BUY", quantity: quantity ?? marketFixture.order.quantity }]; const idempotencyScenario = multiLeg ? fixtureCase : quantity ?? "default"; const value = await api<any>(`/api/v1/acceptance/v1/v1.3/runs/${run.testRunId}/proposals`, { method: "POST", body: JSON.stringify({ idempotencyKey: `v13-${mode.toLowerCase()}-${operation.toLowerCase()}-${market}-${idempotencyScenario}-${run.testRunId}`, accountId: account.accountId, approvalMode: mode, market, currency: marketFixture.currency, strategyVersion: mode === "AUTO_POLICY" ? "fixture-auto-policy-test-v1" : "fixture-manual-test-v1", operation, expiresAt: new Date(Date.parse(run.evidence.runClockNow) + 4 * 60 * 60 * 1000).toISOString(), legs }) }); setProposal(value); persistQuery("proposalId", value.proposalId); } catch (cause) { setError(String(cause)); } };
  const createAutoMandate = async (multiLeg = false, fixtureCase: "normal" | "strictInsufficient" = "normal") => { if (!run || !account) return; try { setError(null); const marketFixture = v13TradeFixture.markets[market]; const mandateLegs = multiLeg ? (fixtureCase === "normal" ? (v13MultiLegFixture.scenarios.normal[market] as any).legs : v13MultiLegFixture.scenarios.strictSettledCash.insufficientCash.legs) : [{ security: marketFixture.security, quantity: marketFixture.order.quantity, price: marketFixture.order.price, fee: marketFixture.order.fee }]; const validFrom = run.evidence.runClockNow; const orderCents = mandateLegs.reduce((sum: number, leg: any) => sum + Math.round(Number(leg.price) * 100) * leg.quantity + Math.round(Number(leg.fee) * 100), 0); const maxOrderAmount = (orderCents / 100).toFixed(2); const maxTotalAmount = ((orderCents * 2) / 100).toFixed(2); const securityScope = [...new Set(mandateLegs.map((leg: any) => leg.security ?? leg.securityId))]; const value = await api<any>(`/api/v1/acceptance/v1/v1.3/runs/${run.testRunId}/auto-mandates`, { method: "POST", body: JSON.stringify({ mandateId: crypto.randomUUID(), accountId: account.accountId, strategyVersion: "fixture-auto-policy-test-v1", market, currency: marketFixture.currency, securityScope, maxOrderAmount, maxTotalAmount, maxOrderCount: 2, validFrom, expiresAt: new Date(Date.parse(validFrom) + 4 * 60 * 60 * 1000).toISOString(), reason: "V1.3固定AUTO_POLICY Fixture授权" }) }); setAutoMandate(value); persistQuery("mandateId", value.mandateId); } catch (cause) { setError(String(cause)); } };
  const transitionMandate = async (action: "activate" | "pause") => { if (!run || !autoMandate) return; try { setError(null); const command = action === "activate" ? { mandateVersion: autoMandate.mandateVersion, contentHash: autoMandate.contentHash, reason: "人工核对精确Mandate版本并激活" } : { mandateVersion: autoMandate.mandateVersion, reason: "验收暂停AUTO_POLICY" }; const value = await api<any>(`/api/v1/acceptance/v1/v1.3/runs/${run.testRunId}/auto-mandates/${autoMandate.mandateId}/${action}`, { method: "POST", body: JSON.stringify(command) }); setAutoMandate((current:any) => ({ ...current, ...value })); } catch (cause) { setError(String(cause)); } };
  const decide = async (action: "approve" | "reject") => { if (!run || !proposal) return; try { setError(null); const value = await api<any>(`/api/v1/acceptance/v1/v1.3/runs/${run.testRunId}/proposals/${proposal.proposalId}/${action}`, { method: "POST", body: JSON.stringify({ expectedVersion: proposal.proposalVersion, expectedContentHash: proposal.contentHash, reason: action === "approve" ? "人工检查固定隔离Fixture提案" : "拒绝路径验收" }) }); setProposal((current:any) => ({ ...current, ...value })); } catch (cause) { setError(String(cause)); } };
  const reviseProposal = async () => { if (!run || !proposal || proposal.status !== "MANUAL_APPROVAL_PENDING") return; try { setError(null); const value = await api<any>(`/api/v1/acceptance/v1/v1.3/runs/${run.testRunId}/proposals/${proposal.proposalId}/revisions/append`, { method: "POST", body: JSON.stringify({ expectedVersion: proposal.proposalVersion, expectedContentHash: proposal.contentHash, operation: proposal.operation, expiresAt: "2026-10-08T10:00:00+08:00", legs: proposal.legs.map((leg:any)=>({...leg,quantity:leg.quantity+1})), reason: "追加版本修订验收" }) }); setProposal((current:any) => ({ ...current, ...value, legs: current.legs.map((leg:any)=>({...leg,quantity:leg.quantity+1})) })); } catch (cause) { setError(String(cause)); } };
  const executeProposal = async (sequenced = false) => { if (!run || !proposal) return; try { setError(null); const clientOrderId = `v13-${proposal.proposalId}`; await api<any>(`/api/v1/acceptance/v1/v1.3/runs/${run.testRunId}/proposals/${proposal.proposalId}/${sequenced ? "sequenced-execution" : "execution"}/submit`, { method: "POST", body: JSON.stringify({ clientOrderId }) }); const order = await api<any>(`/api/v1/acceptance/v1/v1.3/runs/${run.testRunId}/proposals/${proposal.proposalId}/orders/${encodeURIComponent(clientOrderId)}`); setExecution(order); const refreshed = await api<any>(`/api/v1/accounts/${proposal.accountId}`); if (refreshed.account?.testRunId === run.testRunId) setAccount(refreshed.account); } catch (cause) { setError(String(cause)); } };
  const sendSequencedReport = async (sequence: 1 | 2, replayCount = 1) => { if (!run || !proposal) return; try { setError(null); const clientOrderId = `v13-${proposal.proposalId}`; let value:any; for (let attempt=0; attempt<replayCount; attempt++) value = await api<any>(`/api/v1/acceptance/v1/v1.3/runs/${run.testRunId}/proposals/${proposal.proposalId}/orders/${encodeURIComponent(clientOrderId)}/sequenced-reports/${sequence}`, { method: "POST", body: "{}" }); setSequenceReport(value.report); setExecution(value.order); const refreshed = await api<any>(`/api/v1/accounts/${proposal.accountId}`); if (refreshed.account?.testRunId === run.testRunId) setAccount(refreshed.account); } catch (cause) { setError(String(cause)); } };
  const cancelPartialFill = async (cancelSequence = 2) => { if (!run || !proposal) return; try { setError(null); const clientOrderId = `v13-${proposal.proposalId}`; const value = await api<any>(`/api/v1/acceptance/v1/v1.3/runs/${run.testRunId}/proposals/${proposal.proposalId}/orders/${encodeURIComponent(clientOrderId)}/cancel-partial-fill`, { method: "POST", body: JSON.stringify({ cancelSequence }) }); setExecution(value.order); setSequenceReport(value); const refreshed = await api<any>(`/api/v1/accounts/${proposal.accountId}`); if (refreshed.account?.testRunId === run.testRunId) setAccount(refreshed.account); } catch (cause) { setError(String(cause)); } };
  const correctFillFee = async () => { if (!run || !proposal || !execution?.fill?.externalFillId) return; try { setError(null); const value = await api<any>(`/api/v1/acceptance/v1/v1.3/runs/${run.testRunId}/proposals/${proposal.proposalId}/orders/${encodeURIComponent(execution.order.clientOrderId)}/fills/${encodeURIComponent(execution.fill.externalFillId)}/fee-corrections`, { method: "POST", body: JSON.stringify({ revision: 1, previousFee: execution.fill.fee, correctedFee: market === "CN_A" ? "6.0000" : "0.0600" }) }); setFeeCorrection(value); } catch (cause) { setError(String(cause)); } };
  const executeAutoProposal = async () => { if (!run || !proposal || !autoMandate) return; try { setError(null); const clientOrderId = `v13-auto-${proposal.proposalId}`; const submitted = await api<any>(`/api/v1/acceptance/v1/v1.3/runs/${run.testRunId}/proposals/${proposal.proposalId}/auto-execution/submit`, { method: "POST", body: JSON.stringify({ mandateId: autoMandate.mandateId, mandateVersion: autoMandate.mandateVersion, clientOrderId }) }); const value = submitted.order ? { ...await api<any>(`/api/v1/acceptance/v1/v1.3/runs/${run.testRunId}/proposals/${proposal.proposalId}/orders/${encodeURIComponent(clientOrderId)}`), mandateBudgetVerification: submitted.mandateBudgetVerification } : submitted; setExecution(value); const refreshed = await api<any>(`/api/v1/accounts/${proposal.accountId}`); if (refreshed.account?.testRunId === run.testRunId) setAccount(refreshed.account); } catch (cause) { setError(String(cause)); } };
  const verifyNormalRun = async () => { if (!run || !proposal || !execution?.order || !execution?.fill) return; try { setError(null); const value = await api<any>(`/api/v1/acceptance/v1/v1.3/runs/${run.testRunId}/verify-normal`, { method: "POST", body: JSON.stringify({ proposalId: proposal.proposalId, clientOrderId: execution.order.clientOrderId }) }); setRun(value); } catch (cause) { setError(String(cause)); } };
  return <main><header><p className="eyebrow">StockQuant · 开发验收中心</p><h1>V1.3 治理、风控与模拟券商交易链路</h1><p>已接入隔离 TestRun、Portfolio 账户、MANUAL_APPROVAL与AUTO_POLICY建议、版本化Mandate，以及仅固定Fixture允许的预算/资源预留、FakeBroker模拟订单和Portfolio入账。</p></header>{error && <p role="alert" className="error">{error}</p>}<p role="status" data-testid="v13-business-boundary">AUTO_POLICY须先人工激活精确Mandate版本；Trade重读待授权建议，按批次预算和逐腿Portfolio资源预留后才调用FakeBroker。HOLD不下单。BUY只使用已结算现金，SELL所得在结算前保持应收。</p><p data-testid="v13-multileg-fixture">多腿及OD-014严格结算Fixture：{v13MultiLegFixture.fixtureId} · {v13MultiLegFixture.fixtureVersion} · SHA-256 {v13MultiLegFixtureManifest.files[0].sha256}</p><section><h2>场景与持久 TestRun</h2><label>验收场景<select aria-label="验收场景" value={scenario} onChange={(event)=>setScenario(event.target.value)}><option value="normal">正常提案</option><option value="rejection">人工拒绝</option><option value="recovery">版本冲突</option></select></label><button onClick={()=>void start()}>创建隔离 V1.3 TestRun</button>{run && <dl><dt>testRunId</dt><dd data-testid="v13-test-run-id">{run.testRunId}</dd><dt>状态</dt><dd data-testid="v13-run-status">{run.status}</dd><dt>业务交易执行</dt><dd>{run.evidence.businessExecution}</dd><dt>Run Clock</dt><dd data-testid="v13-run-clock">{run.evidence.runClockNow ?? "NOT_AVAILABLE"}</dd><dt>Fixture calendar</dt><dd data-testid="v13-calendar-version">{run.evidence.calendarVersion ?? "UNPINNED_UNTIL_ADVANCE"}</dd><dt>Session advances</dt><dd data-testid="v13-session-advance-count">{clockAdvances.length}</dd></dl>}{run && <pre data-testid="v13-session-advance-history">{JSON.stringify(clockAdvances)}</pre>}{account && <button data-testid="v13-advance-session" disabled={!account.positions?.some((position:any)=>position.quantity>0) && !account.unsettledReceivables?.some((item:any)=>item.status === "PENDING")} onClick={()=>void advanceSession()}>按交易日历推进到下一Fixture Session</button>}</section>{run && <section><h2>隔离账户与治理提案</h2><label>市场<select disabled={Boolean(account)} value={market} onChange={event=>setMarket(event.target.value as keyof typeof v13TradeFixture.markets)}><option value="CN_A">CN_A / CNY</option><option value="US_EQUITY">US_EQUITY / USD</option></select></label><button disabled={Boolean(account)} onClick={()=>void initialize()}>初始化本 Run 模拟账户（10000）</button>{account && <><p data-testid="v13-account-id">账户 {account.accountId} · {account.market} · 现金 {account.cash.amount} {account.cash.currency}</p><p data-testid="v13-positions">{JSON.stringify(account.positions ?? [])}</p></>}<button disabled={!account || Boolean(proposal)} onClick={()=>void createProposal("MANUAL_APPROVAL")}>创建MANUAL固定Fixture调仓提案</button><button data-testid="v13-create-multileg-proposal" disabled={!account || Boolean(proposal)} onClick={()=>void createProposal("MANUAL_APPROVAL","REBALANCE",undefined,true)}>创建双市场固定双腿BUY提案</button><button data-testid="v13-create-multileg-strict-manual-proposal" disabled={!account || Boolean(proposal) || market !== "CN_A"} onClick={()=>void createProposal("MANUAL_APPROVAL","REBALANCE",undefined,true,"strictSuccess")}>创建OD-014严格现金SELL+BUY MANUAL提案</button><button data-testid="v13-create-sequenced-proposal" disabled={!account || Boolean(proposal)} onClick={()=>void createProposal("MANUAL_APPROVAL","REBALANCE",200)}>创建固定双市场200股因果成交Fixture提案</button><button data-testid="v13-create-l08-proposal" disabled={!account || Boolean(proposal) || market !== "CN_A"} onClick={()=>void createProposal("MANUAL_APPROVAL","REBALANCE",100)}>创建L08 100股部分成交撤单Fixture提案</button><button disabled={!account || Boolean(proposal)} onClick={()=>void createProposal("AUTO_POLICY","REBALANCE")}>创建AUTO_POLICY固定调仓建议</button><button disabled={!account || Boolean(proposal)} onClick={()=>void createProposal("AUTO_POLICY","HOLD")}>创建AUTO_POLICY HOLD建议</button>{account && <section aria-label="AUTO_POLICY Mandate"><h3>AUTO_POLICY预算Mandate</h3>{!autoMandate && <><button data-testid="v13-create-auto-mandate" onClick={()=>void createAutoMandate()}>创建本Run固定AUTO_POLICY Mandate</button><button data-testid="v13-create-auto-multileg-mandate" onClick={()=>void createAutoMandate(true)}>创建覆盖双腿的AUTO_POLICY Mandate</button><button data-testid="v13-create-auto-strict-mandate" onClick={()=>void createAutoMandate(true,"strictInsufficient")}>创建OD-014严格现金多腿AUTO_POLICY Mandate</button></>}{autoMandate && <><p data-testid="v13-auto-mandate-state">{autoMandate.mandateId} · v{autoMandate.mandateVersion} · {autoMandate.status} · 单笔 {autoMandate.maxOrderAmount} / 累计 {autoMandate.maxTotalAmount} {autoMandate.currency} · 最多{autoMandate.maxOrderCount}单</p><button data-testid="v13-activate-auto-mandate" disabled={autoMandate.status !== "PENDING"} onClick={()=>void transitionMandate("activate")}>人工激活精确Mandate版本</button><button data-testid="v13-create-auto-multileg-proposal" disabled={!account || Boolean(proposal) || autoMandate?.status !== "ACTIVE"} onClick={()=>void createProposal("AUTO_POLICY","REBALANCE",undefined,true)}>创建AUTO_POLICY固定两腿BUY建议</button><button data-testid="v13-create-auto-strict-proposal" disabled={!account || Boolean(proposal) || autoMandate?.status !== "ACTIVE" || market !== "CN_A"} onClick={()=>void createProposal("AUTO_POLICY","REBALANCE",undefined,true,"strictInsufficient")}>创建OD-014严格现金SELL+BUY AUTO建议</button><button data-testid="v13-pause-auto-mandate" disabled={autoMandate.status !== "ACTIVE"} onClick={()=>void transitionMandate("pause")}>暂停AUTO_POLICY</button></>}</section>}{proposal && <><dl><dt>proposalId</dt><dd data-testid="v13-proposal-id">{proposal.proposalId}</dd><dt>版本 / Hash</dt><dd data-testid="v13-proposal-version">{proposal.proposalVersion} / {proposal.contentHash}</dd><dt>治理状态</dt><dd data-testid="v13-proposal-status">{proposal.status}</dd><dt>市场 / 策略</dt><dd>{proposal.legs?.[0]?.securityId} / {proposal.strategyVersion}</dd></dl><button disabled={proposal.status !== "MANUAL_APPROVAL_PENDING"} onClick={()=>void reviseProposal()}>追加提案修订版本</button><button disabled={proposal.status !== "MANUAL_APPROVAL_PENDING"} onClick={()=>void decide("approve")}>人工批准</button><button disabled={proposal.status !== "MANUAL_APPROVAL_PENDING"} onClick={()=>void decide("reject")}>人工拒绝</button><button data-testid="v13-execute-proposal" disabled={proposal.status !== "APPROVED_MANUAL"} onClick={()=>void executeProposal()}>执行人工批准的固定Fixture提案</button><button data-testid="v13-verify-normal-run" disabled={run.scenarioId !== "normal" || run.status !== "WAITING" || proposal.status !== "APPROVED_MANUAL" || execution?.order?.status !== "FILLED" || execution?.fill?.quantity !== 100 || market !== "CN_A"} onClick={()=>void verifyNormalRun()}>核验并完成正常场景</button><button data-testid="v13-execute-sequenced-proposal" disabled={proposal.status !== "APPROVED_MANUAL" || ![100,200].includes(proposal.legs?.[0]?.quantity)} onClick={()=>void executeProposal(true)}>启动固定工作中订单（乱序成交验收）</button><button data-testid="v13-sequence-2-replay" disabled={!execution?.order || proposal.legs?.[0]?.quantity !== 200} onClick={()=>void sendSequencedReport(2,1)}>发送seq2（累计150，先到）</button><button data-testid="v13-sequence-2-replay-10" disabled={!execution?.order || proposal.legs?.[0]?.quantity !== 200} onClick={()=>void sendSequencedReport(2,10)}>将同一seq2重放10次</button><button data-testid="v13-sequence-1" disabled={!execution?.order || ![100,200].includes(proposal.legs?.[0]?.quantity)} onClick={()=>void sendSequencedReport(1,1)}>发送seq1（成交40股或累计100股）</button><button data-testid="v13-l08-cancel-partial-fill" disabled={!execution?.fill?.externalFillId || proposal.legs?.[0]?.quantity !== 100 || execution.order?.status !== "PARTIALLY_FILLED"} onClick={()=>void cancelPartialFill()}>seq1部分成交后请求撤单并应用seq2成功结果</button><button data-testid="v13-l08-cancel-after-fill" disabled={proposal.legs?.[0]?.quantity !== 200 || execution?.order?.status !== "PARTIALLY_FILLED" || !sequenceReport} onClick={()=>void cancelPartialFill(3)}>seq1/seq2成交事件交付后应用seq3撤单结果</button><button data-testid="v13-execute-auto-proposal" disabled={proposal.status !== "AUTO_POLICY_PENDING" || autoMandate?.status !== "ACTIVE"} onClick={()=>void executeAutoProposal()}>按活动Mandate执行AUTO_POLICY建议</button></>}{execution?.fill?.externalFillId && <><button data-testid="v13-correct-fill-fee" onClick={()=>void correctFillFee()}>提交成交手续费更正（revision 1）</button>{feeCorrection && <pre data-testid="v13-fee-correction">{JSON.stringify(feeCorrection,null,2)}</pre>}</>}{sequenceReport && <pre data-testid="v13-sequenced-report">{JSON.stringify(sequenceReport)}</pre>}{execution && <dl data-testid="v13-order"><dt>执行结果</dt><dd data-testid="v13-auto-decision">{execution.decision?.status ?? "ORDER_SUBMITTED"}</dd><dt>FakeBroker订单</dt><dd>{execution.orders?.length > 1 ? execution.orders.map((item:any)=><span key={item.order?.order_id}>{item.clientOrderId ?? item.order?.clientOrderId}: {item.order?.order_id ?? item.order?.orderId} · {item.order?.status}; </span>) : execution.order ? `${execution.order.order_id ?? execution.order.orderId} · ${execution.order.status}` : "NONE"}</dd><dt>成交</dt><dd>{execution.fills?.length > 1 ? execution.fills.map((item:any)=><span key={item.externalFillId}>{item.quantity} × {item.price} · fee {item.fee}; </span>) : execution.fill ? `${execution.fill.quantity} × ${execution.fill.price} · fee ${execution.fill.fee}` : "NONE"}</dd><dt>成交Outbox</dt><dd>{execution.outbox?.status ?? execution.outbox?.state ?? "NONE"}</dd><dt>费用更正Outbox</dt><dd data-testid="v13-fee-correction-outbox">{execution.feeCorrectionOutbox ? `${execution.feeCorrectionOutbox.status} · attempts ${execution.feeCorrectionOutbox.attempts}` : "NONE"}</dd><dt>独立FakeBroker对账</dt><dd data-testid="v13-reconciliation">{execution.reconciliation?.status ?? "NOT_RUN"}</dd><dt>Mandate预算独立读回</dt><dd data-testid="v13-mandate-budget">{execution.mandateBudgetVerification?.status ?? "NOT_RUN"} · {execution.mandateBudgetVerification?.snapshot ? JSON.stringify(execution.mandateBudgetVerification.snapshot) : "NO_SNAPSHOT"}</dd><dt>FakeBroker现金</dt><dd>{execution.independentAssets?.current_cash ? `${execution.independentAssets.current_cash} ${execution.independentAssets.currency}` : "NOT_CHANGED"}</dd></dl>}</section>}{run && <section aria-label="独立 FakeBroker 对账"><h2>独立 FakeBroker 对账</h2><p>本场景只记录带本 TestRun 标识的模拟外部订单，用于验证差异可追踪；不会生成本地订单、成交或Portfolio账本。</p><button data-testid="v13-observe-external-order" disabled={Boolean(reconciliation?.externalOnlyOrderCount)} onClick={()=>void recordExternalOrder()}>记录固定外部模拟订单</button>{reconciliation && <><p data-testid="v13-external-order-count">外部未匹配订单：{reconciliation.externalOnlyOrderCount ?? 0}</p>{(reconciliation.discrepancies ?? []).length > 0 && <ul data-testid="v13-reconciliation-discrepancies">{reconciliation.discrepancies.map((item:any)=><li key={item.externalOrderId}>{item.kind} · {item.externalOrderId} · {item.security} {item.requestedQuantity}股 · {item.status} · {item.evidenceRef}</li>)}</ul>}</>}</section>}{run && <section><h2>交易链证据边界</h2><pre data-testid="v13-evidence">{JSON.stringify(run.evidence,null,2)}</pre><table><thead><tr><th>断言</th><th>状态</th><th>预期</th><th>实际</th></tr></thead><tbody>{run.assertions.map((item:any)=><tr key={item.assertionId}><td>{item.assertionId}</td><td>{item.status}</td><td><code>{JSON.stringify(item.expected)}</code></td><td><code>{JSON.stringify(item.actual)}</code></td></tr>)}</tbody></table></section>}</main>;
}

function V14Acceptance() {
  const [scenario, setScenario] = useState("normal");
  const [initialCashCents, setInitialCashCents] = useState(1_000_000);
  const [targetQuantity, setTargetQuantity] = useState(100);
  const [participationRateBasisPoints, setParticipationRateBasisPoints] = useState(100);
  const [slippageBasisPoints, setSlippageBasisPoints] = useState(0);
  const [fixedFeeCents, setFixedFeeCents] = useState(500);
  const [marketFeeMode, setMarketFeeMode] = useState(false);
  const [marketFeeScheduleId, setMarketFeeScheduleId] = useState("CN_A_CASH_EQUITY_2023_08_28");
  const [commissionRatePartsPerBillion, setCommissionRatePartsPerBillion] = useState(2_000_000);
  const [minimumCommissionCents, setMinimumCommissionCents] = useState(500);
  const [sellSignalDate, setSellSignalDate] = useState("");
  const [sellExecutionDate, setSellExecutionDate] = useState("");
  const [sellQuantity, setSellQuantity] = useState(0);
  const [run, setRun] = useState<any>(null);
  const [history, setHistory] = useState<any[]>([]);
  const [runId, setRunId] = useState<string>(() => window.localStorage.getItem(V14_RUN_STORAGE_KEY) ?? "");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    if (!runId) return;
    let active = true;
    let timer: number | undefined;
    const restore = async () => {
      setError(null);
      setBusy(true);
      try {
        for (let attempt = 0; attempt < 120; attempt += 1) {
          const restored = await api<any>(`/api/v1/acceptance/v1/v1.4/runs/${runId}`);
          if (!active) return;
          setRun(restored);
          if (["COMPLETED", "FAILED", "CANCELLED"].includes(restored.status)) {
            setHistory((previous) => previous.some((item) => item.testRunId === restored.testRunId) ? previous : [...previous, restored]);
            return;
          }
          await new Promise<void>((resolve) => { timer = window.setTimeout(resolve, 250); });
        }
        if (active) setError("回测任务超过 30 秒仍未完成，可稍后刷新页面继续按 TestRun ID 恢复查看");
      } catch (cause) {
        if (active) setError(String(cause));
      } finally {
        if (active) setBusy(false);
      }
    };
    void restore();
    return () => { active = false; if (timer !== undefined) window.clearTimeout(timer); };
  }, [runId]);
  const start = async () => {
    try {
      setBusy(true); setError(null);
      const sellFields = [sellSignalDate.length > 0, sellExecutionDate.length > 0, sellQuantity > 0];
      if (sellFields.some(Boolean) && !sellFields.every(Boolean)) throw new Error("卖出信号日、执行日和数量须同时填写，或全部留空");
      const effectiveSell = scenario === "historical-fees" ? { signalDate: "2023-08-24", executionDate: "2023-08-25", quantity: targetQuantity } : sellFields.every(Boolean) ? { signalDate: sellSignalDate, executionDate: sellExecutionDate, quantity: sellQuantity } : undefined;
      const policy = { initialCashCents, targetQuantity, participationRateBasisPoints, slippageBasisPoints, fixedFeeCents, ...(marketFeeMode || scenario === "historical-fees" ? { marketFeeSchedule: { scheduleId: scenario === "historical-fees" ? "CN_A_CASH_EQUITY_2022_04_29_TO_2023_08_27" : marketFeeScheduleId, commissionRatePartsPerBillion, minimumCommissionCents } } : {}), ...(effectiveSell ? { sellOrder: effectiveSell } : {}) };
      const accepted = await api<any>("/api/v1/acceptance/v1/v1.4/runs", { method: "POST", body: JSON.stringify({ scenarioId: scenario, seed: 20260907, ...(scenario === "corporate-actions" ? {} : { policy }) }) });
      window.localStorage.setItem(V14_RUN_STORAGE_KEY, accepted.testRunId);
      setRunId(accepted.testRunId);
      setRun({ ...accepted, scenarioId: scenario, evidence: { v14Task: { phase: "QUEUED" } }, assertions: [] });
    } catch (cause) { setError(String(cause)); }
    finally { setBusy(false); }
  };
  const cancel = async () => {
    if (!run?.testRunId) return;
    try { setError(null); await api(`/api/v1/acceptance/v1/v1.4/runs/${run.testRunId}/cancel`, { method: "POST", body: "{}" }); }
    catch (cause) { setError(String(cause)); }
  };
  const metrics = run?.evidence?.metrics;
  const previous = history.length > 1 ? history.at(-2) : null;
  const comparisonMetrics = ["returnBasisPoints", "maxDrawdownBasisPoints", "turnoverCents", "feesCents", "fillRateBasisPoints", "rejectedOrders", "partiallyFilledOrders", "unfilledQuantity", "finalCashCents", "finalNavCents"];
  return <main>
    <header><p className="eyebrow">StockQuant · 回测研究</p><h1>V1.4 日线历史回测与可核对报告</h1><p>DAILY_BAR / BACKTEST / FAKE。输入使用冻结日线 Fixture，日终信号最早在下一交易日执行；结果不代表真实市场收益。</p></header>
    {error && <p role="alert" className="error">{error}</p>}
    <section aria-labelledby="v14-config-title">
      <h2 id="v14-config-title">运行配置</h2>
      {scenario === "corporate-actions" && <p>此场景采用冻结账务输入：初始现金 200000 分、买入 100 股、RAW 价格、费用 0；其他策略表单字段不适用于该场景。</p>}
      <div className="form-grid">
      <label>场景<select aria-label="回测场景" value={scenario} onChange={(event)=>{setScenario(event.target.value); if(event.target.value === "historical-fees"){setMarketFeeMode(true);setMarketFeeScheduleId("CN_A_CASH_EQUITY_2022_04_29_TO_2023_08_27");}}}><option value="normal">正常：净值和成交</option><option value="rejection">拒绝：未来成交时间</option><option value="recovery">恢复：取消后固定输入复跑</option><option value="market-restrictions">合成：停牌与限制价（Fixture）</option><option value="historical-fees">合成历史日期费率（Fixture）</option><option value="corporate-actions">合成：RAW拆股与现金分红（Fixture）</option></select></label>
        <label>初始现金（分）<input aria-label="初始现金（分）" type="number" min="1" step="1" value={initialCashCents} onChange={(event)=>setInitialCashCents(Number(event.target.value))} /></label>
        <label>目标股数<input aria-label="目标股数" type="number" min="1" step="1" value={targetQuantity} onChange={(event)=>setTargetQuantity(Number(event.target.value))} /></label>
        <label>参与率（基点）<input aria-label="参与率（基点）" type="number" min="1" max="10000" step="1" value={participationRateBasisPoints} onChange={(event)=>setParticipationRateBasisPoints(Number(event.target.value))} /></label>
        <label>不利滑点（基点）<input aria-label="不利滑点（基点）" type="number" min="0" max="10000" step="1" value={slippageBasisPoints} onChange={(event)=>setSlippageBasisPoints(Number(event.target.value))} /></label>
        <label>固定费用（分）<input aria-label="固定费用（分）" type="number" min="0" step="1" value={fixedFeeCents} onChange={(event)=>setFixedFeeCents(Number(event.target.value))} /></label>
        <label>费用模型<select aria-label="费用模型" value={marketFeeMode ? "cn-a" : "fixed"} onChange={(event)=>setMarketFeeMode(event.target.value === "cn-a")}><option value="fixed">固定费用（兼容旧场景）</option><option value="cn-a">A股费率参数（非券商报价）</option></select></label>
        {marketFeeMode && <><label>费率日期<select aria-label="A股费率日期" value={marketFeeScheduleId} onChange={(event)=>setMarketFeeScheduleId(event.target.value)}><option value="CN_A_CASH_EQUITY_2022_04_29_TO_2023_08_27">历史费表：2022-04-29 至 2023-08-27</option><option value="CN_A_CASH_EQUITY_2023_08_28">现行费表：2023-08-28 起</option></select></label><label>佣金参数（ppb；历史最低68,700，现行最低54,100）<input aria-label="佣金参数ppb" type="number" min={marketFeeScheduleId === "CN_A_CASH_EQUITY_2022_04_29_TO_2023_08_27" ? 68700 : 54100} max="3000000" step="1" value={commissionRatePartsPerBillion} onChange={(event)=>setCommissionRatePartsPerBillion(Number(event.target.value))} /></label><label>最低佣金（分；用户配置）<input aria-label="最低佣金（分）" type="number" min="0" step="1" value={minimumCommissionCents} onChange={(event)=>setMinimumCommissionCents(Number(event.target.value))} /></label><p>费用含对应日期的经手费、过户费与卖方印花税；佣金和最低佣金由用户按账户合同填写。执行日必须处于所选费表有效期，结果不代表券商账单。</p></>}
        <label>卖出信号日（可选）<input aria-label="卖出信号日" type="date" value={sellSignalDate} onChange={(event)=>setSellSignalDate(event.target.value)} /></label>
        <label>卖出执行日（可选）<input aria-label="卖出执行日" type="date" value={sellExecutionDate} onChange={(event)=>setSellExecutionDate(event.target.value)} /></label>
        <label>卖出数量（股，可选）<input aria-label="卖出数量" type="number" min="0" step="1" value={sellQuantity} onChange={(event)=>setSellQuantity(Number(event.target.value))} /></label>
      </div>
      <button disabled={busy} onClick={()=>void start()}>{busy ? "运行中…" : "运行回测"}</button>
      {run?.status === "RUNNING" && <button onClick={()=>void cancel()}>取消当前回测</button>}
    </section>
    {run && <>
      <section aria-labelledby="v14-report-title">
        <h2 id="v14-report-title" data-testid="v14-report-title">运行结果</h2>
        <dl><dt>testRunId</dt><dd data-testid="v14-test-run-id">{run.testRunId}</dd><dt>状态</dt><dd data-testid="v14-run-status">{run.status}</dd><dt>数据版本</dt><dd>{run.evidence.dataVersion}</dd><dt>Fixture SHA-256</dt><dd><code>{run.evidence.fixtureSha256}</code></dd><dt>执行组件与模型</dt><dd data-testid="v14-execution-model">{run.evidence.executionModel?.component ?? "UNSPECIFIED"} / {run.evidence.executionModel?.modelId ?? "UNSPECIFIED"}</dd><dt>运行模式</dt><dd>{run.evidence.barType} / {run.evidence.environmentMode} / {run.evidence.brokerMode}</dd></dl>
        {metrics && <><h3>绩效与资金</h3><table><thead><tr><th>指标</th><th>结果</th></tr></thead><tbody>
          <tr><th>累计收益</th><td>{metrics.returnBasisPoints} bp</td></tr>{run.evidence?.benchmark && <><tr><th>基准收益（{run.evidence.benchmark.benchmarkId}）</th><td data-testid="v14-benchmark-return">{run.evidence.benchmark.returnBasisPoints} bp</td></tr><tr><th>超额收益</th><td data-testid="v14-excess-return">{run.evidence.benchmark.excessReturnBasisPoints} bp</td></tr></>}<tr><th>最大回撤</th><td>{metrics.maxDrawdownBasisPoints} bp</td></tr><tr><th>成交金额</th><td>{metrics.turnoverCents} 分</td></tr><tr><th>费用</th><td>{metrics.feesCents} 分</td></tr><tr><th>成交率</th><td>{metrics.fillRateBasisPoints} bp</td></tr><tr><th>拒绝订单</th><td>{metrics.rejectedOrders}</td></tr><tr><th>部分成交订单</th><td>{metrics.partiallyFilledOrders}</td></tr><tr><th>未成交数量</th><td>{metrics.unfilledQuantity}</td></tr><tr><th>期末现金</th><td data-testid="v14-final-cash">{metrics.finalCashCents} 分</td></tr><tr><th>期末净值</th><td>{metrics.finalNavCents} 分</td></tr>
        </tbody></table></>}
        <h3>逐日净值</h3><table data-testid="v14-nav"><thead><tr><th>日期</th><th>净值（分）</th></tr></thead><tbody>{(run.evidence.nav ?? []).map((point:any)=><tr key={point.date}><td>{point.date}</td><td>{point.valueCents}</td></tr>)}</tbody></table>
        {run.scenarioId === "corporate-actions" && <><h3>公司行动账本（RAW价格，合成Fixture）</h3><p>成交价格保持原始口径；拆股更新股数，现金分红在除权日记应收并在支付日结算。不得再叠加复权价格。</p><table data-testid="v14-corporate-actions"><thead><tr><th>事件</th><th>除权日</th><th>类型</th><th>持股/应收变化</th><th>支付日/结算</th></tr></thead><tbody>{(run.evidence.corporateActionLedger ?? []).map((action:any)=><tr key={action.actionId}><td>{action.actionId}</td><td>{action.exDate}</td><td>{action.kind}</td><td>{action.kind === "SPLIT" ? String(action.quantityBefore) + " → " + String(action.quantityAfter) + " 股" : String(action.entitledQuantity) + " 股 × " + String(action.amountPerShareCents) + " 分 = " + String(action.receivableCents) + " 分"}</td><td>{action.payDate ?? "—"} / {action.settledCents ?? action.cashDeltaCents} 分</td></tr>)}</tbody></table><p data-testid="v14-corporate-action-replays">相同事件重复投递忽略：{run.evidence.duplicateDeliveriesIgnored ?? 0} 次；价格口径：{run.evidence.priceBasis}</p></>}
        <h3>持仓与可卖数量（A股 T+1）</h3><p>当日收盘成交的持仓计入估值，但当日不可卖；只有在Fixture中的下一交易日才转为可卖。未卖出持仓不会重复计入现金。</p><table data-testid="v14-position-availability"><thead><tr><th>日期</th><th>证券</th><th>持仓</th><th>可卖</th><th>未到可卖日</th></tr></thead><tbody>{(run.evidence.positionAvailability ?? []).map((position:any)=><tr key={`${position.date}-${position.securityId}`}><td>{position.date}</td><td>{position.securityId}</td><td>{position.heldQuantity}</td><td>{position.sellableQuantity}</td><td>{position.unsettledQuantity}</td></tr>)}</tbody></table>
        <h3>现金与卖出款结算</h3><table data-testid="v14-cash-ledger"><thead><tr><th>日期</th><th>已结算现金（分）</th><th>未结算卖出款（分）</th></tr></thead><tbody>{(run.evidence.cashLedger ?? []).map((entry:any)=><tr key={entry.date}><td>{entry.date}</td><td>{entry.settledCashCents}</td><td>{entry.unsettledSaleProceedsCents}</td></tr>)}</tbody></table><table data-testid="v14-settlements"><thead><tr><th>卖出日</th><th>结算日</th><th>净卖出款（分）</th><th>状态</th></tr></thead><tbody>{(run.evidence.settlements ?? []).map((entry:any,index:number)=><tr key={`${entry.tradeDate}-${index}`}><td>{entry.tradeDate}</td><td>{entry.settlementDate ?? "窗口内未结算"}</td><td>{entry.proceedsCents}</td><td>{entry.status}</td></tr>)}</tbody></table><table data-testid="v14-order-outcomes"><thead><tr><th>方向</th><th>请求数量</th><th>成交数量</th><th>状态</th><th>原因</th></tr></thead><tbody>{(run.evidence.orderOutcomes ?? []).map((order:any,index:number)=><tr key={`${order.executionDate}-${index}`}><td>{order.side}</td><td>{order.requestedQuantity}</td><td>{order.filledQuantity}</td><td>{order.status}</td><td>{order.reason ?? "—"}</td></tr>)}</tbody></table>
        <h3>成交明细</h3><table data-testid="v14-trades"><thead><tr><th>方向</th><th>证券</th><th>数量</th><th>成交价（分）</th><th>佣金（分）</th><th>过户费（分）</th><th>印花税（分）</th><th>总费用（分）</th><th>信号日</th><th>成交日</th></tr></thead><tbody>{(run.evidence.trades ?? []).map((trade:any,index:number)=><tr key={`${trade.executionDate}-${index}`}><td>{trade.side}</td><td>{trade.securityId ?? "600000.SH"}</td><td>{trade.quantity}</td><td>{trade.priceCents}</td><td>{trade.feeBreakdown?.commissionCents ?? trade.feeCents}</td><td>{trade.feeBreakdown?.transferFeeCents ?? 0}</td><td>{trade.feeBreakdown?.stampDutyCents ?? 0}</td><td>{trade.feeCents}</td><td>{trade.signalDate}</td><td>{trade.executionDate}</td></tr>)}</tbody></table>
        <h3>后端断言</h3><table><thead><tr><th>断言</th><th>状态</th><th>预期</th><th>实际</th></tr></thead><tbody>{run.assertions.map((assertion:any)=><tr key={assertion.assertionId}><td>{assertion.assertionId}</td><td>{assertion.status}</td><td><code>{JSON.stringify(assertion.expected)}</code></td><td><code>{JSON.stringify(assertion.actual)}</code></td></tr>)}</tbody></table>
        <details><summary>查看完整证据</summary><pre data-testid="v14-evidence">{JSON.stringify(run.evidence,null,2)}</pre></details>
      </section>
      {previous && <section aria-labelledby="v14-comparison-title"><h2 id="v14-comparison-title" data-testid="v14-comparison-title">本页运行比较</h2><p>比较当前浏览器会话中最近两次运行；每次运行均独立持久化，可通过 testRunId 单独复核。</p><table data-testid="v14-comparison"><thead><tr><th>指标</th><th>前一次 · {previous.testRunId}</th><th>当前 · {run.testRunId}</th></tr></thead><tbody>{comparisonMetrics.map((key)=><tr key={key}><th>{key}</th><td>{previous.evidence?.metrics?.[key] ?? "—"}</td><td>{metrics?.[key] ?? "—"}</td></tr>)}</tbody></table></section>}
    </>}
  </main>;
}

function V15Acceptance() {
  const runStorageKey = "stockquant:v15:testRunId";
  const [scenario, setScenario] = useState("normal");
  const [run, setRun] = useState<any>(null);
  const [runIncidents, setRunIncidents] = useState<any[]>([]);
  const [runId, setRunId] = useState(() => window.localStorage.getItem(runStorageKey) ?? "");
  const [runHistory, setRunHistory] = useState<any[]>([]);
  const [comparisonRunId, setComparisonRunId] = useState("");
  const [comparisonRun, setComparisonRun] = useState<any>(null);
  const [selectedFillId, setSelectedFillId] = useState("");
  const [fillLookupId, setFillLookupId] = useState("");
  const [error, setError] = useState<string | null>(null);
  const refresh = async (testRunId: string) => {
    const [nextRun, incidents] = await Promise.all([
      api<any>(`/api/v1/acceptance/v1/v1.5/runs/${testRunId}`),
      api<any[]>(`/api/v1/acceptance/v1/v1.5/runs/${testRunId}/incidents`),
    ]);
    setRun(nextRun);
    setRunIncidents(incidents);
  };
  const refreshRunHistory = async (currentRunId?: string) => {
    const rows = await api<any[]>("/api/v1/acceptance/v1/v1.5/runs?limit=20");
    setRunHistory(rows);
    const otherRun = rows.find((item) => item.testRunId !== currentRunId);
    setComparisonRunId((selected) => selected && rows.some((item) => item.testRunId === selected && item.testRunId !== currentRunId) ? selected : otherRun?.testRunId ?? "");
  };
  const openHistoricalRun = async (testRunId: string) => {
    if (!runHistory.some((item) => item.testRunId === testRunId)) {
      setError("只能打开当前用户近期运行列表中的 TestRun。");
      return;
    }
    try {
      setError(null);
      setSelectedFillId("");
      setRun(null);
      setRunIncidents([]);
      window.localStorage.setItem(runStorageKey, testRunId);
      setRunId(testRunId);
    } catch (e) { setError(String(e)); }
  };
  const findFillTrace = async () => {
    const externalFillId = fillLookupId.trim();
    if (!externalFillId) { setError("请输入成交 Fill ID。"); return; }
    try {
      setError(null);
      const found = await api<any>(`/api/v1/acceptance/v1/v1.5/fills/${encodeURIComponent(externalFillId)}/trace`);
      window.localStorage.setItem(runStorageKey, found.testRunId);
      setRunId(found.testRunId);
      setRun(found);
      setSelectedFillId(externalFillId);
      setRunIncidents(await api<any[]>(`/api/v1/acceptance/v1/v1.5/runs/${found.testRunId}/incidents`));
      await refreshRunHistory(found.testRunId);
    } catch (e) { setError(String(e)); }
  };
  const start = async () => {
    try {
      setError(null);
      const accepted = await api<any>("/api/v1/acceptance/v1/v1.5/runs", { method: "POST", body: JSON.stringify({ scenarioId: scenario, seed: 20260907 }) });
      window.localStorage.setItem(runStorageKey, accepted.testRunId);
      setRunId(accepted.testRunId);
      await refresh(accepted.testRunId);
      await refreshRunHistory(accepted.testRunId);
    } catch (e) { setError(String(e)); }
  };
  const cancelAutoTrade = async () => {
    if (!run?.testRunId) return;
    try { setError(null); await api<any>(`/api/v1/acceptance/v1/v1.5/runs/${run.testRunId}/cancel`, { method: "POST" }); await refresh(run.testRunId); }
    catch (e) { setError(String(e)); }
  };
  const acknowledgeRunIncident = async (incidentId: string) => {
    if (!run?.testRunId) return;
    try {
      setError(null);
      await api<any>(`/api/v1/acceptance/v1/v1.5/runs/${run.testRunId}/incidents/${incidentId}/acknowledge`, { method: "POST", body: "{}" });
      await refresh(run.testRunId);
    } catch (e) { setError(String(e)); }
  };
  useEffect(() => {
    if (!runId) return;
    let active = true;
    void Promise.all([
      api<any>(`/api/v1/acceptance/v1/v1.5/runs/${runId}`).then((value) => { if (active) setRun(value); }),
      api<any[]>(`/api/v1/acceptance/v1/v1.5/runs/${runId}/incidents`).then((value) => { if (active) setRunIncidents(value); }),
      refreshRunHistory(runId)
    ]).catch((e) => { if (active) setError(String(e)); });
    return () => { active = false; };
  }, [runId]);
  useEffect(() => {
    if (!comparisonRunId || comparisonRunId === run?.testRunId) { setComparisonRun(null); return; }
    let active = true;
    void api<any>(`/api/v1/acceptance/v1/v1.5/runs/${comparisonRunId}`).then((value) => { if (active) setComparisonRun(value); }).catch((e) => { if (active) setError(String(e)); });
    return () => { active = false; };
  }, [comparisonRunId, run?.testRunId]);
  useEffect(() => {
    if (!run?.testRunId || run.evidence?.temporal === "COMPLETED" || run.evidence?.workflow === "NOT_CONNECTED") return;
    let active = true;
    const timer = window.setInterval(() => { if (active) void refresh(run.testRunId).catch((e) => { if (active) setError(String(e)); }); }, 1000);
    return () => { active = false; window.clearInterval(timer); };
  }, [run?.testRunId, run?.evidence?.temporal, run?.evidence?.workflow]);
  const orderTraces = Array.isArray(run?.evidence?.orders) ? run.evidence.orders : [];
  const fillTraces = orderTraces.filter((item: any) => item.fill?.externalFillId);
  const selectedFillTrace = fillTraces.find((item: any) => item.fill.externalFillId === selectedFillId) ?? fillTraces[0];
  const capabilityRows = run ? getV15CapabilityRows(run.evidence ?? {}) : [];
  return <main>
    <header><p className="eyebrow">StockQuant · 开发验收中心</p><h1>V1.5 无人调度、故障恢复与 V1 验收</h1><p>NO_TRADE 由 Temporal 后台逐日读取权威账本；AUTO Fixture 单独执行双市场模拟订单并核对 Portfolio/FakeBroker。两条路径都只使用隔离 PAPER + FAKE；AUTO已覆盖单日Fixture收盘对账，多日调度、交易故障恢复及全V1备份验收仍待完成。</p></header>
    {error && <p role="alert" className="error">{error}</p>}
    <section><h2>调度场景</h2><select aria-label="调度场景" value={scenario} onChange={(e)=>setScenario(e.target.value)}><option value="normal">后台调度与 60 日 HOLD</option><option value="auto-trade">双市场 Fixture 自动交易</option><option value="rejection">暂停与窗口拒绝</option><option value="recovery">Worker/总线与备份恢复</option></select><button onClick={()=>void start()}>准备 V1.5 场景</button><button disabled={!run?.testRunId} onClick={()=>run?.testRunId && void refresh(run.testRunId)}>刷新运行</button>{run?.scenarioId === "auto-trade" && run?.status === "WAITING" && run?.evidence?.temporal !== "COMPLETED" && !run?.evidence?.autoTradeCancellation && <button data-testid="v15-auto-cancel" onClick={()=>void cancelAutoTrade()}>取消后续 AUTO 订单</button>}</section>
    <section aria-label="按成交ID追溯"><h2>按成交ID追溯 V1.5 完整链路</h2><label>External Fill ID<input aria-label="External Fill ID" data-testid="v15-fill-lookup" value={fillLookupId} onChange={(event)=>setFillLookupId(event.target.value)} /></label><button data-testid="v15-find-fill" onClick={()=>void findFillTrace()}>查找成交</button><p>查询范围为当前用户全部 V1.5 TestRun；查找结果会打开其只读订单、授权、Outbox与双账本证据。</p></section>
    {run && runHistory.length > 0 && <section aria-label="运行历史"><h2>近期运行</h2><label>打开历史运行（只读）<select aria-label="打开历史运行" data-testid="v15-open-run-select" value={run.testRunId} onChange={(event) => void openHistoricalRun(event.target.value)}><option value={run.testRunId}>{run.scenarioId} · {run.status} · {run.testRunId}</option>{runHistory.filter((item) => item.testRunId !== run.testRunId).map((item) => <option key={item.testRunId} value={item.testRunId}>{item.scenarioId} · {item.status} · {item.testRunId}</option>)}</select></label></section>}
    {run && runHistory.some((item) => item.testRunId !== run.testRunId) && <section aria-label="运行比较"><h2>同一用户的近期运行比较</h2><label>比较运行<select aria-label="选择比较运行" data-testid="v15-compare-run-select" value={comparisonRunId} onChange={(event) => setComparisonRunId(event.target.value)}><option value="">请选择历史运行</option>{runHistory.filter((item) => item.testRunId !== run.testRunId).map((item) => <option key={item.testRunId} value={item.testRunId}>{item.scenarioId} · {item.status} · {item.testRunId}</option>)}</select></label>{comparisonRun && <table data-testid="v15-run-comparison"><thead><tr><th>指标</th><th>当前运行 · {run.testRunId}</th><th>对比运行 · {comparisonRun.testRunId}</th></tr></thead><tbody>{[
      ["场景", run.scenarioId, comparisonRun.scenarioId], ["状态", run.status, comparisonRun.status], ["seed", run.seed, comparisonRun.seed],
      ["断言 PASS/WAITING/FAIL", ["PASS", "WAITING", "FAIL"].map((status) => run.assertions.filter((item: any) => item.status === status).length).join("/"), ["PASS", "WAITING", "FAIL"].map((status) => comparisonRun.assertions.filter((item: any) => item.status === status).length).join("/")],
      ["订单数", Array.isArray(run.evidence?.orders) ? run.evidence.orders.length : 0, Array.isArray(comparisonRun.evidence?.orders) ? comparisonRun.evidence.orders.length : 0],
      ["成交数", Array.isArray(run.evidence?.orders) ? run.evidence.orders.filter((item: any) => item.fill?.externalFillId).length : 0, Array.isArray(comparisonRun.evidence?.orders) ? comparisonRun.evidence.orders.filter((item: any) => item.fill?.externalFillId).length : 0],
      ["对账状态", run.evidence?.reconciliation?.status ?? "NOT_RUN", comparisonRun.evidence?.reconciliation?.status ?? "NOT_RUN"]
    ].map(([label, current, previous]) => <tr key={String(label)}><th>{label}</th><td>{String(current)}</td><td>{String(previous)}</td></tr>)}</tbody></table>}</section>}
    {run && <section aria-label="运行能力与阻塞" data-testid="v15-capability-status"><h2>能力状态与阻塞</h2><p>状态直接来自当前 TestRun 的持久化证据；NOT_RUN 表示尚无业务结论。</p>{capabilityRows.some((item) => item.blocked) && <div role="alert" data-testid="v15-capability-blockers"><strong>已确认的能力阻塞</strong><ul>{capabilityRows.filter((item) => item.blocked).map((item) => <li key={item.capability}>{item.capability}：{item.status}</li>)}</ul></div>}<table><thead><tr><th>能力</th><th>Run状态</th><th>阻塞</th></tr></thead><tbody>{capabilityRows.map((item) => <tr key={item.capability}><th>{item.capability}</th><td>{item.status}</td><td>{item.blocked ? "是" : "否"}</td></tr>)}</tbody></table><p><a href="/paper#paper-alerts">打开系统告警与 Paper 能力概览（V2.4）</a></p></section>}
    {run && <section aria-label="当前运行告警" data-testid="v15-run-incidents"><h2>当前运行告警</h2><p>告警只由本 Run 持久化的明确阻塞或失败断言生成；NOT_RUN 与 WAITING 不会自动生成告警。</p>{runIncidents.length === 0 ? <p data-testid="v15-no-incidents">当前没有由持久化证据生成的告警。</p> : <ul>{runIncidents.map((incident) => <li key={incident.incidentId} data-testid={`v15-run-incident-${incident.incidentId}`}><strong>{incident.severity} · {incident.code}</strong> · {incident.title} · {incident.state}{incident.acknowledgedBy && <span> · 已由 {incident.acknowledgedBy} 确认</span>}{incident.state === "OPEN" && <button onClick={() => void acknowledgeRunIncident(incident.incidentId)}>确认告警</button>}{incident.state === "RESOLVED" && <span> · 已恢复</span>}</li>)}</ul>}</section>}
    {run && <section><h2>当前运行状态与证据</h2><p role="status">{run.evidence?.businessExecution === "AUTO_TRADE_CANCELLED" ? "取消请求已执行；当前订单已收尾，后续订单未发送；完整 AUTO 场景仍待运行。" : run.evidence?.autoTradeCancellation?.status === "REQUESTED" ? "已持久化取消请求；当前执行中的订单会收尾，之后不再发送新订单。" : run.evidence?.temporal === "COMPLETED" && run.scenarioId === "normal" ? "Temporal 已完成 60 个 CN 与 60 个 US 虚拟交易日的权威 NO_TRADE 检查。" : run.evidence?.temporal === "COMPLETED" && run.scenarioId === "auto-trade" ? "Temporal 已完成三日合成Fixture中的错过窗口重评估、连续两日CN/US AUTO交易与逐日独立账本核对；真实交易日历与结算仍待验证。" : run.evidence?.workflow === "NOT_CONNECTED" ? "Temporal 不可用或此场景尚未接线；业务检查保持 NOT_RUN。" : "后台工作流仍在运行；页面刷新或关闭不会取消该TestRun。"}</p><dl><dt>testRunId</dt><dd data-testid="v15-test-run-id">{run.testRunId}</dd><dt>状态</dt><dd data-testid="v15-run-status">{run.status}</dd><dt>Temporal</dt><dd data-testid="v15-temporal-status">{run.evidence?.temporal ?? "NOT_RUN"}</dd></dl>{orderTraces.length > 0 && <section aria-label="成交链路追溯"><h3>成交链路追溯</h3>{fillTraces.length > 0 && <><label>选择成交<select aria-label="选择成交追溯" data-testid="v15-fill-trace-select" value={selectedFillTrace?.fill?.externalFillId ?? ""} onChange={(event) => setSelectedFillId(event.target.value)}>{fillTraces.map((item: any) => <option key={item.fill.externalFillId} value={item.fill.externalFillId}>{item.market} · Session {item.sessionSequence ?? "single"} · {item.fill.externalFillId}</option>)}</select></label>{selectedFillTrace && <article aria-label="所选成交完整链路" data-testid="v15-selected-fill-trace"><h4>{selectedFillTrace.market} Session {selectedFillTrace.sessionSequence ?? "single"} · Fill {selectedFillTrace.fill.externalFillId}</h4><dl><dt>Proposal</dt><dd>{selectedFillTrace.proposalId ?? "NOT_CAPTURED"}</dd><dt>Mandate</dt><dd>{selectedFillTrace.mandate?.mandateId ?? "NOT_CAPTURED"} {selectedFillTrace.mandate?.mandateVersion ? `v${selectedFillTrace.mandate.mandateVersion}` : ""}</dd><dt>FakeBroker Order</dt><dd>{selectedFillTrace.order?.order_id ?? selectedFillTrace.orderId ?? "NOT_CAPTURED"}</dd><dt>Fill</dt><dd>{selectedFillTrace.fill.externalFillId} · {selectedFillTrace.fill.quantity} × {selectedFillTrace.fill.price}</dd><dt>Outbox</dt><dd>{selectedFillTrace.outbox?.status ?? "NOT_CAPTURED"}</dd><dt>Portfolio现金</dt><dd>{selectedFillTrace.reconciliation?.portfolio?.cash?.amount ?? "NOT_CAPTURED"} {selectedFillTrace.reconciliation?.portfolio?.cash?.currency ?? ""}</dd><dt>FakeBroker现金</dt><dd>{selectedFillTrace.reconciliation?.fakeBroker?.current_cash ?? "NOT_CAPTURED"} {selectedFillTrace.reconciliation?.fakeBroker?.currency ?? ""}</dd><dt>预算已消费</dt><dd>{selectedFillTrace.mandate?.independentlyReadReservation?.consumedAmount ?? "NOT_CAPTURED"}</dd></dl></article>}</>}{orderTraces.map((item:any)=><article key={`${item.market}-${item.sessionSequence ?? "single"}`} data-testid={`v15-order-trace-${item.market}-${item.sessionSequence ?? "single"}`}><h4>{item.market} Session {item.sessionSequence ?? "single"} / {item.reconciliation?.status ?? "MATCH"}</h4><dl><dt>Proposal</dt><dd data-testid={`v15-trace-proposal-${item.market}-${item.sessionSequence ?? "single"}`}>{item.proposalId ?? "NOT_CAPTURED"}</dd><dt>Mandate</dt><dd data-testid={`v15-trace-mandate-${item.market}-${item.sessionSequence ?? "single"}`}>{item.mandate?.mandateId ?? "NOT_CAPTURED"} {item.mandate?.mandateVersion ? `v${item.mandate.mandateVersion}` : ""}</dd><dt>Client Order ID</dt><dd>{item.order?.clientOrderId ?? item.clientOrderId ?? "NOT_CAPTURED"}</dd><dt>FakeBroker Order</dt><dd data-testid={`v15-trace-order-${item.market}-${item.sessionSequence ?? "single"}`}>{item.order?.order_id ?? item.orderId ?? "NOT_CAPTURED"}</dd><dt>Fill</dt><dd data-testid={`v15-trace-fill-${item.market}-${item.sessionSequence ?? "single"}`}>{item.fill?.externalFillId ?? item.fillId ?? "NOT_CAPTURED"}{item.fill?.quantity ? ` · ${item.fill.quantity} × ${item.fill.price}` : ""}</dd><dt>Outbox</dt><dd>{item.outbox?.status ?? "NOT_CAPTURED"}</dd><dt>Portfolio现金</dt><dd>{item.reconciliation?.portfolio?.cash?.amount ?? "NOT_CAPTURED"} {item.reconciliation?.portfolio?.cash?.currency ?? ""}</dd><dt>FakeBroker现金</dt><dd>{item.reconciliation?.fakeBroker?.current_cash ?? "NOT_CAPTURED"} {item.reconciliation?.fakeBroker?.currency ?? ""}</dd><dt>预算已消费</dt><dd>{item.mandate?.independentlyReadReservation?.consumedAmount ?? "NOT_CAPTURED"}</dd></dl></article>)}</section>}{run.scenarioId === "auto-trade" && <section aria-label="日终账本对账"><h3>逐日 Fixture 收盘对账</h3><p data-testid="v15-auto-eod-status">{run.evidence?.dailyEndOfDay?.status ?? "NOT_RUN"}</p>{Object.entries(run.evidence?.dailyEndOfDay?.byMarket ?? {}).flatMap(([market, sessions]:[string,any])=>(Array.isArray(sessions)?sessions:[]).map((item:any)=><article key={`${market}-${item.sequence}`} data-testid={`v15-auto-eod-${market}-${item.sequence}`}><h4>{market} Session {item.sequence} · {item.reconciliation?.status ?? "NOT_RUN"}</h4><p>{item.localDate} {item.timeZone} · Close {item.closeAt ?? "NOT_CAPTURED"} · Fill {item.fillAt ?? "NOT_CAPTURED"}</p></article>))}</section>}{run.scenarioId === "auto-trade" && <section aria-label="错过窗口恢复"><h3>错过首日窗口与次日重评估</h3><p data-testid="v15-missed-window-status">{run.evidence?.missedWindowRecovery?.status ?? "NOT_RUN"}</p>{Object.entries(run.evidence?.missedWindowRecovery?.byMarket ?? {}).map(([market, item]:[string,any])=><article key={market} data-testid={`v15-missed-window-${market}`}><h4>{market}</h4><p>首日收盘 {item.missedAt ?? "NOT_CAPTURED"} · staleOrderCreated {String(item.staleOrderCreated ?? "NOT_RUN")} · 重评估窗口 {item.reevaluatedSession ?? "NOT_RUN"}</p></article>)}</section>}<pre data-testid="v15-evidence">{JSON.stringify(run.evidence,null,2)}</pre><table data-testid="v15-assertions"><thead><tr><th>断言</th><th>状态</th></tr></thead><tbody>{run.assertions.map((a:any)=><tr key={a.assertionId}><td>{a.assertionId}</td><td>{a.status}</td></tr>)}</tbody></table></section>}
  </main>;
}

function V21Acceptance() {
  const storageKey = "stockquant:v21:testRunId";
  const basePath = "/api/v1/acceptance/v2/v2.1";
  const [data, setData] = useState<any>(null); const [error, setError] = useState<string | null>(null);
  const [runId, setRunId] = useState(() => window.localStorage.getItem(storageKey) ?? "");
  const [watchlistAccountId, setWatchlistAccountId] = useState(""); const [watchlistNamespace, setWatchlistNamespace] = useState(""); const [watchlistTestRunId, setWatchlistTestRunId] = useState(""); const [watchlistCandidates, setWatchlistCandidates] = useState("");
  const [samplingInterval, setSamplingInterval] = useState<20 | 30>(30);
  const currentSamplingScope = () => ({ accountId: watchlistAccountId, namespace: watchlistNamespace, testRunId: watchlistTestRunId });
  const samplingScopeReady = Boolean(data?.scopedWatchlist && data.scopedWatchlist.accountId === watchlistAccountId && data.scopedWatchlist.namespace === watchlistNamespace && data.scopedWatchlist.testRunId === watchlistTestRunId);
  const load = async (path: string, options?: RequestInit) => { try { setError(null); const r = await api<any>(path, options); if (path.endsWith("/sampling") && [20, 30].includes(r.intervalMinutes)) setSamplingInterval(r.intervalMinutes); setData((old: any) => ({ ...(old ?? {}), [path.split("/").pop()!]: r })); } catch (e) { setError(String(e)); } };
  const over = async () => { try { const securities = Array.from({ length: 101 }, (_, i) => `${String(600000 + i).padStart(6, "0")}.SH`); await api(`${basePath}/watchlist`, { method: "PUT", body: JSON.stringify({ securities }) }); } catch (e) { setError(String(e)); } };
  const updateScopedWatchlist = async () => { try { setError(null); const securities = watchlistCandidates.split(/[\s,，]+/u).map((item) => item.trim()).filter(Boolean); const result = await api<any>(`${basePath}/watchlist/${encodeURIComponent(watchlistAccountId)}`, { method: "PUT", body: JSON.stringify({ namespace: watchlistNamespace, testRunId: watchlistTestRunId, securities }) }); setData((old: any) => ({ ...(old ?? {}), scopedWatchlist: result })); } catch (e) { setError(String(e)); } };
  const loadScopedWatchlist = async () => { try { setError(null); const query = new URLSearchParams({ accountId: watchlistAccountId, namespace: watchlistNamespace, testRunId: watchlistTestRunId }); const result = await api<any>(`${basePath}/watchlist/scoped?${query}`); setData((old: any) => ({ ...(old ?? {}), scopedWatchlist: result })); } catch (e) { setError(String(e)); } };
  const saveSamplingInterval = async () => { try { setError(null); const result = await api<any>(`${basePath}/sampling`, { method: "PUT", body: JSON.stringify({ intervalMinutes: samplingInterval }) }); setData((old: any) => ({ ...(old ?? {}), sampling: result })); } catch (e) { setError(String(e)); } };
  const setDailyBarSchedule = async (enabled: boolean) => { try { setError(null); const result = await api<any>(`${basePath}/daily-bars/schedules`, { method: "PUT", body: JSON.stringify({ enabled, scope: currentSamplingScope() }) }); setData((old: any) => ({ ...(old ?? {}), dailyBarSchedule: result })); const sampling = await api<any>(`${basePath}/sampling`); setData((old: any) => ({ ...(old ?? {}), sampling })); } catch (e) { setError(String(e)); } };
  const setMonitorEvaluation = async (enabled: boolean) => { try { setError(null); await api<any>(`${basePath}/sampling/monitor-policy`, { method: "PUT", body: JSON.stringify({ enabled }) }); const result = await api<any>(`${basePath}/sampling`); setData((old: any) => ({ ...(old ?? {}), sampling: result })); } catch (e) { setError(String(e)); } };
  const ingestNewsFixture = async () => { try { setError(null); const ingest = await api<any>(`${basePath}/news/fixture/ingest`, { method: "POST", body: JSON.stringify({}) }); const history = await api<any>(`${basePath}/news/fixture/history`); setData((old: any) => ({ ...(old ?? {}), newsFixtureIngest: ingest, newsFixtureHistory: history })); } catch (e) { setError(String(e)); } };
  const waitForSamplingTask = async (result: any) => {
    if (!result.task || result.task.status !== "QUEUED") return result;
    const query = new URLSearchParams(currentSamplingScope());
    for (let attempt = 0; attempt < 30; attempt += 1) {
      await new Promise((resolve) => setTimeout(resolve, 100));
      const latest = await api<any>(`${basePath}/sampling/tasks/latest?${query}`);
      if (latest.task?.taskId === result.task.taskId && latest.task.status !== "QUEUED") return { ...result, task: latest.task, execution: latest.execution };
    }
    return result;
  };
  const evaluateSamplingTick = async () => { try { setError(null); const queued = await api<any>(`${basePath}/sampling/tasks/tick`, { method: "POST", body: JSON.stringify({ scheduledAt: "2026-10-16T01:30:00.000Z", sourceId: "tencent-quote", scope: currentSamplingScope() }) }); const result = await waitForSamplingTask(queued); setData((old: any) => ({ ...(old ?? {}), samplingTick: result })); } catch (e) { setError(String(e)); } };
  const evaluateSamplingFixtureTick = async () => { try { setError(null); const queued = await api<any>(`${basePath}/sampling/tasks/tick-fixture`, { method: "POST", body: JSON.stringify({ scheduledAt: "2026-10-16T01:50:00.000Z", scope: currentSamplingScope() }) }); const result = await waitForSamplingTask(queued); setData((old: any) => ({ ...(old ?? {}), samplingFixtureTick: result })); } catch (e) { setError(String(e)); } };
  const readLatestSamplingTask = async () => { try { setError(null); const query = new URLSearchParams(currentSamplingScope()); const result = await api<any>(`${basePath}/sampling/tasks/latest?${query}`); setData((old: any) => ({ ...(old ?? {}), samplingLatest: result.task ? { ...result.task, execution: result.execution } : null })); } catch (e) { setError(String(e)); } };
  const evaluateQuoteQuality = async () => { try { setError(null); const result = await api<any>(`${basePath}/quote-quality/evaluate`, { method: "POST", body: JSON.stringify({ scope: currentSamplingScope() }) }); setData((old: any) => ({ ...(old ?? {}), quoteQuality: result })); } catch (e) { setError(String(e)); } };
  const readLatestQuoteQuality = async () => { try { setError(null); const query = new URLSearchParams(currentSamplingScope()); const result = await api<any>(`${basePath}/quote-quality/latest?${query}`); setData((old: any) => ({ ...(old ?? {}), quoteQuality: result.quality })); } catch (e) { setError(String(e)); } };
  const readLatestDailyBarCompletion = async () => { try { setError(null); const query = new URLSearchParams(currentSamplingScope()); const result = await api<any>(`${basePath}/daily-bars/completions/latest?${query}`); setData((old: any) => ({ ...(old ?? {}), dailyBarCompletionLatest: result })); return result; } catch (e) { setError(String(e)); return null; } };
  const completeDailyBarFixture = async () => { try { setError(null); const queued = await api<any>(`${basePath}/daily-bars/fixture/complete`, { method: "POST", body: JSON.stringify({ scope: currentSamplingScope() }) }); setData((old: any) => ({ ...(old ?? {}), dailyBarCompletion: queued })); const query = new URLSearchParams(currentSamplingScope()); for (let attempt = 0; attempt < 50; attempt += 1) { await new Promise((resolve) => setTimeout(resolve, 100)); const latest = await api<any>(`${basePath}/daily-bars/completions/latest?${query}`); if (latest.task?.taskId === queued.task?.taskId) { setData((old: any) => ({ ...(old ?? {}), dailyBarCompletion: { ...queued, ...latest } })); if (["COMPLETED", "FAILED"].includes(latest.task.state)) break; } } } catch (e) { setError(String(e)); } };
  const run = async (scenarioId: string) => { try { setError(null); const accepted = await api<any>(`${basePath}/runs`, { method: "POST", body: JSON.stringify({ scenarioId, seed: 20260907 }) }); window.localStorage.setItem(storageKey, accepted.testRunId); setRunId(accepted.testRunId); const result = await api<any>(`${basePath}/runs/${accepted.testRunId}`); setData((old: any) => ({ ...(old ?? {}), run: result })); } catch (e) { setError(String(e)); } };
  useEffect(() => { if (!runId) return; void api<any>(`${basePath}/runs/${runId}`).then((result) => setData((old: any) => ({ ...(old ?? {}), run: result }))).catch((e) => { window.localStorage.removeItem(storageKey); setRunId(""); setError(String(e)); }); }, [runId]);
  return <main><header><p className="eyebrow">StockQuant · 开发验收中心</p><h1>V2.1 免费行情、新闻聚合与在线股票池</h1><p>真实来源能力与小样本验收；不触发交易。</p></header>{error && <p role="alert" className="error">{error}</p>}<section><h2>来源与股票池</h2><button onClick={()=>void load(`${basePath}/sources`)}>检查来源能力</button><button data-testid="v21-read-sampling" onClick={()=>void load(`${basePath}/sampling`)}>读取持久采样配置</button><label>快照采样间隔<select aria-label="快照采样间隔" data-testid="v21-sampling-interval" value={samplingInterval} onChange={(event)=>setSamplingInterval(Number(event.target.value) as 20 | 30)}><option value={30}>30分钟</option><option value={20}>20分钟</option></select></label><button data-testid="v21-save-sampling" onClick={()=>void saveSamplingInterval()}>保存采样间隔</button>{data?.sampling && <button data-testid="v21-toggle-daily-bar-schedule" disabled={!samplingScopeReady} onClick={()=>void setDailyBarSchedule(!(data.sampling.policies?.find((policy: any)=>policy.policyId==="dailyBarCompletion")?.enabled ?? false))}>{data.sampling.policies?.find((policy: any)=>policy.policyId==="dailyBarCompletion")?.enabled ? "关闭收盘后日线自动调度" : "启用当前TestRun收盘后日线调度"}</button>}{data?.dailyBarSchedule?.fixture && <p data-testid="v21-daily-bar-scheduler-state">收盘后调度 {data.dailyBarSchedule.enabled ? "已启用" : "已关闭"} · {data.dailyBarSchedule.fixture.version} / {data.dailyBarSchedule.fixture.sessionDate} · 仅合成Fixture，不请求真实来源</p>}{data?.sampling && <button data-testid="v21-toggle-monitor-policy" onClick={()=>void setMonitorEvaluation(!(data.sampling.policies?.find((policy: any)=>policy.policyId==="monitorEvaluation")?.enabled ?? false))}>{data.sampling.policies?.find((policy: any)=>policy.policyId==="monitorEvaluation")?.enabled ? "关闭自动行情质量评估" : "启用自动行情质量评估"}</button>}{data?.sampling && <><p data-testid="v21-sampling-summary">{data.sampling.intervalMinutes}分钟 · {data.sampling.persistence} · 配置版本{data.sampling.settingsVersion}；各类调度策略独立持久化，快照不会触发日线、策略或订单消费者。</p>{data.sampling.policies?.length > 0 && <ul data-testid="v21-sampling-policies">{data.sampling.policies.map((policy: any) => <li key={policy.policyId}>{policy.policyId} · v{policy.version} · {policy.trigger} · {policy.enabled ? "启用" : "禁用"} · {policy.executor} · 门禁 {policy.activationGate}</li>)}</ul>}</>}<button onClick={()=>void evaluateSamplingTick()} data-testid="v21-evaluate-sampling-tick" disabled={!samplingScopeReady}>运行固定采样时点</button>{data?.samplingTick && <p data-testid="v21-sampling-task-state">{data.samplingTick.decision.status} · {data.samplingTick.task?.status ?? "无采样任务"} · {data.samplingTick.task?.taskId ?? ""}</p>}<button onClick={()=>void evaluateSamplingFixtureTick()} data-testid="v21-evaluate-sampling-fixture-tick" disabled={!samplingScopeReady}>运行合成快照Fixture采样</button>{data?.samplingFixtureTick && <><p data-testid="v21-sampling-fixture-task-state">{data.samplingFixtureTick.task?.status ?? "无采样任务"} · {data.samplingFixtureTick.task?.fixtureVersion ?? ""} · {data.samplingFixtureTick.task?.observations?.length ?? 0} 条合成观测 · 外部请求{data.samplingFixtureTick.externalRequests}</p>{data.samplingFixtureTick.task?.observations?.length > 0 && <ul data-testid="v21-sampling-observations">{data.samplingFixtureTick.task.observations.map((item: any) => <li key={item.snapshotId}>{item.securityId} · {item.sourceId} · {item.dataMode} · 观察 {item.observedAt ?? "未知"} · 入库 {item.ingestedAt ?? "未知"} · 可用 {item.availableAt ?? "未知"} · {item.freshness} · age {item.ageSeconds ?? "未知"}秒</li>)}</ul>}</>}<button data-testid="v21-read-latest-sampling-task" onClick={()=>void readLatestSamplingTask()} disabled={!samplingScopeReady}>读取当前运行最近采样任务</button>{data?.samplingLatest && <p data-testid="v21-latest-sampling-task">{data.samplingLatest.taskId} · {data.samplingLatest.dataMode} · {data.samplingLatest.status} · Worker {data.samplingLatest.execution?.state ?? "NOT_QUEUED"} ({data.samplingLatest.execution?.attempt ?? 0}/{data.samplingLatest.execution?.maxAttempts ?? 0})</p>}<button onClick={()=>void evaluateQuoteQuality()} data-testid="v21-evaluate-quote-quality" disabled={!samplingScopeReady || data?.samplingLatest?.status !== "COMPLETED_FIXTURE" && data?.samplingLatest?.status !== "COMPLETED_REAL"}>计算并持久化行情质量</button><button onClick={()=>void readLatestQuoteQuality()} data-testid="v21-read-quote-quality" disabled={!samplingScopeReady}>读取当前运行行情质量</button>{data?.quoteQuality && <dl data-testid="v21-quote-quality"><dt>任务 / 状态</dt><dd>{data.quoteQuality.taskId} · {data.quoteQuality.status}</dd><dt>新鲜覆盖</dt><dd>{data.quoteQuality.freshCount}/{data.quoteQuality.expectedCount} · {data.quoteQuality.coverageRatio}</dd><dt>最大年龄</dt><dd>{data.quoteQuality.maxAgeSeconds ?? "未知"}秒</dd><dt>异常</dt><dd>{data.quoteQuality.anomalies.map((item: any)=>`${item.securityId}:${item.code}`).join(", ") || "无"}</dd><dt>质量记录</dt><dd>{data.quoteQuality.evaluationId}</dd></dl>}<button data-testid="v21-enable-snapshot-schedule" disabled={!samplingScopeReady} onClick={()=>void load(`${basePath}/sampling/schedules`, { method: "PUT", body: JSON.stringify({ scope: currentSamplingScope(), sourceId: "tencent-quote", enabled: true }) })}>启用当前运行快照调度</button><button data-testid="v21-disable-snapshot-schedule" disabled={!samplingScopeReady} onClick={()=>void load(`${basePath}/sampling/schedules`, { method: "PUT", body: JSON.stringify({ scope: currentSamplingScope(), sourceId: "tencent-quote", enabled: false }) })}>停止当前运行快照调度</button><button data-testid="v21-complete-real-daily-bar" disabled={!samplingScopeReady} onClick={()=>void load(`${basePath}/daily-bars/real/complete`, { method: "POST", body: JSON.stringify({ scope: currentSamplingScope() }) })}>提交当前交易日日线任务</button><button onClick={()=>void completeDailyBarFixture()} data-testid="v21-complete-daily-bar-fixture" disabled={!samplingScopeReady}>提交独立日线Fixture任务</button>{data?.dailyBarCompletion && <p data-testid="v21-daily-bar-completion">任务 {data.dailyBarCompletion.task?.state ?? "NOT_QUEUED"} · 尝试 {data.dailyBarCompletion.task?.attempt ?? 0}/{data.dailyBarCompletion.task?.maxAttempts ?? 0} · {data.dailyBarCompletion.completion?.status ?? "等待后台完成"} · 外部请求{data.dailyBarCompletion.externalRequests}</p>}{data?.dailyBarCompletion?.task?.lastError && <p role="alert">日线任务失败：{data.dailyBarCompletion.task.lastError}</p>}<button onClick={()=>void readLatestDailyBarCompletion()} data-testid="v21-read-latest-daily-bar-completion" disabled={!samplingScopeReady}>读取当前运行最近日线任务</button>{data?.dailyBarCompletionLatest?.task && <p data-testid="v21-latest-daily-bar-completion">任务 {data.dailyBarCompletionLatest.task.taskId} · {data.dailyBarCompletionLatest.task.state} · 尝试 {data.dailyBarCompletionLatest.task.attempt}/{data.dailyBarCompletionLatest.task.maxAttempts}{data.dailyBarCompletionLatest.completion ? ` · ${data.dailyBarCompletionLatest.completion.completionId} · ${data.dailyBarCompletionLatest.completion.status} · ${data.dailyBarCompletionLatest.completion.dataMode} · ${data.dailyBarCompletionLatest.completion.bars.length} 根` : ""}</p>}<button onClick={()=>void ingestNewsFixture()} data-testid="v21-ingest-news-fixture">导入固定新闻修订Fixture并查看历史</button>{data?.newsFixtureHistory && <section data-testid="v21-news-fixture-history"><h3>合成新闻修订历史 · {data.newsFixtureHistory.fixtureVersion}</h3><p>数据模式：{data.newsFixtureHistory.dataMode} · 新增记录：{data.newsFixtureIngest.records.filter((item: any)=>item.created).length}</p><ul>{data.newsFixtureHistory.histories.map((item: any)=><li key={`${item.sourceId}/${item.sourceItemId}/${item.revision}`}>{item.sourceId}/{item.sourceItemId} · 修订{item.revision} · {item.title} · 发布{item.publishedAt ?? "时间未知"} · 观察{item.observedAt} · 入库{item.ingestedAt} · 可用{item.availableAt} · {item.entityMatchStatus} · {item.revisionStatus}</li>)}</ul></section>}<button onClick={()=>void load(`${basePath}/watchlist`)}>查看旧版全局股票池</button><button onClick={()=>void load(`${basePath}/quotes`)}>采集实时快照</button><button onClick={()=>void load(`${basePath}/news/live`)}>抓取实时新闻</button><button onClick={()=>void load(`${basePath}/news`)}>查看新闻去重样本</button><button onClick={()=>void over()}>提交101只并验证旧接口拒绝</button></section><section aria-label="owner-account-run 在线池"><h2>当前账户在线池</h2><p>持仓和未完成订单由服务端从 Portfolio、Trade 读取；此表单只能提交候选证券。采样任务必须绑定到已保存的当前账户/TestRun在线池。</p><label>Account ID<input aria-label="Watchlist Account ID" data-testid="v21-watchlist-account" value={watchlistAccountId} onChange={(event)=>setWatchlistAccountId(event.target.value)} /></label><label>Namespace<input aria-label="Watchlist Namespace" data-testid="v21-watchlist-namespace" value={watchlistNamespace} onChange={(event)=>setWatchlistNamespace(event.target.value)} /></label><label>TestRun ID<input aria-label="Watchlist TestRun ID" data-testid="v21-watchlist-test-run" value={watchlistTestRunId} onChange={(event)=>setWatchlistTestRunId(event.target.value)} /></label><label>候选证券（逗号或换行分隔）<textarea aria-label="Watchlist Candidates" data-testid="v21-watchlist-candidates" value={watchlistCandidates} onChange={(event)=>setWatchlistCandidates(event.target.value)} /></label><button data-testid="v21-update-scoped-watchlist" disabled={!watchlistAccountId || !watchlistNamespace || !watchlistTestRunId} onClick={()=>void updateScopedWatchlist()}>读取持仓/在途并保存在线池</button><button data-testid="v21-read-scoped-watchlist" disabled={!watchlistAccountId || !watchlistNamespace || !watchlistTestRunId} onClick={()=>void loadScopedWatchlist()}>读取已保存在线池</button>{data?.scopedWatchlist && <dl data-testid="v21-scoped-watchlist-summary"><dt>证券数 / 必需数</dt><dd>{data.scopedWatchlist.count} / {data.scopedWatchlist.requiredCount}</dd><dt>证券顺序</dt><dd>{data.scopedWatchlist.securities.join(", ")}</dd><dt>省略候选</dt><dd>{data.scopedWatchlist.omittedCandidates.join(", ") || "无"}</dd><dt>范围</dt><dd>{data.scopedWatchlist.ownerId} · {data.scopedWatchlist.accountId} · {data.scopedWatchlist.namespace} · {data.scopedWatchlist.testRunId}</dd></dl>}</section><section><h2>统一场景运行</h2><button onClick={()=>void run("normal")}>运行正常</button><button onClick={()=>void run("rejection")}>运行容量拒绝</button><button onClick={()=>void run("recovery")}>运行任务恢复</button><button data-testid="v21-run-stale" onClick={()=>void run("stale")}>运行陈旧拒绝</button></section>{data?.run && <section aria-label="V2.1 持久运行"><h2>当前持久运行</h2><dl><dt>testRunId</dt><dd data-testid="v21-test-run-id">{data.run.testRunId}</dd><dt>状态</dt><dd data-testid="v21-run-status">{data.run.status}</dd></dl></section>}{data && <V21ResultSummary data={data}/>} {data && <details><summary>查看原始核对数据</summary><pre data-testid="v21-evidence">{JSON.stringify(data,null,2)}</pre></details>}</main>; }

function V21ResultSummary({ data }: { data: any }) {
  const assertions = data?.run?.assertions ?? [];
  const labels: Record<string, string> = {
    "V2.1-WATCHLIST-001": "在线池与证券范围", "V2.1-SAMPLING-INTERVAL-MATRIX-001": "20/30分钟采样边界",
    "V2.1-SNAPSHOT-FIXTURE-001": "后台采样与持久观测", "V2.1-QUALITY-001": "新鲜度与行情质量",
    "V2.1-DAILY-BAR-001": "独立收盘日线", "V2.1-NEWS-FIXTURE-001": "新闻修订与实体状态",
    "V2.1-CONSUMER-GATES-001": "策略与订单保持关闭", "V2.1-CALENDAR-REJECTION-001": "午休、休市和未知日历拒绝",
    "V2.1-WATCHLIST-REJECTION-001": "超限证券拒绝", "V2.1-WATCHLIST-ATOMICITY-001": "拒绝不改写在线池",
    "V2.1-DAILY-BAR-IDEMPOTENCY-001": "重复请求保持同一任务", "V2.1-DAILY-BAR-RECOVERY-001": "原日线结果可恢复读取",
  };
  const quality = assertions.find((item: any) => item.assertionId === "V2.1-QUALITY-001")?.actual;
  return <>
    {assertions.length > 0 && <section aria-label="C2业务核对结果" data-testid="v21-result-summary"><h2>业务核对结果</h2><p>{assertions.filter((item: any) => item.status === "PASS").length}/{assertions.length} 项通过 · {data.run.evidence?.dataMode} · 人工验收待确认</p>{quality && <p>行情质量：{quality.status} · 新鲜覆盖 {quality.freshCount}/{quality.expectedCount} · 异常 {quality.anomalies?.map((item: any) => `${item.securityId} ${item.code}`).join("，") || "无"}</p>}<table><thead><tr><th>检查内容</th><th>结果</th></tr></thead><tbody>{assertions.map((item: any) => <tr key={item.assertionId}><td>{labels[item.assertionId] ?? item.assertionId}</td><td>{item.status}</td></tr>)}</tbody></table></section>}
    {data?.quotes?.securities && <section><h2>来源快照</h2><p>{data.quotes.sourceId} · 当前来源返回值</p><table><thead><tr><th>证券</th><th>价格</th><th>来源时间</th><th>新鲜度</th></tr></thead><tbody>{data.quotes.securities.map((item: any) => <tr key={item.symbol}><td>{item.symbol}</td><td>{item.price ?? "未知"}</td><td>{item.observedAt ?? "未知"}</td><td>{item.freshness ?? item.status}</td></tr>)}</tbody></table></section>}
    {data?.live?.items && <section><h2>新闻来源元数据</h2><p>{data.live.status} · {data.live.sourceFailures?.join("，") || "无来源失败"}</p><ul>{data.live.items.map((item: any) => <li key={item.newsId}><a href={item.sourceUrl} target="_blank" rel="noreferrer">{item.title}</a> · {item.sourceIds.join("，")} · 发布时间 {item.publishedAt ?? "未知"} · 修订 {item.revision} · {item.entityMatchStatus}</li>)}</ul></section>}
    {data?.complete?.task && <section><h2>当前交易日日线任务</h2><p>{data.complete.task.taskId} · {data.complete.task.state} · {data.complete.dataMode}</p><p>使用“读取当前运行最近日线任务”查看后台完成结果。</p></section>}
  </>;
}

function V22Acceptance() {
  const storageKey = "stockquant:v22:testRunId";
  const uploadStorageKey = "stockquant:v22:csvUpload";
  const basePath = "/api/v1/acceptance/v2/v2.2";
  const [data, setData] = useState<any>(null); const [error, setError] = useState<string | null>(null);
  const [queryVersion, setQueryVersion] = useState(""); const [compareVersion, setCompareVersion] = useState(""); const [querySecurityId, setQuerySecurityId] = useState(""); const [queryFromDate, setQueryFromDate] = useState(""); const [queryToDate, setQueryToDate] = useState(""); const [queryWindow, setQueryWindow] = useState<1 | 5>(5);
  const [dailyReference, setDailyReference] = useState({ open: "", high: "", low: "", close: "", volume: "", amount: "", source: "", reference: "" });
  const [runId, setRunId] = useState(() => window.localStorage.getItem(storageKey) ?? "");
  const [csvFile, setCsvFile] = useState<File | null>(null); const [csvContent, setCsvContent] = useState(""); const [csvHeaders, setCsvHeaders] = useState<string[]>([]); const [csvMapping, setCsvMapping] = useState<Record<string, string>>({});
  const [csvFrequency, setCsvFrequency] = useState<"1m" | "5m">("1m");
  const [csvTimestampSemantics, setCsvTimestampSemantics] = useState<"BAR_START" | "BAR_END">("BAR_START");
  const emptyHistoricalContext = { securityUniverseVersion: null as string | null, marketRuleSetVersion: null as string | null, corporateActionVersion: null as string | null };
  const [historicalContext, setHistoricalContext] = useState(emptyHistoricalContext);
  const [uploadSession, setUploadSession] = useState<{ uploadId: string; expectedSha256: string; metadataSha256: string; mapping?: Record<string, string>; provenance?: typeof csvProvenance; historicalContext?: typeof emptyHistoricalContext; frequency?: "1m" | "5m"; timestampSemantics?: "BAR_START" | "BAR_END"; fileFormat?: "CSV" | "PARQUET" } | null>(() => { try { const value = window.localStorage.getItem(uploadStorageKey); return value ? JSON.parse(value) : null; } catch { return null; } });
  const [csvProvenance, setCsvProvenance] = useState({ sourceName: "", sourceReference: "", licenseStatement: "", licenseVerification: "UNCONFIRMED" as "OPERATOR_CONFIRMED" | "UNCONFIRMED", acquiredAt: "" });
  const load = async (path: string, body?: any) => { try { setError(null); const r = await api<any>(path, body ? { method: "POST", body: JSON.stringify(body) } : undefined); setData((old: any) => ({ ...(old ?? {}), [path.split("/").pop()!]: r })); } catch (e) { setError(String(e)); } };
  const minuteBarsPath = (version: string, pageSize = 200) => { const toExclusive = queryToDate ? new Date(Date.parse(`${queryToDate}T00:00:00Z`) + 86_400_000).toISOString().slice(0, 10) : ""; const params = new URLSearchParams({ pageSize: String(pageSize), ...(querySecurityId ? { securityId: querySecurityId.trim() } : {}), ...(queryFromDate ? { fromBarStart: `${queryFromDate}T00:00:00+08:00` } : {}), ...(toExclusive ? { toBarStart: `${toExclusive}T00:00:00+08:00` } : {}) }); return `${basePath}/imports/${encodeURIComponent(version.trim())}/bars?${params}`; };
  const queryMinuteBars = async () => { try { setError(null); const [imported, bars] = await Promise.all([api<any>(`${basePath}/imports/${encodeURIComponent(queryVersion.trim())}`), api<any>(minuteBarsPath(queryVersion))]); const frequency = imported.manifest?.semantics?.frequency; if (frequency === "1m" || frequency === "5m") setQueryWindow(frequency === "1m" ? 1 : 5); setData((old: any) => ({ ...(old ?? {}), queriedImport: imported, queriedBars: bars })); } catch (e) { setError(String(e)); } };
  const queryMinuteCoverage = async () => { try { setError(null); const report = await api<any>(`${basePath}/imports/${encodeURIComponent(queryVersion.trim())}/coverage`, { method: "POST", body: JSON.stringify({ securityId: querySecurityId.trim(), fromDate: queryFromDate, toDate: queryToDate, windowMinutes: queryWindow }) }); setData((old: any) => ({ ...(old ?? {}), minuteCoverage: report })); } catch (e) { setError(String(e)); } };
  const checkDailyAggregate = async () => { try { setError(null); const reference = Object.fromEntries((["open", "high", "low", "close", "volume", "amount"] as const).map((field) => [field, Number(dailyReference[field])])) as Record<string, number>; const report = await api<any>(`${basePath}/imports/${encodeURIComponent(queryVersion.trim())}/daily-aggregate-check`, { method: "POST", body: JSON.stringify({ securityId: querySecurityId.trim(), tradingDate: queryFromDate, frequency: `${queryWindow}m`, reference, referenceSource: dailyReference.source, sourceReference: dailyReference.reference }) }); setData((old: any) => ({ ...(old ?? {}), minuteDailyAggregate: report })); } catch (e) { setError(String(e)); } };
  const compareMinuteVersions = async () => { try { setError(null); const [leftImport, rightImport, left, right] = await Promise.all([api<any>(`${basePath}/imports/${encodeURIComponent(queryVersion.trim())}`), api<any>(`${basePath}/imports/${encodeURIComponent(compareVersion.trim())}`), api<any>(minuteBarsPath(queryVersion, 1000)), api<any>(minuteBarsPath(compareVersion, 1000))]); const semanticKeys = ["market", "frequency", "adjustment", "timezone", "volumeUnit", "amountUnit"]; if (semanticKeys.some((field) => typeof leftImport.manifest?.semantics?.[field] !== "string" || !leftImport.manifest.semantics[field].trim() || leftImport.manifest.semantics[field] !== rightImport.manifest?.semantics?.[field])) throw new Error("两个DataVersion的市场、频率、复权、时区或单位语义不兼容，不能直接比较"); const key = (bar: any) => `${bar.securityId}|${bar.barStart}`; const leftByKey = new Map((left.items ?? []).map((bar: any) => [key(bar), bar])); const rightByKey = new Map((right.items ?? []).map((bar: any) => [key(bar), bar])); const keys = [...new Set([...leftByKey.keys(), ...rightByKey.keys()])].sort(); const rows = keys.map((barKey) => { const a: any = leftByKey.get(barKey); const b: any = rightByKey.get(barKey); const differs = !a || !b || ["open", "high", "low", "close", "volume", "amount"].some((field) => a[field] !== b[field]); return { key: barKey, left: a, right: b, status: !a ? "ONLY_RIGHT" : !b ? "ONLY_LEFT" : differs ? "DIFFERENT" : "MATCH" }; }); setData((old: any) => ({ ...(old ?? {}), minuteVersionComparison: { leftVersion: queryVersion.trim(), rightVersion: compareVersion.trim(), rows, nextCursorLeft: left.nextCursor, nextCursorRight: right.nextCursor } })); } catch (e) { setError(String(e)); } };
  const csvFields = ["securityId", "timestamp", "open", "high", "low", "close", "volume", "amount"];
  const uploadCsv = async (action: "preview" | "import") => {
    try {
      setError(null);
      const provenance = { ...csvProvenance, sourceName: csvProvenance.sourceName.trim(), sourceReference: csvProvenance.sourceReference.trim() || null, licenseStatement: csvProvenance.licenseStatement.trim(), acquiredAt: new Date(csvProvenance.acquiredAt).toISOString() };
      const semantics = { market: "CN_A", frequency: csvFrequency, adjustment: "RAW", timezone: "Asia/Shanghai", timestampSemantics: csvTimestampSemantics, volumeUnit: "SHARES", amountUnit: "CNY" };
      const fileFormat = csvFile?.name.toLowerCase().endsWith(".parquet") ? "PARQUET" : "CSV";
      const normalizedHistoricalContext = Object.fromEntries(Object.entries(historicalContext).map(([key, value]) => [key, value?.trim() || null]));
      const metadata = { fileFormat, mapping: csvMapping, provenance, historicalContext: normalizedHistoricalContext, ...semantics };
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
        session = { uploadId: crypto.randomUUID(), expectedSha256, metadataSha256, mapping: csvMapping, provenance: csvProvenance, historicalContext, frequency: csvFrequency, timestampSemantics: csvTimestampSemantics, fileFormat };
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
      const result = await api<any>(`${basePath}/${fileFormat.toLowerCase()}/uploads/${session.uploadId}/${action === "preview" ? "preview" : "finalize-queued"}`, { method: "POST", body: "{}" });
      setData((old: any) => ({ ...(old ?? {}), csv: action === "import" ? { ...result, uploadId: session!.uploadId } : result, ...(action === "import" ? { csvFinalization: result } : {}) }));
    } catch (e) { setError(String(e)); }
  };
  const readCsvFinalization = async () => { if (!uploadSession) return; try { const format = uploadSession.fileFormat?.toLowerCase() ?? "csv"; const job = await api<any>(`${basePath}/${format}/uploads/${uploadSession.uploadId}/finalization`); setData((old: any) => ({ ...(old ?? {}), csvFinalization: job, ...(job.status === "COMPLETED" ? { csv: job.result?.body } : {}) })); if (job.status === "COMPLETED") { setUploadSession(null); window.localStorage.removeItem(uploadStorageKey); } } catch (e) { setError(String(e)); } };
  const cancelCsvUpload = async () => { if (!uploadSession) return; try { const result = await api<any>(`${basePath}/${uploadSession.fileFormat?.toLowerCase() ?? "csv"}/uploads/${uploadSession.uploadId}/cancel`, { method: "POST", body: "{}" }); setData((old: any) => ({ ...(old ?? {}), csvUpload: result })); setUploadSession(null); window.localStorage.removeItem(uploadStorageKey); } catch (e) { setError(String(e)); } };
  const run = async (scenarioId: string, uploadId?: string, fileFormat: "CSV" | "PARQUET" = "CSV") => { try { setError(null); const hasCandidateInputs = scenarioId === "uploaded-csv" && fileFormat === "CSV" && data?.csv?.version === queryVersion.trim() && queryVersion.trim() && compareVersion.trim() && querySecurityId.trim() && queryFromDate && queryToDate && dailyReference.source.trim() && dailyReference.reference.trim() && (["open","high","low","close","volume","amount"] as const).every((field) => dailyReference[field] !== "" && Number.isFinite(Number(dailyReference[field]))); const candidateValidation = hasCandidateInputs ? { dataVersion: queryVersion.trim(), comparisonVersion: compareVersion.trim(), securityId: querySecurityId.trim(), fromDate: queryFromDate, toDate: queryToDate, windowMinutes: queryWindow, reference: Object.fromEntries((["open","high","low","close","volume","amount"] as const).map((field) => [field, Number(dailyReference[field])])), referenceSource: dailyReference.source.trim(), sourceReference: dailyReference.reference.trim() } : undefined; const accepted = await api<any>(`${basePath}/runs`, { method: "POST", body: JSON.stringify({ scenarioId, seed: 20260907, ...(uploadId ? { uploadId, fileFormat } : {}), ...(candidateValidation ? { candidateValidation } : {}) }) }); window.localStorage.setItem(storageKey, accepted.testRunId); setRunId(accepted.testRunId); const result = await api<any>(`${basePath}/runs/${accepted.testRunId}`); setData((old: any) => ({ ...(old ?? {}), run: result })); } catch (e) { setError(String(e)); } };
  useEffect(() => { if (!runId) return; void api<any>(`${basePath}/runs/${runId}`).then((result) => setData((old: any) => ({ ...(old ?? {}), run: result }))).catch((e) => { window.localStorage.removeItem(storageKey); setRunId(""); setError(String(e)); }); }, [runId]);
  return <main><header><p className="eyebrow">StockQuant · 开发验收中心</p><h1>V2.2 历史分钟数据导入与校验</h1><p>CN分钟Fixture与分块 CSV/Parquet 上传，支持 1m/5m 与显式时间戳语义；不触发交易。</p></header>{error && <p role="alert" className="error">{error}</p>}<section><h2>导入与预览</h2><button onClick={()=>void load(`${basePath}/preview`)}>预览分钟数据</button><button onClick={()=>void load(`${basePath}/import`, { fixture: "normal" })}>导入正常文件</button><button onClick={()=>void load(`${basePath}/import`, { fixture: "bad" })}>导入坏文件并拒绝</button></section><section><h2>分钟文件上传</h2><label>分钟频率 <select aria-label="分钟频率" value={csvFrequency} onChange={(event)=>{setCsvFrequency(event.target.value as "1m"|"5m");setData((old:any)=>({...old,csv:null}));}}><option value="1m">1分钟</option><option value="5m">5分钟</option></select></label><label>时间戳语义 <select aria-label="时间戳语义" value={csvTimestampSemantics} onChange={(event)=>{setCsvTimestampSemantics(event.target.value as "BAR_START"|"BAR_END");setData((old:any)=>({...old,csv:null}));}}><option value="BAR_START">源时间代表bar开始</option><option value="BAR_END">源时间代表bar结束</option></select></label><p>支持 CSV 与 Parquet 列映射；仅限 CN_A、1分钟或5分钟、RAW；按上海时区解释时间戳，成交量单位为股、成交额单位为人民币；最多64 MiB/100000行，每块512 KiB；分块预览最多显示100条Bar样本，并用barsTruncated提示，错误明细保持完整。时间戳支持上海本地 YYYY-MM-DD HH:mm 与 BaoStock YYYYMMDDHHmmssSSS 格式。</p><label>CSV 或 Parquet 文件 <input type="file" accept=".csv,text/csv,.parquet,application/vnd.apache.parquet" onChange={async (event)=>{const file=event.currentTarget.files?.[0]; if(!file)return; if(file.size>64*1024*1024){setError("分钟文件超过64 MiB限制");return;} const isParquet=file.name.toLowerCase().endsWith(".parquet"); const headerText=isParquet?"":await file.slice(0,128*1024).text(); const content=!isParquet&&file.size<=700_000?await file.text():""; const firstLine=headerText.replace(/^\uFEFF/,"").split(/\r?\n/,1)[0]??""; const headers=isParquet?[...csvFields]:parseCsvHeaders(firstLine); const savedSha=uploadSession&&(file.size>700_000||isParquet)?await sha256Bytes(await file.arrayBuffer()):null; const canResume=Boolean(uploadSession&&savedSha===uploadSession.expectedSha256&&uploadSession.mapping&&uploadSession.provenance&&uploadSession.fileFormat===(isParquet?"PARQUET":"CSV")); const defaultMapping=Object.fromEntries(csvFields.map((field)=>[field,isParquet?field:headers.find((header)=>header.toLowerCase()===field.toLowerCase())??headers[0]??""])); setCsvFile(file); setCsvContent(content); setCsvHeaders(headers); setCsvMapping(canResume?uploadSession!.mapping!:defaultMapping); if(canResume){setCsvProvenance(uploadSession!.provenance!);setHistoricalContext(uploadSession!.historicalContext??emptyHistoricalContext);setCsvFrequency(uploadSession!.frequency??"1m");setCsvTimestampSemantics(uploadSession!.timestampSemantics??"BAR_START");}else{setHistoricalContext(emptyHistoricalContext);} setData((old:any)=>({...old,csv:null}));}} /></label>{csvHeaders.length>0 && <><p>选择 CSV 源列，或填写 Parquet 源列名；每个目标字段必须对应一个不同的源列：</p>{csvFields.map((field)=><label key={field}>{field}{csvFile?.name.toLowerCase().endsWith(".parquet")?<input aria-label={`${field} Parquet 源列名`} value={csvMapping[field]??""} onChange={(event)=>{setCsvMapping((old)=>({...old,[field]:event.target.value}));setData((old:any)=>({...old,csv:null}));}} />:<select aria-label={`${field} CSV 源列`} value={csvMapping[field]??""} onChange={(event)=>{setCsvMapping((old)=>({...old,[field]:event.target.value}));setData((old:any)=>({...old,csv:null}));}}>{csvHeaders.map((header)=><option key={header} value={header}>{header}</option>)}</select>}</label>)}<h3>历史适用性引用</h3><p>缺少引用时导入仍可保存，但将标记为限制用途，不能据此直接开展历史回放。填写三个版本引用只表示已提供引用，仍需后续独立核验其内容和适用区间。</p><label>历史股票池版本<input aria-label="历史股票池版本" value={historicalContext.securityUniverseVersion??""} onChange={(event)=>{setHistoricalContext((old)=>({...old,securityUniverseVersion:event.target.value||null}));setData((old:any)=>({...old,csv:null}));}} /></label><label>MarketRuleSet版本<input aria-label="MarketRuleSet版本" value={historicalContext.marketRuleSetVersion??""} onChange={(event)=>{setHistoricalContext((old)=>({...old,marketRuleSetVersion:event.target.value||null}));setData((old:any)=>({...old,csv:null}));}} /></label><label>公司行动版本<input aria-label="公司行动版本" value={historicalContext.corporateActionVersion??""} onChange={(event)=>{setHistoricalContext((old)=>({...old,corporateActionVersion:event.target.value||null}));setData((old:any)=>({...old,csv:null}));}} /></label><h3>数据来源与许可</h3><label>数据来源名称 <input value={csvProvenance.sourceName} onChange={(event)=>{setCsvProvenance((old)=>({...old,sourceName:event.target.value}));setData((old:any)=>({...old,csv:null}));}} /></label><label>来源链接或引用（可留空） <input value={csvProvenance.sourceReference} onChange={(event)=>{setCsvProvenance((old)=>({...old,sourceReference:event.target.value}));setData((old:any)=>({...old,csv:null}));}} /></label><label>许可声明 <input value={csvProvenance.licenseStatement} onChange={(event)=>{setCsvProvenance((old)=>({...old,licenseStatement:event.target.value}));setData((old:any)=>({...old,csv:null}));}} /></label><label>取得时间 <input type="datetime-local" value={csvProvenance.acquiredAt} onChange={(event)=>{setCsvProvenance((old)=>({...old,acquiredAt:event.target.value}));setData((old:any)=>({...old,csv:null}));}} /></label><label><input type="checkbox" checked={csvProvenance.licenseVerification==="OPERATOR_CONFIRMED"} onChange={(event)=>{setCsvProvenance((old)=>({...old,licenseVerification:event.target.checked?"OPERATOR_CONFIRMED":"UNCONFIRMED"}));setData((old:any)=>({...old,csv:null}));}} /> 我确认已核对许可允许研究使用（这是操作者声明，不代表系统完成法律审查）</label><p>许可未确认的导入仍会保留来源记录，但会标记为不可用于研究。</p><button disabled={!csvFile||!csvProvenance.sourceName.trim()||!csvProvenance.licenseStatement.trim()||!csvProvenance.acquiredAt} onClick={()=>void uploadCsv("preview")}>上传并预览</button><button disabled={!data?.csv||data.csv.errors?.length>0||data.csv.acceptedRows===0} onClick={()=>void uploadCsv("import")}>确认并导入</button>{data?.csv?.uploadId&&data.csv.status==="PUBLISHED"&&<button data-testid="v22-record-upload-run" onClick={()=>void run("uploaded-csv",data.csv.uploadId,csvFile?.name.toLowerCase().endsWith(".parquet")?"PARQUET":"CSV")}>将此文件导入记入验收运行</button>}{uploadSession&&<><button data-testid="v22-read-upload-finalization" onClick={()=>void readCsvFinalization()}>查询持久导入任务</button><button onClick={()=>void cancelCsvUpload()}>取消此上传并释放配额</button></>}{data?.csvFinalization&&<p data-testid="v22-upload-finalization-state">持久导入任务 {data.csvFinalization.status} · 尝试 {data.csvFinalization.attempt}{data.csvFinalization.error?` · ${data.csvFinalization.error}`:""}</p>}</>}</section><section><h2>统一场景运行</h2><button onClick={()=>void run("normal")}>运行正常</button><button onClick={()=>void run("rejection")}>运行质量拒绝</button><button onClick={()=>void run("recovery")}>运行重复幂等</button></section>{data?.run && <section aria-label="V2.2 持久运行"><h2>当前持久运行</h2><dl><dt>testRunId</dt><dd data-testid="v22-test-run-id">{data.run.testRunId}</dd><dt>状态</dt><dd data-testid="v22-run-status">{data.run.status}</dd></dl></section>}<section aria-label="分钟数据查询与覆盖"><h2>分钟查询、覆盖与版本比较</h2><label>DataVersion <input aria-label="分钟查询版本" value={queryVersion} onChange={(event)=>setQueryVersion(event.target.value)} placeholder="v2.2-import-…" /></label><label>证券代码 <input aria-label="分钟查询证券" value={querySecurityId} onChange={(event)=>setQuerySecurityId(event.target.value)} placeholder="600000.SH" /></label><label>开始日期 <input aria-label="分钟查询开始日期" type="date" value={queryFromDate} onChange={(event)=>setQueryFromDate(event.target.value)} /></label><label>结束日期 <input aria-label="分钟查询结束日期" type="date" value={queryToDate} onChange={(event)=>setQueryToDate(event.target.value)} /></label><label>分钟频率 <select aria-label="覆盖频率" value={queryWindow} onChange={(event)=>setQueryWindow(Number(event.target.value) as 1|5)}><option value={1}>1分钟</option><option value={5}>5分钟</option></select></label><button disabled={!queryVersion.trim()||!querySecurityId.trim()||!queryFromDate||!queryToDate} onClick={()=>void queryMinuteBars()}>查询指定日分钟数据</button><button disabled={!queryVersion.trim()||!querySecurityId.trim()||!queryFromDate||!queryToDate} onClick={()=>void queryMinuteCoverage()}>计算覆盖与缺口</button><h3>分钟聚合与日线参考值对账</h3><p>日线参考值由操作者提供并记录来源；系统不独立核验该参考值。此数值比较不会证明分钟数据覆盖完整，需单独查看覆盖报告。</p>{(["open","high","low","close","volume","amount"] as const).map((field)=><label key={field}>{({open:"开盘",high:"最高",low:"最低",close:"收盘",volume:"成交量",amount:"成交额"} as const)[field]}<input aria-label={`日线参考${field}`} type="number" step="any" value={dailyReference[field]} onChange={(event)=>setDailyReference((old)=>({...old,[field]:event.target.value}))} /></label>)}<label>日线参考来源名称<input aria-label="日线参考来源名称" value={dailyReference.source} onChange={(event)=>setDailyReference((old)=>({...old,source:event.target.value}))} /></label><label>日线参考来源引用<input aria-label="日线参考来源引用" value={dailyReference.reference} onChange={(event)=>setDailyReference((old)=>({...old,reference:event.target.value}))} /></label><button disabled={!queryVersion.trim()||!querySecurityId.trim()||!queryFromDate||(["open","high","low","close","volume","amount"] as const).some((field)=>dailyReference[field]===""||!Number.isFinite(Number(dailyReference[field])))||!dailyReference.source.trim()||!dailyReference.reference.trim()} onClick={()=>void checkDailyAggregate()}>对账分钟聚合</button><label>对比 DataVersion <input aria-label="分钟比较版本" value={compareVersion} onChange={(event)=>setCompareVersion(event.target.value)} /></label><button disabled={!queryVersion.trim()||!compareVersion.trim()||!querySecurityId.trim()||!queryFromDate||!queryToDate} onClick={()=>void compareMinuteVersions()}>比较两个版本</button>{data?.queriedImport&&<p>导入 {data.queriedImport.version} · {data.queriedImport.status} · {data.queriedImport.accepted} bars · 许可研究用途 {data.queriedImport.manifest?.researchUseAllowed?"已声明":"关闭/未确认"}</p>}{data?.queriedBars&&<><p>查询结果 {data.queriedBars.items?.length??0} 条；页大小 200。</p><table><thead><tr><th>证券</th><th>Bar开始</th><th>OHLC</th><th>量/额</th></tr></thead><tbody>{data.queriedBars.items?.map((bar:any)=><tr key={`${bar.securityId}:${bar.barStart}`}><td>{bar.securityId}</td><td>{bar.barStart}</td><td>{bar.open}/{bar.high}/{bar.low}/{bar.close}</td><td>{bar.volume}/{bar.amount}</td></tr>)}</tbody></table></>}{data?.minuteCoverage&&<><p>覆盖 {data.minuteCoverage.status} · 应有 {data.minuteCoverage.expectedBars} · 有效 {data.minuteCoverage.validBars} · 缺失 {data.minuteCoverage.missingBars} · 未知 {data.minuteCoverage.unknownBars} · 停牌 {data.minuteCoverage.suspendedBars}</p><table><thead><tr><th>证券</th><th>Bar开始</th><th>状态</th><th>证据引用</th></tr></thead><tbody>{data.minuteCoverage.barStatuses?.map((bar:any)=><tr key={`${bar.securityId}:${bar.barStart}`}><td>{bar.securityId}</td><td>{bar.barStart}</td><td>{bar.status}</td><td>{bar.sourceReference??"—"}</td></tr>)}</tbody></table></>}{data?.minuteDailyAggregate&&<><h4>分钟聚合对账结果：{data.minuteDailyAggregate.status}</h4><p>证券 {data.minuteDailyAggregate.securityId} · 交易日 {data.minuteDailyAggregate.tradingDate} · 观察到 {data.minuteDailyAggregate.observedBars} 根分钟Bar。参考来源：{data.minuteDailyAggregate.referenceSource}（{data.minuteDailyAggregate.sourceReference}）；参考值未独立核验。分钟覆盖完整性：未由本对账评估。</p>{data.minuteDailyAggregate.aggregate&&<table><thead><tr><th>字段</th><th>分钟聚合</th><th>日线参考</th><th>差值</th></tr></thead><tbody>{(["open","high","low","close","volume","amount"] as const).map((field)=><tr key={field}><td>{field}</td><td>{data.minuteDailyAggregate.aggregate[field]}</td><td>{data.minuteDailyAggregate.reference[field]}</td><td>{data.minuteDailyAggregate.aggregate[field]-data.minuteDailyAggregate.reference[field]}</td></tr>)}</tbody></table>}<p>检查问题：{data.minuteDailyAggregate.issues?.join("，")||"无"}</p></>}{data?.minuteVersionComparison&&<><p>{data.minuteVersionComparison.leftVersion} ↔ {data.minuteVersionComparison.rightVersion} · 对比 {data.minuteVersionComparison.rows.length} 个Bar键。状态按 OHLCV/amount 精确相等判断；超出首1000行时需缩小日期范围。</p><table><thead><tr><th>Bar键</th><th>比较结果</th><th>左值</th><th>右值</th></tr></thead><tbody>{data.minuteVersionComparison.rows.map((row:any)=><tr key={row.key}><td>{row.key}</td><td>{row.status}</td><td>{row.left?`${row.left.open}/${row.left.high}/${row.left.low}/${row.left.close} · ${row.left.volume}/${row.left.amount}`:"—"}</td><td>{row.right?`${row.right.open}/${row.right.high}/${row.right.low}/${row.right.close} · ${row.right.volume}/${row.right.amount}`:"—"}</td></tr>)}</tbody></table></>}</section>{data && <pre data-testid="v22-evidence">{JSON.stringify(data,null,2)}</pre>}</main>; }

function HistoricalContextVersionRegistration() {
  const [kind, setKind] = useState<"SECURITY_UNIVERSE" | "MARKET_RULE_SET" | "CORPORATE_ACTIONS">("SECURITY_UNIVERSE");
  const [version, setVersion] = useState(""); const [validFrom, setValidFrom] = useState(""); const [validTo, setValidTo] = useState(""); const [sourceReference, setSourceReference] = useState("");
  const [content, setContent] = useState("{}"); const [result, setResult] = useState<any>(null); const [error, setError] = useState<string | null>(null);
  const save = async () => { try { setError(null); const accepted = await api<any>("/api/v1/acceptance/v2/v2.3/historical-context/versions", { method: "POST", body: JSON.stringify({ kind, version, content: JSON.parse(content), validFrom, validTo, sourceReference }) }); setResult(accepted); } catch (e) { setError(String(e)); } };
  return <section><h2>登记历史上下文版本（所有者声明）</h2><p>登记来源引用、内容与覆盖期；服务端检查内容Hash、日期和证券范围。来源真实性及市场事实不会由系统独立核验，此登记只代表当前用户声明。</p><label>上下文类型 <select aria-label="历史上下文类型" value={kind} onChange={(event) => setKind(event.target.value as typeof kind)}><option value="SECURITY_UNIVERSE">历史股票池</option><option value="MARKET_RULE_SET">MarketRuleSet</option><option value="CORPORATE_ACTIONS">公司行动覆盖</option></select></label><label>版本号 <input aria-label="历史上下文版本号" value={version} onChange={(event) => setVersion(event.target.value)} /></label><label>有效起始时间 <input aria-label="历史上下文有效起始时间" placeholder="2026-01-01T00:00:00Z" value={validFrom} onChange={(event) => setValidFrom(event.target.value)} /></label><label>有效结束时间 <input aria-label="历史上下文有效结束时间" placeholder="2026-12-31T23:59:59Z" value={validTo} onChange={(event) => setValidTo(event.target.value)} /></label><label>来源文件或引用 <input aria-label="历史上下文来源引用" value={sourceReference} onChange={(event) => setSourceReference(event.target.value)} /></label><label>版本内容 JSON <textarea aria-label="历史上下文内容 JSON" value={content} onChange={(event) => setContent(event.target.value)} placeholder={kind === "MARKET_RULE_SET" ? '{"market":"CN_A","sessions":[{"start":"09:30","end":"11:30"}]}' : '{"securities":[{"securityId":"600000.SH","validFrom":"2026-01-01T00:00:00Z","validTo":"2026-12-31T23:59:59Z"}],"actions":[]}' } /></label><button disabled={!version.trim() || !validFrom || !validTo || !sourceReference.trim()} onClick={() => void save()}>登记不可变版本</button>{error && <p role="alert" className="error">{error}</p>}{result && <pre data-testid="v23-history-registration-result">{JSON.stringify(result, null, 2)}</pre>}</section>;
}

function V23Acceptance() { const [data, setData] = useState<any>(null); const [error, setError] = useState<string | null>(null); const [qlibRun, setQlibRun] = useState<any>(null); const [importVersion, setImportVersion] = useState(""); const load = async (path: string) => { try { setError(null); const preview = await api<any>(path); setData((old: any) => ({ ...(old ?? {}), preview })); } catch (e) { setError(String(e)); } }; const run = async (scenarioId: string, defer = false) => { try { setError(null); const accepted = await api<any>("/api/v1/acceptance/v2/v2.3/runs", { method: "POST", body: JSON.stringify({ scenarioId, seed: 20260907, defer }) }); const result = defer ? accepted : await api<any>(`/api/v1/acceptance/v2/v2.3/runs/${accepted.testRunId}`); setData((old: any) => ({ ...(old ?? {}), run: result })); } catch (e) { setError(String(e)); } }; const runImportedMinutes = async () => { try { setError(null); const accepted = await api<any>("/api/v1/acceptance/v2/v2.3/runs/from-minute-import", { method: "POST", body: JSON.stringify({ dataVersion: importVersion.trim(), seed: 20260907 }) }); const result = await api<any>(`/api/v1/acceptance/v2/v2.3/runs/${accepted.testRunId}`); setData((old: any) => ({ ...(old ?? {}), run: result })); } catch (e) { setError(String(e)); } }; const runQlib = async () => { try { setError(null); const accepted = await api<any>("/api/v1/acceptance/v2/v2.3/research/qlib-fixture/runs", { method: "POST", body: "{}" }); const result = await api<any>(`/api/v1/acceptance/v2/v2.3/runs/${accepted.testRunId}`); setQlibRun(result); } catch (e) { setError(String(e)); } }; const worker = async (action?: string) => { const id = data?.run?.testRunId; if (!id) return; try { setError(null); const path = action ? `/api/v1/acceptance/v2/v2.3/runs/${id}/worker/${action}` : `/api/v1/acceptance/v2/v2.3/runs/${id}/worker`; const result = await api<any>(path, action ? { method: "POST", body: "{}" } : undefined); setData((old: any) => ({ ...(old ?? {}), worker: result })); } catch (e) { setError(String(e)); } }; const research = data?.run?.evidence?.crossService?.research; const qlibEvidence = qlibRun?.evidence?.crossService?.research; return <main><header><p className="eyebrow">StockQuant · 开发验收中心</p><h1>V2.3 日频决策、分钟撮合与历史事件回放</h1><p>MINUTE_BAR / BACKTEST / FAKE；虚拟时钟、确定性事件屏障、检查点恢复与 Qlib 研究。</p></header>{error && <p role="alert" className="error">{error}</p>}<section><h2>回放数据</h2><button onClick={()=>void load("/api/v1/acceptance/v2/v2.3/preview")}>预览回放数据</button></section><HistoricalContextVersionRegistration /><section><h2>已导入分钟数据回放</h2><p>回放前会核对上下文版本、Hash、有效期、证券覆盖和研究用途配置；READY 只表示这些结构检查通过，来源事实仍是所有者声明，未独立核验。未通过时不会创建 TestRun 或 Worker 运行。当前验证切片只回放 600000.SH 的前 120 根Bar。</p><label>DataVersion <input aria-label="分钟导入版本" value={importVersion} onChange={(event) => setImportVersion(event.target.value)} placeholder="v2.2-import-…" /></label><button disabled={!importVersion.trim()} onClick={() => void runImportedMinutes()}>校验并回放导入数据</button></section><section><h2>统一场景运行</h2><button onClick={()=>void run("normal")}>运行正常回放</button><button onClick={()=>void run("rejection")}>运行未来信息拒绝</button><button onClick={()=>void run("recovery")}>运行检查点恢复</button><button onClick={()=>void run("normal", true)}>启动可暂停长回放</button></section><section><h2>Qlib Fixture 工程验证</h2><p>使用确定性合成样本执行实际 Qlib fit/predict；不读取市场数据；模型独立验证仍未运行，Fixture 模型和预测产物会以 TestRun 绑定方式持久保存。</p><button onClick={()=>void runQlib()}>运行合成 Fixture Qlib TestRun</button>{qlibRun && <pre data-testid="v23-qlib-fixture-evidence">{JSON.stringify(qlibRun,null,2)}</pre>}{qlibEvidence && <p data-testid="v23-qlib-fixture-status">{qlibEvidence.status} · {qlibEvidence.adapter} · {qlibEvidence.dataMode} · validation={qlibEvidence.modelValidation} · Artifact={qlibEvidence.durableArtifactStatus}{qlibEvidence.artifactRef?.url && <> · <a href={qlibEvidence.artifactRef.url} download>下载模型与预测产物</a></>}</p>}</section>{data?.run && <section><h2>Worker 生命周期</h2><button onClick={()=>void worker()}>查询状态</button><button onClick={()=>void worker("pause")}>暂停</button><button onClick={()=>void worker("resume")}>恢复</button><button onClick={()=>void worker("cancel")}>取消</button>{data.worker && <pre data-testid="v23-worker-status">{JSON.stringify(data.worker,null,2)}</pre>}</section>}{research && <section><h2>历史回放研究摘要</h2><p data-testid="v23-research-status">{research.status} · {research.adapter} · {research.dataMode} · modelCalls={research.modelCalls}</p><code data-testid="v23-research-hash">{research.artifactHash}</code></section>}{data && <pre data-testid="v23-evidence">{JSON.stringify(data,null,2)}</pre>}</main>; }

type FixtureTargetRun = { testRunId: string; status: string; createdAt: string };
type FixtureTargetJobView = { testRunId: string; job: { jobId: string; state: string; attempt: number } | null; target: { decision: { action: string; reason: string }; clientOrderId: string | null } | null };

function V24FixtureTargetPanel() {
  const [runs, setRuns] = useState<FixtureTargetRun[]>([]);
  const [selected, setSelected] = useState<string | null>(null);
  const [view, setView] = useState<FixtureTargetJobView | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const base = "/api/v1/acceptance/v2/v2.4/fixture-target/runs";
  const list = async () => setRuns(await api<FixtureTargetRun[]>(base));
  const read = async (id: string) => { const result = await api<FixtureTargetJobView>(`${base}/${encodeURIComponent(id)}/job`); setSelected(id); setView(result); };
  const perform = async (action: () => Promise<void>) => { setBusy(true); setError(null); try { await action(); } catch (cause) { setError(String(cause)); } finally { setBusy(false); } };
  return <section aria-label="隔离日线目标任务"><h2>隔离日线目标任务</h2>
    <p>固定两日合成数据，目标保持暂停。任务完成不代表阶段验收通过；后台 Worker 默认关闭。</p>
    {error && <p role="alert">{error}。如创建响应丢失，请刷新任务列表并恢复原 Run。</p>}
    <button disabled={busy} onClick={() => void perform(async () => { const result = await api<{ testRunId: string }>(base, { method: "POST" }); await list(); await read(result.testRunId); })}>创建隔离日线目标任务</button>
    <button disabled={busy} onClick={() => void perform(list)}>刷新目标任务列表</button>
    {runs.length > 0 && <ul>{runs.map((run) => <li key={run.testRunId}>{run.testRunId} · {run.status} <button disabled={busy} onClick={() => void perform(() => read(run.testRunId))}>查看任务 {run.testRunId}</button></li>)}</ul>}
    {selected && <div><p data-testid="v24-fixture-target-run">{selected}</p><p data-testid="v24-fixture-target-job">任务：{view?.job?.state ?? "尚未创建"}；领取次数：{view?.job?.attempt ?? 0}</p><p data-testid="v24-fixture-target-decision">目标：{view?.target ? `${view.target.decision.action} · ${view.target.decision.reason}` : "尚未生成"}</p>
      <button disabled={busy} onClick={() => void perform(() => read(selected))}>刷新当前目标任务</button>
      <button disabled={busy} onClick={() => void perform(async () => { await api(`${base}/${encodeURIComponent(selected)}/resume`, { method: "POST" }); await list(); await read(selected); })}>恢复原目标任务</button>
    </div>}
  </section>;
}

function C5LocalEngineering() {
  const dates = ["2024-01-04", "2024-01-05", "2024-01-08", "2024-01-09", "2024-01-10"];
  const base = "/api/v1/acceptance/v2/v2.4/local-engineering";
  const storageKey = "stockquant:v24:c5-local-testRunId";
  const [run, setRun] = useState<any>(null); const [date, setDate] = useState(dates[0]);
  const [mandate, setMandate] = useState<any>(null); const [job, setJob] = useState<any>(null);
  const [error, setError] = useState<string | null>(null); const [busy, setBusy] = useState(false);
  const perform = async (action: () => Promise<void>) => { setBusy(true); setError(null); try { await action(); } catch (cause) { setError(String(cause)); } finally { setBusy(false); } };
  const load = async (id = run?.testRunId) => { if (!id) return; const next = await api<any>(`${base}/runs/${encodeURIComponent(id)}`); setRun(next); const saved = next.evidence?.c5MandatesByDate?.[date]; setMandate(saved ?? null); const jobResult = await api<any>(`${base}/runs/${encodeURIComponent(id)}/sessions/${date}/job`); setJob(jobResult.job); };
  useEffect(() => { const id = window.localStorage.getItem(storageKey); if (id) void api<any>(`${base}/runs/${encodeURIComponent(id)}`).then((next) => { setRun(next); }).catch((cause) => setError(String(cause))); }, []);
  useEffect(() => { if (run?.testRunId) void load(run.testRunId).catch((cause) => setError(String(cause))); }, [run?.testRunId, date]);
  const create = async () => { const next = await api<any>(`${base}/runs`, { method: "POST", body: "{}" }); window.localStorage.setItem(storageKey, next.testRunId); setRun(await api<any>(`${base}/runs/${next.testRunId}`)); };
  const createMandate = async () => { const next = await api<any>(`${base}/runs/${run.testRunId}/mandates`, { method: "POST", body: JSON.stringify({ mandateId: crypto.randomUUID(), sessionDate: date, reason: "Owner-approved single-session C5 local Fixture evaluation" }) }); setMandate(next); await load(); };
  const activate = async () => { const next = await api<any>(`${base}/runs/${run.testRunId}/mandates/${mandate.mandateId}/activate`, { method: "POST", body: JSON.stringify({ mandateVersion: mandate.mandateVersion, contentHash: mandate.contentHash, reason: "Owner explicitly activates this bounded session Mandate" }) }); setMandate(next); await load(); };
  const pause = async () => { const next = await api<any>(`${base}/runs/${run.testRunId}/mandates/${mandate.mandateId}/pause`, { method: "POST", body: JSON.stringify({ mandateVersion: mandate.mandateVersion, reason: "Owner pauses the prior session before continuing" }) }); setMandate(next); await load(); };
  const authorize = async () => { const next = await api<any>(`${base}/runs/${run.testRunId}/sessions/${date}/authorize`, { method: "POST", body: JSON.stringify({ mandateId: mandate.mandateId }) }); setJob(next.job); await load(); };
  return <main><header><p className="eyebrow">StockQuant · 开发验收中心</p><h1>C5 本地 Fixture 工程闭环</h1><p>仅隔离的 CN_A / PAPER / FAKE 账户与冻结 Fixture。此页要求所有者逐个创建、激活、暂停 Mandate；不会自动授权或自动调仓。LIVE 与真实券商均不参与。</p><a href="/acceptance/v2/v2.4">返回 V2.4 验收中心</a></header>{error && <p role="alert" className="error">{error}</p>}<section><h2>TestRun</h2><button disabled={busy} onClick={()=>void perform(create)}>创建隔离 C5 TestRun</button><button disabled={busy||!run} onClick={()=>void perform(()=>load())}>刷新同一 Run</button><button disabled={busy||!run} onClick={()=>void perform(async()=>{await api(`${base}/runs/${run.testRunId}/resume`,{method:"POST",body:"{}"});await load();})}>恢复同一 Run 设置</button>{run && <><p data-testid="c5-local-test-run">{run.testRunId} · {run.status} · {run.namespace}</p><p>配置：{run.evidence?.setupState}；账户：{run.evidence?.accountId ?? "等待设置"}</p></>}</section>{run && <section><h2>逐日授权与执行</h2><label>合成交易日 <select value={date} onChange={(event)=>setDate(event.target.value)}>{dates.map((item)=><option key={item}>{item}</option>)}</select></label><p>此日期 Mandate：{mandate?.status ?? "未创建"} · Job：{job?.state ?? "未排队"}</p><button disabled={busy||!run.evidence?.accountId||!!mandate} onClick={()=>void perform(createMandate)}>为当日创建 Mandate</button><button disabled={busy||!mandate||mandate.status!=="PENDING"} onClick={()=>void perform(activate)}>明确激活当日 Mandate</button><button disabled={busy||!mandate||mandate.status!=="ACTIVE"} onClick={()=>void perform(pause)}>暂停当日 Mandate</button><button disabled={busy||!mandate||mandate.status!=="ACTIVE"||!!job} onClick={()=>void perform(authorize)}>排队当日授权评估</button><button disabled={busy} onClick={()=>void perform(()=>load())}>查询 Job</button><p>授权 Worker 默认关闭；需在本地服务配置 STOCKQUANT_C5_LOCAL_AUTHORIZATION_WORKER_ENABLED=true 并重启后处理排队任务。刷新/关闭浏览器不会取消持久任务。</p>{job && <pre data-testid="c5-local-job">{JSON.stringify(job,null,2)}</pre>}<details><summary>Run 证据</summary><pre>{JSON.stringify(run,null,2)}</pre></details></section>}{run && <section><h2>人工收口检查</h2><p>全部五日任务完成后可请求服务端核对买入、卖出、持有、下一交易日结算、独立 FakeBroker 资产与对账。此操作不填写人工验收签字。</p><button disabled={busy} onClick={()=>void perform(async()=>{await api(`${base}/runs/${run.testRunId}/finalize`,{method:"POST",body:"{}"});await load();})}>核对并完成 Run</button></section>}</main>;
}

function V24Acceptance() {
  const [data, setData] = useState<any>(null); const [error, setError] = useState<string | null>(null);
  const [runningScenario, setRunningScenario] = useState<V24PaperStageRunRequest["scenarioId"] | null>(null);
  const [observations, setObservations] = useState<Array<{ observationDate: string; testRunId: string | null; reconciliationStatus: string; errors: string[] }>>([]);
  const [revisionData, setRevisionData] = useState<V24ObservationRevisionList | null>(null);
  const [recoveryHistory, setRecoveryHistory] = useState<any>(null);
  const [paperReadiness, setPaperReadiness] = useState<V24PaperReadiness | null>(null);
  const call = async (path: string, init?: RequestInit) => { try { setError(null); setData(await api<any>(path, init)); } catch (e) { setError(String(e)); } };
  const loadObservations = async () => { try { setError(null); setObservations(await api<Array<{ observationDate: string; testRunId: string | null; reconciliationStatus: string; errors: string[] }>>("/api/v1/acceptance/v2/v2.4/observations")); } catch (e) { setError(String(e)); } };
  const loadRevisions = async (testRunId: string) => { try { setError(null); setRevisionData(await api<V24ObservationRevisionList>(`/api/v1/acceptance/v2/v2.4/runs/${testRunId}/revisions`)); } catch (e) { setError(String(e)); } };
  const loadPaperReadiness = async () => { try { setError(null); setPaperReadiness(await api<V24PaperReadiness>("/api/v1/acceptance/v2/v2.4/paper-readiness?market=CN_A")); } catch (e) { setError(String(e)); } };
  const testRunStorageKey = "stockquant:v24:paper-testRunId";
  useEffect(() => {
    const savedTestRunId = window.localStorage.getItem(testRunStorageKey);
    if (savedTestRunId) void api<V24PaperStageRunResult>(`/api/v1/acceptance/v2/v2.4/runs/${encodeURIComponent(savedTestRunId)}`).then(setData).catch((cause) => setError(String(cause)));
  }, []);
  const run = async (scenarioId: V24PaperStageRunRequest["scenarioId"]) => {
    try {
      setError(null); setRevisionData(null); setData(null); setRunningScenario(scenarioId);
      const request: V24PaperStageRunRequest = { scenarioId, seed: 20260907 };
      const accepted = await api<V24PaperStageRunAccepted>("/api/v1/acceptance/v2/v2.4/runs", { method: "POST", body: JSON.stringify(request) });
      window.localStorage.setItem(testRunStorageKey, accepted.testRunId);
      setData(await api<V24PaperStageRunResult>(`/api/v1/acceptance/v2/v2.4/runs/${encodeURIComponent(accepted.testRunId)}`));
    } catch (e) { setError(String(e)); } finally { setRunningScenario(null); }
  };
  const recoverFailedRun = async () => {
    if (!data?.testRunId) return;
    try {
      setError(null); setRunningScenario("recovery");
      await api(`/api/v1/acceptance/v2/v2.4/runs/${encodeURIComponent(data.testRunId)}/recover`, { method: "POST" });
      setData(await api<V24PaperStageRunResult>(`/api/v1/acceptance/v2/v2.4/runs/${encodeURIComponent(data.testRunId)}`));
      setRecoveryHistory(await api<any>(`/api/v1/acceptance/v2/v2.4/runs/${encodeURIComponent(data.testRunId)}/history`));
    } catch (e) { setError(String(e)); } finally { setRunningScenario(null); }
  };
  const summary = data?.targetDays !== undefined && data?.countedDays !== undefined ? data : null;
  const policyReadiness = paperReadiness?.policyReadiness;
  const mandateReadiness = paperReadiness?.mandateReadiness;
  const evidence = data?.evidence ?? {};
  const fill = evidence.fills?.[0];
  const order = evidence.order ?? evidence.orders?.[0];
  const riskAssertion = evidence.assertions?.find((item: any) => item.assertionId === "V2.4-PAPER-002");
  const candidateRisk = evidence.candidateRisk;
  const businessEvents = [
    evidence.dailyTarget && { event: `日频目标 ${evidence.dailyTarget.strategyVersion}`, time: evidence.dailyTarget.evaluationAt, status: `${evidence.dailyTarget.decision.action} · 目标${evidence.dailyTarget.targetQuantity}股 · ${evidence.dailyTarget.targetId}` },
    evidence.fixture && { event: `Fixture ${evidence.fixture.fixtureId} v${evidence.fixture.fixtureVersion}`, time: evidence.source?.observedAt ?? "固定样本", status: evidence.source?.status ?? "LOADED" },
    (evidence.authorization || evidence.governance) && { event: "治理授权", time: evidence.authorization?.expiresAt ?? "", status: evidence.authorization?.status ?? `${evidence.governance.status} · HTTP ${evidence.governance.httpStatus}` },
    riskAssertion && { event: "风控检查", time: "", status: riskAssertion.status },
    candidateRisk && { event: "候选风险账", time: "", status: `${candidateRisk.projection?.reconciliation?.status ?? "NOT_RUN"} · 日累计${candidateRisk.state?.dailyTurnover ?? "NOT_AVAILABLE"} · 敞口${candidateRisk.state?.grossExposure ?? "NOT_AVAILABLE"} · 亏损${candidateRisk.state?.cumulativeLoss ?? "NOT_AVAILABLE"}` },
    (order || evidence.orders) && { event: "FakeBroker订单", time: order?.acceptedAt ?? "", status: order?.status ?? "未创建" },
    fill && { event: "成交回报", time: fill.effectiveAt ?? "", status: `${fill.quantity}股 · ${fill.price} · 费用${fill.fee}` },
    evidence.outbox && { event: "Outbox对账", time: evidence.outbox.delivered_at ?? evidence.outbox.created_at ?? "", status: evidence.outbox.status },
    evidence.crossday?.settlement && { event: "跨日结算", time: evidence.crossday.settlement.asOf ?? "", status: evidence.crossday.settlement.status ?? "SETTLED" },
    evidence.reconciliation && { event: "最终对账", time: "", status: `订单${evidence.reconciliation.order_count ?? 0} / Fill${evidence.reconciliation.fill_count ?? 0} / 待处理${evidence.reconciliation.pending_outbox_count ?? 0}` }
  ].filter(Boolean) as Array<{ event: string; time: string; status: string }>;
  const downloadEvidence = () => {
    if (!data) return;
    const url = URL.createObjectURL(new Blob([JSON.stringify(data, null, 2)], { type: "application/json" }));
    const link = document.createElement("a"); link.href = url; link.download = `v24-paper-${data.testRunId}.json`; link.click(); URL.revokeObjectURL(url);
  };
  return <main><header><p className="eyebrow">StockQuant · 开发验收中心</p><h1>V2.4 真实时钟下持续模拟交易</h1><p data-testid="v24-mode">当前活动行情为 NOT_CONNECTED；默认Paper策略仍为PREPARATION_ONLY，LIVE关闭。验收场景仅运行冻结的隔离FIXTURE / PAPER / FAKE链路，不会启用活动策略。</p><a href="/paper">查看 Paper 只读状态概览</a></header>{error && <p role="alert" className="error">{error}</p>}<V24FixtureTargetPanel /><section><h2>运行配置</h2><button onClick={()=>void loadPaperReadiness()}>检查 Paper 就绪门禁</button><button onClick={()=>void call("/api/v1/acceptance/v2/v2.4/preview")}>查看采样与执行窗口</button><button onClick={()=>void call("/api/v1/acceptance/v2/v2.4/scheduler/status")}>查看调度状态</button><button onClick={()=>void call("/api/v1/acceptance/v2/v2.4/observation-summary")}>查看日终观察进度</button><button onClick={()=>void loadObservations()}>查看观察记录</button><button onClick={()=>void call("/api/v1/acceptance/v2/v2.4/scheduler/start", { method: "POST", body: "{}" })}>启动调度</button><button onClick={()=>void call("/api/v1/acceptance/v2/v2.4/scheduler/tick", { method: "POST", body: "{}" })}>执行一次采样 Tick</button><button onClick={()=>void call("/api/v1/acceptance/v2/v2.4/scheduler/stop", { method: "POST" })}>停止调度</button><button disabled={runningScenario !== null} onClick={()=>void run("normal")}>运行隔离Paper正常场景</button><button disabled={runningScenario !== null} onClick={()=>void run("rejection")}>运行隔离Paper拒绝场景</button><button disabled={runningScenario !== null} onClick={()=>void run("recovery")}>运行隔离Paper恢复场景</button><button disabled={runningScenario !== null} onClick={()=>void run("external-reconciliation")}>运行外部订单差异场景</button><button disabled={runningScenario !== null} onClick={()=>void run("crossday-settlement")}>运行跨日结算场景</button><button disabled={runningScenario !== null} onClick={()=>void run("candidate-binding")}>运行 Candidate A 绑定与暂停场景</button>{runningScenario && <p role="status">{runningScenario} 场景正在执行，后台运行状态保存在 TestRun 中。</p>}</section>{paperReadiness && <section aria-label="Paper 就绪门禁"><h2>Paper 就绪门禁</h2><p data-testid="v24-paper-readiness">{paperReadiness.market} · {paperReadiness.status} · {paperReadiness.environmentMode}/{paperReadiness.brokerMode}</p><p>策略：{policyReadiness?.status}；Mandate：{mandateReadiness?.status}</p><p>风控：{paperReadiness.riskEvaluation.status}；资源预留：{paperReadiness.resourceReservation.status}；下单：{paperReadiness.orderSubmissionEnabled ? "开启" : "关闭"}</p><p>LIVE：{paperReadiness.liveTradingEnabled ? "开启" : "关闭"}</p></section>}{summary && <section aria-label="日终观察汇总"><h2>日终观察汇总</h2><dl><dt>严格证据通过的观察日</dt><dd data-testid="v24-observed-days">{summary.countedDays}/{summary.targetDays}</dd><dt>剩余观察日</dt><dd data-testid="v24-remaining-days">{summary.remainingDays}</dd><dt>历史系统曾标记计数</dt><dd data-testid="v24-recorded-observed-days">{summary.recordedCountedDays ?? summary.countedDays}/{summary.targetDays}</dd><dt>旧计数待补证</dt><dd data-testid="v24-unverified-observed-days">{summary.unverifiedCountedDays ?? 0}</dd><dt>状态</dt><dd data-testid="v24-observation-status">{summary.status}</dd></dl></section>}{observations.length > 0 && <section aria-label="观察运行历史"><h2>观察运行历史</h2><ul>{observations.filter((item) => item.testRunId).map((item) => <li key={item.testRunId} data-testid={`v24-observation-run-${item.testRunId}`}>{item.observationDate} · {item.reconciliationStatus} · {item.errors.length} 个错误 <button onClick={() => void loadRevisions(item.testRunId!)}>查看 {item.observationDate} 修订历史</button></li>)}</ul></section>}{revisionData && <section aria-label="观察证据修订历史"><h2>观察证据修订历史</h2><p>TestRun：{revisionData.testRunId}；修订数：{revisionData.revisions.length}</p>{revisionData.revisions.length === 0 ? <p>此运行没有历史修订。</p> : revisionData.revisions.map((revision) => <article key={revision.revisionId}><h3>修订 {revision.revisionId} · {revision.reason}</h3><p>原状态：{revision.priorStatus}；记录时间：{revision.recordedAt}</p><pre>{JSON.stringify({ assertions: revision.priorAssertions, evidence: revision.priorEvidence }, null, 2)}</pre></article>)}</section>}{data && <section aria-label="Paper场景业务证据"><h2>隔离 Paper 场景结果</h2><p data-testid="v24-scenario-status">{data.scenarioId} · {data.status}</p>{data.status === "FAILED" && data.scenarioId === "recovery" && evidence.recovery && <button data-testid="v24-resume-failed-run" disabled={runningScenario !== null} onClick={()=>void recoverFailedRun()}>按原订单身份安全恢复此 TestRun</button>}<dl><dt>TestRun</dt><dd data-testid="v24-test-run-id">{data.testRunId}</dd><dt>执行环境</dt><dd>{evidence.environmentMode ?? "PAPER"} / {evidence.dataMode ?? "FIXTURE"} / {evidence.brokerMode ?? "FAKE"}</dd><dt>LIVE</dt><dd>{evidence.executionPolicy?.liveTradingEnabled === true ? "开启" : "关闭"}</dd>{evidence.authorization && <><dt>授权</dt><dd data-testid="v24-authorization-result">{evidence.authorization.status}</dd></>}{evidence.governance && <><dt>拒绝结果</dt><dd data-testid="v24-governance-result">{evidence.governance.status} · HTTP {evidence.governance.httpStatus}</dd></>}{order && <><dt>订单状态</dt><dd data-testid="v24-order-status">{order.status} · {evidence.signal?.security ?? ""} · {evidence.signal?.quantity ?? ""}</dd></>}{riskAssertion && <><dt>风控检查</dt><dd data-testid="v24-risk-result">{riskAssertion.status} · {riskAssertion.expected}</dd></>}{candidateRisk && <><dt>候选风险账</dt><dd data-testid="v24-candidate-risk">{candidateRisk.projection?.reconciliation?.status ?? "NOT_RUN"} · 日累计 {candidateRisk.state?.dailyTurnover ?? "NOT_AVAILABLE"} · 敞口 {candidateRisk.state?.grossExposure ?? "NOT_AVAILABLE"} · 亏损 {candidateRisk.state?.cumulativeLoss ?? "NOT_AVAILABLE"} · 成交 {candidateRisk.state?.appliedFills?.length ?? 0}</dd></>}{fill && <><dt>成交</dt><dd data-testid="v24-fill-summary">{fill.quantity} 股 × {fill.price}；费用 {fill.fee}</dd></>}{evidence.resourceReservation && <><dt>资金预留</dt><dd data-testid="v24-reservation-status">{evidence.resourceReservation.status} · {evidence.resourceReservation.capturedCashAmount ?? evidence.resourceReservation.amount}</dd></>}{evidence.account && <><dt>现金</dt><dd data-testid="v24-cash">{evidence.account.cash?.amount} {evidence.account.cash?.currency}</dd><dt>持仓</dt><dd data-testid="v24-positions">{(evidence.account.positions ?? []).map((position: any) => `${position.security} ${position.quantity}股`).join("，") || "无"}</dd><dt>账本条目</dt><dd>{evidence.account.ledgerEntryCount}</dd></>}{evidence.reconciliation && <><dt>对账</dt><dd data-testid="v24-reconciliation">{evidence.reconciliation.status ?? "已检查"} · 订单 {evidence.reconciliation.order_count ?? 0}，成交 {evidence.reconciliation.fill_count ?? 0}，待处理 {evidence.reconciliation.pending_outbox_count ?? 0}，外部未匹配 {evidence.reconciliation.externalOnlyOrderCount ?? 0}</dd>{evidence.reconciliation.discrepancies?.length > 0 && <><dt>对账差异</dt><dd data-testid="v24-reconciliation-discrepancies"><ul>{evidence.reconciliation.discrepancies.map((item: any) => <li key={item.externalOrderId}>{item.kind} · {item.externalOrderId} · {item.security} {item.requestedQuantity}股 · {item.status} · {item.evidenceRef}</li>)}</ul></dd></>}</>}{evidence.fixture && <><dt>Fixture</dt><dd>{evidence.fixture.fixtureId} v{evidence.fixture.fixtureVersion} · SHA-256 {evidence.fixture.manifestSha256}</dd></>}{data.assertions?.length > 0 && <><dt>断言</dt><dd>{data.assertions.filter((item: any) => item.status === "PASS").length}/{data.assertions.length} PASS</dd></>}</dl>{evidence.candidateBinding && <section aria-label="Candidate A 暂停门禁"><h3>Candidate A 暂停门禁</h3><p data-testid="v24-candidate-mandate-status">Mandate：{evidence.candidateBinding.mandate?.status ?? "UNKNOWN"}</p><p data-testid="v24-candidate-mandate-expiry">到期目标：{evidence.candidateBinding.expiredMandateAdmission?.action ?? "UNKNOWN"} · {evidence.candidateBinding.expiredMandateAdmission?.reason ?? "UNKNOWN"} · 数量 {evidence.candidateBinding.expiredMandateAdmission?.quantity ?? "UNKNOWN"}</p><p data-testid="v24-candidate-quote-gates">行情门禁：陈旧 {evidence.candidateBinding.executionAdmission?.stale?.reason ?? "UNKNOWN"}；未知 {evidence.candidateBinding.executionAdmission?.unknown?.reason ?? "UNKNOWN"}</p><p data-testid="v24-candidate-window-gate">执行窗口：{evidence.candidateBinding.executionAdmission?.missedWindow?.reason ?? "UNKNOWN"}</p><p data-testid="v24-candidate-side-effects">预算预留 {evidence.candidateBinding.budget?.reservationCount ?? "UNKNOWN"} · 调度 {evidence.candidateBinding.scheduler?.status ?? "UNKNOWN"} · 订单 {evidence.orders?.length ?? 0} · 成交 {evidence.fills?.length ?? 0}</p></section>}{recoveryHistory && <details open aria-label="TestRun恢复历史"><summary>TestRun 恢复历史（{recoveryHistory.revisions.length} 个历史版本）</summary><pre data-testid="v24-recovery-history">{JSON.stringify(recoveryHistory,null,2)}</pre></details>}{businessEvents.length > 0 && <section aria-label="Paper业务事件时间线"><h3>业务事件时间线</h3><ol data-testid="v24-business-timeline">{businessEvents.map((item, index) => <li key={`${item.event}-${index}`}>{item.event}{item.time && ` · ${item.time}`} · {item.status}</li>)}</ol></section>}<p>快照价格与流动性仅用于冻结 Fixture 验收；流动性未验证，不代表真实行情或可成交能力。</p><button data-testid="v24-download-evidence" onClick={downloadEvidence}>下载原始证据 JSON</button><details><summary>查看原始后端证据</summary><pre data-testid="v24-evidence">{JSON.stringify(data,null,2)}</pre></details></section>}</main>; }

type V24PaperOverviewState = {
  readiness: V24PaperReadiness;
  scheduler: { status: "STOPPED" | "RUNNING"; samplingIntervalMinutes: number; executionWindow: string; lastSampleAt: string | null; nextSampleAt: string | null; mode: "PAPER"; brokerMode: "FAKE" };
  observations: { targetDays: number; countedDays: number; recordedCountedDays: number; unverifiedCountedDays: number; remainingDays: number; status: "WAITING" | "PASS" };
  latestExecutionGate: { observationDate: string; status: string; reason: string } | null;
  alerts: Array<{ incidentId: string; alertKey: string; code: string; severity: "INFO" | "WARNING" | "CRITICAL"; payload: Record<string, unknown>; state: "OPEN" | "ACKNOWLEDGED"; firstSeenAt: string; lastSeenAt: string; acknowledgedBy: string | null }>;
};

function V24PaperOverview() {
  const [state, setState] = useState<V24PaperOverviewState | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const refresh = async () => {
    setLoading(true);
    setError(null);
    try {
      const [readiness, scheduler, observations, records, alertResponse] = await Promise.all([
        api<V24PaperReadiness>("/api/v1/acceptance/v2/v2.4/paper-readiness?market=CN_A"),
        api<V24PaperOverviewState["scheduler"]>("/api/v1/acceptance/v2/v2.4/scheduler/status"),
        api<V24PaperOverviewState["observations"]>("/api/v1/acceptance/v2/v2.4/observation-summary"),
        api<Array<{ observationDate: string; evidence?: { eventKind?: string; executionGate?: { status?: string; reason?: string } } }>>("/api/v1/acceptance/v2/v2.4/observations"),
        api<{ incidents: V24PaperOverviewState["alerts"] }>("/api/v1/acceptance/v2/v2.4/alerts"),
      ]);
      const latestGateRecord = records.filter((record) => record.evidence?.executionGate).sort((a, b) => b.observationDate.localeCompare(a.observationDate))[0];
      const latestExecutionGate = latestGateRecord?.evidence?.executionGate
        ? { observationDate: latestGateRecord.observationDate, status: latestGateRecord.evidence.executionGate.status ?? "UNKNOWN", reason: latestGateRecord.evidence.executionGate.reason ?? "GATE_REASON_UNAVAILABLE" }
        : null;
      setState({ readiness, scheduler, observations, latestExecutionGate, alerts: alertResponse.incidents });
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : String(cause));
    } finally {
      setLoading(false);
    }
  };
  const acknowledgeAlert = async (incidentId: string) => {
    setLoading(true);
    setError(null);
    try {
      await api(`/api/v1/acceptance/v2/v2.4/alerts/${encodeURIComponent(incidentId)}/acknowledge`, { method: "POST", body: "{}" });
      await refresh();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : String(cause));
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => { void refresh(); }, []);
  return <main>
    <header>
      <p className="eyebrow">StockQuant · Paper 状态</p>
      <h1>持续模拟交易概览</h1>
      <p data-testid="paper-overview-boundary">NO_TRADE 只读观察基线已确认；行情来源尚未授权。此页只读取就绪、调度和日终汇总，不请求行情、不启动采集/调度、不创建订单。</p>
    </header>
    {error && <p role="alert" className="error">状态读取失败：{error}</p>}
    <section aria-label="当前运行模式">
      <h2>运行模式</h2>
      <dl>
        <dt>环境 / 券商</dt><dd data-testid="paper-overview-mode">PAPER / FAKE · LIVE 关闭</dd>
        <dt>策略基线</dt><dd>NO_TRADE；不创建订单。正式策略政策保持 PREPARATION_ONLY。</dd>
        <dt>就绪门禁</dt><dd data-testid="paper-overview-readiness">{state ? `${state.readiness.market} · ${state.readiness.status} · 下单${state.readiness.orderSubmissionEnabled ? "开启" : "关闭"}` : "读取中"}</dd>
        <dt>模拟账户</dt><dd>未配置活动 Paper 账户；Fixture 测试账户不用于活动策略。</dd>
      </dl>
    </section>
    <section aria-label="采样与执行窗口">
      <h2>采样、评估与执行</h2>
      <dl>
        <dt>采样调度</dt><dd data-testid="paper-overview-scheduler">{state ? `${state.scheduler.status} · ${state.scheduler.samplingIntervalMinutes} 分钟` : "读取中"}</dd>
        <dt>最近 / 下次采样</dt><dd>{state ? `${state.scheduler.lastSampleAt ?? "无记录"} / ${state.scheduler.nextSampleAt ?? "未排程"}` : "读取中"}</dd>
        <dt>策略评估</dt><dd>未排程（来源授权与策略版本未配置）</dd>
        <dt>执行窗口</dt><dd>未启用；准备政策中的 {state?.scheduler.executionWindow ?? "09:31–09:35"} 不构成活动执行授权。</dd>
        <dt>行情年龄</dt><dd data-testid="paper-overview-data-age">未读取行情（来源未授权）</dd>
      </dl>
    </section>
    <section aria-label="订单、资产与对账">
      <h2>订单、资产与对账</h2>
      <dl>
        <dt>订单 / 成交</dt><dd>NO_TRADE；本观察版本不下单，无活动 Paper 订单或成交。</dd>
        <dt>现金 / 持仓</dt><dd>活动模拟账户未配置。</dd>
        <dt>日终对账</dt><dd>活动 Paper 尚未启用；无可对账活动订单。</dd>
        <dt>严格证据通过的观察日</dt><dd data-testid="paper-overview-observations">{state ? `${state.observations.countedDays}/${state.observations.targetDays} · ${state.observations.status} · 剩余 ${state.observations.remainingDays} 日` : "读取中"}</dd>
        <dt>旧系统标记计数 / 待补证</dt><dd data-testid="paper-overview-unverified-days">{state ? `${state.observations.recordedCountedDays} / ${state.observations.unverifiedCountedDays}` : "读取中"}</dd>
      </dl>
    </section>
    <section id="paper-alerts">
      <h2>告警与操作</h2>
      <p data-testid="paper-overview-execution-gate">最近执行门禁：{state?.latestExecutionGate ? `${state.latestExecutionGate.observationDate} · ${state.latestExecutionGate.status} · ${state.latestExecutionGate.reason}` : "暂无执行窗口观察记录；当前状态由只读配置显示为 NO_TRADE。"}</p>
      <p>暂停原因取自持久化执行窗口观察记录。确认告警只记录当前登录用户及确认时间，不触发行情请求、调度或订单操作；账户过期需待活动账户接入后才能据真实账户状态判定。</p>
      <div data-testid="paper-overview-alerts">
        {state?.alerts.length ? <ul>{state.alerts.map((incident) => <li key={incident.incidentId} data-testid={`paper-alert-${incident.incidentId}`}>
          <strong>{incident.severity} · {incident.code}</strong> · {incident.state} · 首次 {incident.firstSeenAt} · 最近 {incident.lastSeenAt}
          {incident.state === "ACKNOWLEDGED" && <span> · 已由 {incident.acknowledgedBy ?? "用户"} 确认</span>}
          {incident.state === "OPEN" && <button disabled={loading} onClick={() => void acknowledgeAlert(incident.incidentId)}>确认告警</button>}
        </li>)}</ul> : <p>暂无活动告警。</p>}
      </div>
      <button data-testid="paper-overview-refresh" onClick={() => void refresh()} disabled={loading}>{loading ? "正在读取…" : "刷新只读状态"}</button>
      <a href="/acceptance/v2/v2.4">打开隔离 Fixture 验收中心</a>
    </section>
  </main>;
}

function V25Acceptance() { const [data, setData] = useState<any>(null); const [error, setError] = useState<string | null>(null); const [dataVersion, setDataVersion] = useState(""); const [uploadSession, setUploadSession] = useState<any>(()=>{try{const value=window.localStorage.getItem("stockquant:v22:csvUpload");return value?JSON.parse(value):null;}catch{return null;}}); const [uploadJob,setUploadJob]=useState<any>(null); const refreshUploadJob=async()=>{if(!uploadSession)return;try{const format=(uploadSession.fileFormat??"CSV").toLowerCase();const job=await api<any>(`/api/v1/acceptance/v2/v2.2/${format}/uploads/${uploadSession.uploadId}/finalization`);setUploadJob(job);if(job.status==="COMPLETED"||job.status==="CANCELLED"){window.localStorage.removeItem("stockquant:v22:csvUpload");setUploadSession(null);}}catch(e){setError(String(e));}}; const cancelUploadJob=async()=>{if(!uploadSession)return;try{const format=(uploadSession.fileFormat??"CSV").toLowerCase();await api(`/api/v1/acceptance/v2/v2.2/${format}/uploads/${uploadSession.uploadId}/cancel`,{method:"POST",body:"{}"});await refreshUploadJob();}catch(e){setError(String(e));}}; const call = async (path: string, init?: RequestInit) => { try { setError(null); setData(await api<any>(path, init)); } catch (e) { setError(String(e)); } }; const run = async (scenarioId: string) => { try { setError(null); const accepted = await api<any>("/api/v1/acceptance/v2/v2.5/runs", { method: "POST", body: JSON.stringify({ scenarioId, seed: 20260907 }) }); setData(await api<any>(`/api/v1/acceptance/v2/v2.5/runs/${accepted.testRunId}`)); } catch (e) { setError(String(e)); } }; const runImported = async () => { try { setError(null); const accepted = await api<any>("/api/v1/acceptance/v2/v2.5/runs/from-minute-import", { method: "POST", body: JSON.stringify({ dataVersion: dataVersion.trim(), seed: 20260907 }) }); setData(await api<any>(`/api/v1/acceptance/v2/v2.5/runs/${accepted.testRunId}`)); } catch (e) { setError(String(e)); } }; return <main><header><p className="eyebrow">StockQuant · 开发验收中心</p><h1>V2.5 历史数据扩容与 V2 验收</h1><p>20只 × 60交易日扩容档；BACKTEST / FIXTURE / FAKE。V2.4 20日观察门禁仍待完成。</p></header>{error && <p role="alert" className="error">{error}</p>}<section><h2>已持久化分钟数据验证</h2><p>输入已有的DataVersion。服务端将读取Market Data持久导入记录及首个有界Bar分页，并把来源、SHA-256、行数和查询结果绑定到新的V2.5 TestRun。此操作只读，不导入数据、不调用Provider或模型。</p><label>DataVersion <input aria-label="V2.5分钟导入版本" value={dataVersion} onChange={(event)=>setDataVersion(event.target.value)} placeholder="输入已发布的分钟导入版本" /></label><button disabled={!dataVersion.trim()} onClick={()=>void runImported()}>核验持久导入并创建TestRun</button><a href="/acceptance/v2/v2.2">前往V2.2分钟导入与查询</a>{uploadSession&&<><button data-testid="v25-read-upload-job" onClick={()=>void refreshUploadJob()}>读取持久导入队列状态</button><button data-testid="v25-cancel-upload-job" onClick={()=>void cancelUploadJob()}>取消排队中的导入</button></>}{uploadJob&&<p data-testid="v25-upload-job-state">导入任务 {uploadJob.status} · 尝试 {uploadJob.attempt}{uploadJob.error?` · ${uploadJob.error}`:""}</p>}</section><section><h2>合成扩容与资源场景</h2><p role="note">以下场景只使用进程内合成Fixture：容量测量、并发拒绝与断点恢复均为场景逻辑，不验证数据库任务队列、配额或进程重启。</p><button onClick={()=>void call("/api/v1/acceptance/v2/v2.5/preview")}>查看扩容档与预算</button><button onClick={()=>void run("normal")}>运行合成扩容场景</button><button onClick={()=>void run("rejection")}>运行合成资源/缓存拒绝场景</button><button onClick={()=>void run("recovery")}>运行合成任务恢复场景</button></section>{data && <pre data-testid="v25-evidence">{JSON.stringify(data,null,2)}</pre>}</main>; }

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
  const [readinessSourceRunId, setReadinessSourceRunId] = useState("");
  const [readinessRunId, setReadinessRunId] = useState("");
  const [readinessRun, setReadinessRun] = useState<Record<string, unknown> | null>(null);
  const [submitRunId, setSubmitRunId] = useState(() => window.localStorage.getItem("stockquant:v31:testRunId") ?? "");
  const [submitResult, setSubmitResult] = useState<Record<string, unknown> | null>(null);
  const [decisionResult, setDecisionResult] = useState<Record<string, unknown> | null>(null);
  const [bindingResult, setBindingResult] = useState<Record<string, unknown> | null>(null);
  const [mandateId, setMandateId] = useState("");
  const [accountId, setAccountId] = useState("");
  const [result, setResult] = useState<Record<string, unknown> | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const createReadinessRun = async (scenarioId: "normal" | "rejection" | "recovery") => {
    setLoading(true); setError(null); setReadinessRun(null);
    try {
      const created = await api<Record<string, unknown>>("/api/v1/acceptance/v3/v3.2/runs", { method: "POST", body: JSON.stringify({ scenarioId, seed: 20260907, ...(readinessSourceRunId.trim() ? { sourceV31TestRunId: readinessSourceRunId.trim() } : {}) }) });
      if (typeof created.testRunId !== "string") throw new Error("V3.2 readiness TestRun ID was not returned");
      setReadinessRunId(created.testRunId);
      setReadinessRun(await api<Record<string, unknown>>(`/api/v1/acceptance/v3/v3.2/runs/${encodeURIComponent(created.testRunId)}`));
    } catch (cause) { setError(cause instanceof Error ? cause.message : String(cause)); }
    finally { setLoading(false); }
  };

  const readReadinessRun = async () => {
    const runId = readinessRunId.trim();
    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(runId)) { setError("请输入有效的 V3.2 TestRun UUID"); return; }
    setLoading(true); setError(null);
    try { setReadinessRun(await api<Record<string, unknown>>(`/api/v1/acceptance/v3/v3.2/runs/${encodeURIComponent(runId)}`)); }
    catch (cause) { setError(cause instanceof Error ? cause.message : String(cause)); }
    finally { setLoading(false); }
  };
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
    <section aria-label="V3.2 准备态 TestRun"><h2>记录阶段门禁状态</h2><p>此处只保存 V3.2 准备态 TestRun 和缺失门禁，不执行候选或独立复算，不写 Registry，也不调用 Paper。运行状态保持 WAITING、业务断言 NOT_RUN。</p><label>可选的 V3.1 来源 TestRun UUID <input aria-label="V3.1 来源 TestRun UUID" value={readinessSourceRunId} onChange={(event) => setReadinessSourceRunId(event.target.value)} /></label><button data-testid="v32-readiness-normal" disabled={loading} onClick={() => void createReadinessRun("normal")}>记录正常准备状态</button><button data-testid="v32-readiness-rejection" disabled={loading} onClick={() => void createReadinessRun("rejection")}>记录拒绝准备状态</button><button data-testid="v32-readiness-recovery" disabled={loading} onClick={() => void createReadinessRun("recovery")}>记录恢复准备状态</button><label>V3.2 TestRun UUID <input aria-label="V3.2 TestRun UUID" value={readinessRunId} onChange={(event) => setReadinessRunId(event.target.value)} /></label><button data-testid="v32-readiness-read" disabled={loading} onClick={() => void readReadinessRun()}>读取同一准备运行</button>{readinessRun && <div data-testid="v32-readiness-result"><p>TestRun：<code>{String(readinessRun.testRunId)}</code> · 状态：<strong>{String(readinessRun.status)}</strong></p><p>业务验证：{String((readinessRun.evidence as Record<string, unknown> | undefined)?.businessValidation ?? "NOT_RUN")} · 来源：{String((readinessRun.evidence as Record<string, unknown> | undefined)?.sourceMode ?? "READINESS_ONLY")}</p><pre>{JSON.stringify(readinessRun.evidence, null, 2)}</pre></div>}</section>
    <section aria-label="从 V3.1 TestRun 提交 PromotionRequest"><h2>提交研究候选进行独立验证</h2><label>V3.1 TestRun UUID <input aria-label="V3.1 TestRun UUID" value={submitRunId} onChange={(event) => setSubmitRunId(event.target.value)} /></label><button data-testid="v32-submit-promotion" disabled={loading} onClick={() => void submit()}>{loading ? "提交状态确认中…" : "提交此 TestRun 的 PromotionRequest"}</button>{submitResult && <><p data-testid="v32-submit-status">提交状态：{String(submitResult.status)}</p>{Array.isArray(submitResult.blockers) && <ul>{submitResult.blockers.map((blocker) => <li key={String(blocker)}>{String(blocker)}</li>)}</ul>}{typeof submitResult.promotionRequestId === "string" && <p>PromotionRequest：<code>{submitResult.promotionRequestId}</code></p>}<p>人工验收记录：{String(submitResult.humanAcceptance ?? "由 V3.1 精确运行页面单独记录")}</p></>}</section>
    <section><h2>查询已提交记录</h2><label>PromotionRequest UUID <input aria-label="PromotionRequest UUID" value={id} onChange={(event)=>setId(event.target.value)} /></label><button onClick={()=>void inspect()} disabled={loading}>{loading ? "读取中…" : "读取记录"}</button>{error && <p role="alert" className="error">{error}</p>}</section>
    {request && payload && <section aria-label="PromotionRequest 精确版本"><h2>PromotionRequest 精确版本</h2><p>来源：<strong>{String(payload.candidateSource)}</strong> · 状态：<strong>{String(request.status)}</strong></p><dl><dt>PromotionRequest ID</dt><dd>{String(request.promotionRequestId)}</dd><dt>TestRun ID</dt><dd>{String(payload.testRunId)}</dd><dt>Experiment ID</dt><dd>{String(payload.experimentId)}</dd><dt>候选 Artifact SHA-256</dt><dd><code>{String((payload.candidateArtifact as Record<string, unknown>)?.sha256)}</code></dd><dt>代码 SHA-256</dt><dd><code>{String(payload.codeSha256)}</code></dd><dt>数据 Manifest SHA-256</dt><dd><code>{String(payload.dataManifestSha256)}</code></dd><dt>指标 Manifest SHA-256</dt><dd><code>{String(payload.metricsManifestSha256)}</code></dd><dt>验证计划 SHA-256</dt><dd><code>{String(payload.validationPlanSha256)}</code></dd><dt>创建时间</dt><dd>{String(request.createdAt)}</dd></dl>{persistedDecision && <p data-testid="v32-registry-decision">决定：{String(persistedDecision.decision)} · Registry：{String(persistedDecision.registryStatus)} · 激活：{String(persistedDecision.activation)} · 版本指纹：<code>{String(persistedDecision.versionFingerprint)}</code></p>}</section>}
    {result && <section aria-label="独立验证报告"><h2>独立验证</h2><p data-testid="v32-validation-status">{reportResult ? String(validationReport?.disposition ?? "报告已保存") : "NOT_RUN：Quant 尚无持久化验证报告"}</p>{reportResult && <pre>{JSON.stringify(reportResult, null, 2)}</pre>}{reportResult && !persistedDecision && <div aria-label="精确版本审批"><p>以下决定将绑定上方候选、代码、数据、指标、验证计划及本报告指纹。批准后仍保持禁用，须另行满足 Mandate。</p>{validationReport?.disposition === "ELIGIBLE_FOR_REVIEW" && <button data-testid="v32-approve-version" disabled={loading} onClick={() => void decide("APPROVE")}>批准此精确候选版本</button>}<button data-testid="v32-reject-version" disabled={loading} onClick={() => void decide("REJECT")}>拒绝此精确候选版本</button></div>}{decisionResult && <p data-testid="v32-decision-result">决定已记录：{String(decisionResult.decision)} · {String(decisionResult.activation)}</p>}<p>Registry 状态：<strong>{String(result.registryMutation)}</strong> · 策略激活：<strong>{String(result.activation)}</strong></p><p>批准记录属于 Quant 精确版本 Registry；它不会激活策略，也不会修改 Mandate。</p></section>}
    {persistedDecision?.decision === "APPROVE" && persistedDecision.registryStatus === "CANDIDATE_APPROVED" && <section aria-label="候选到模拟 Mandate 精确版本核对"><h2>核对候选与模拟 Mandate 版本绑定</h2><p>仅核对已批准候选的精确指纹与 Artifact 是否一致；不会创建 Mandate、验证账户可用性或激活策略。</p><label>拟议 Mandate UUID <input aria-label="拟议 Mandate UUID" value={mandateId} onChange={(event) => setMandateId(event.target.value)} /></label><label>拟议模拟账户 UUID <input aria-label="拟议模拟账户 UUID" value={accountId} onChange={(event) => setAccountId(event.target.value)} /></label><button data-testid="v32-check-mandate-binding" disabled={loading} onClick={() => void assessBinding()}>核对已批准候选版本</button>{bindingResult && <div data-testid="v32-mandate-binding-result"><p>核对结果：{String(bindingResult.status)} · {String(bindingResult.reason)}</p><p>版本指纹：<code>{String(bindingResult.versionFingerprint ?? persistedDecision.versionFingerprint)}</code></p><p>账户验证：{String(bindingResult.accountValidation ?? "NOT_PERFORMED")} · Mandate 持久化：{String(bindingResult.mandatePersistence ?? "NOT_PERFORMED")} · 策略激活：{String(bindingResult.activation ?? "NOT_PERFORMED")}</p></div>}</section>}
  </main>;
}

type V33RunnerQueue = { schemaVersion: "v3.3-runner-cursor-queue-v1"; testRunId: string; afterCursor: string | null; nextAfterCursor: string | null; limit: number; jobs: Array<{ jobId: string; status: string; submittedAt: string; startedAt: string | null; completedAt: string | null; attempt: number; retryOf: string | null; artifacts: unknown[]; execution: { exitCode?: number | null; durationMs?: number } | null }>; hasMore: boolean };
type V33RunnerBudget = { schemaVersion: "v3.3-runner-budget-v1"; testRunId: string; offset: number; limit: number; rows: Array<{ jobId: string; experimentId: string; requestedCents?: number; reservedCents?: number; settledCents?: number; unknownReservedCents?: number; status: string; source: string }>; hasMore: boolean; coverage: { jobsOnPage: number; experimentsOnPage: number; budgetsFound: number; budgetsMissing: number }; note: string };
type V33TestRunBudgetTotals = { experiments: number; requestedCents: number; reservedCents: number; settledCents: number; unknownReservedCents: number; modelCallCount: number };
type V33TestRunBudgetSummary = { schemaVersion: "v3.3-test-run-budget-summary-v1"; testRunId: string; offset: number; limit: number; afterCursor: string | null; nextAfterCursor: string | null; rows: Array<{ experimentId: string; rounds: number; requestedCents: number; reservedCents: number; roundBudget: Array<{ roundIndex: number; allocatedCents: number; usedCents: number; unknownReservedCents: number }>; status: string; settledCents: number; unknownReservedCents: number; modelCallCount: number }>; totals: V33TestRunBudgetTotals | null; hasMore: boolean; accountingScope: string; stageBudgetControl: "NOT_IMPLEMENTED" | "TEST_RUN_CAP_ENFORCED_ROUND_CAP_NOT_IMPLEMENTED" | "TEST_RUN_AND_ROUND_CAP_ENFORCED" };

function V33Acceptance() {
  const [testRunId, setTestRunId] = useState("");
  const [readinessRun, setReadinessRun] = useState<any>(null);
  const [sourceV31TestRunId, setSourceV31TestRunId] = useState("");
  const [promotionRequestId, setPromotionRequestId] = useState("");
  const [queue, setQueue] = useState<V33RunnerQueue | null>(null);
  const [budget, setBudget] = useState<V33RunnerBudget | null>(null);
  const [testRunBudgetSummary, setTestRunBudgetSummary] = useState<V33TestRunBudgetSummary | null>(null);
  const [testRunBudgetTotals, setTestRunBudgetTotals] = useState<V33TestRunBudgetTotals | null>(null);
  const [budgetError, setBudgetError] = useState<string | null>(null);
  const [offset, setOffset] = useState(0);
  const [pageCursors, setPageCursors] = useState<Array<string | null>>([null]);
  const [budgetSummaryPage, setBudgetSummaryPage] = useState(0);
  const [budgetSummaryCursors, setBudgetSummaryCursors] = useState<Array<string | null>>([null]);
  const [budgetSummaryLoading, setBudgetSummaryLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const pageSize = 25;

  const readBudgetSummaryPage = async (pageNumber: number, requestedId = testRunId, cursorOverride?: string | null) => {
    const id = requestedId.trim();
    const afterCursor = cursorOverride === undefined ? budgetSummaryCursors[pageNumber] ?? null : cursorOverride;
    setBudgetSummaryLoading(true); setBudgetError(null);
    if (pageNumber === 0 && afterCursor === null) setTestRunBudgetTotals(null);
    try {
      const query = new URLSearchParams({ limit: String(pageSize) });
      if (afterCursor !== null) query.set("afterCursor", afterCursor);
      const summary = await api<V33TestRunBudgetSummary>(`/api/v1/acceptance/v3/v3.3/runs/${encodeURIComponent(id)}/research/budget/summary?${query}`);
      if (summary.schemaVersion !== "v3.3-test-run-budget-summary-v1" || summary.testRunId !== id || summary.offset !== 0 || summary.afterCursor !== afterCursor || summary.limit !== pageSize || summary.stageBudgetControl !== "TEST_RUN_AND_ROUND_CAP_ENFORCED") throw new Error("全TestRun预算响应与请求范围不匹配");
      setTestRunBudgetSummary(summary); if (summary.totals !== null) setTestRunBudgetTotals(summary.totals); setBudgetSummaryPage(pageNumber);
      setBudgetSummaryCursors((previous) => { const updated = previous.slice(0, pageNumber + 1); if (summary.nextAfterCursor !== null) updated[pageNumber + 1] = summary.nextAfterCursor; return updated; });
    } catch (cause) { setTestRunBudgetSummary(null); setBudgetError(cause instanceof Error ? cause.message : String(cause)); }
    finally { setBudgetSummaryLoading(false); }
  };

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
      } catch (cause) { setBudget(null); setTestRunBudgetSummary(null); setBudgetError(cause instanceof Error ? cause.message : String(cause)); }
      if (pageNumber === 0) { setBudgetSummaryCursors([null]); await readBudgetSummaryPage(0, id, null); }
    } catch (cause) {
      setQueue(null);
      setBudget(null);
      setTestRunBudgetSummary(null);
      setTestRunBudgetTotals(null);
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
      setPageCursors([null]); setBudgetSummaryCursors([null]);
      await readQueue(0, stored.testRunId, null);
    } catch (cause) { setError(cause instanceof Error ? cause.message : String(cause)); }
    finally { setLoading(false); }
  };

  const reserveScenarioExperiment = async () => {
    if (!readinessRun?.testRunId || !["normal", "recovery"].includes(String(readinessRun.scenarioId))) return;
    setLoading(true); setError(null);
    try {
      const testRunId = String(readinessRun.testRunId);
      await api<any>(`/api/v1/acceptance/v3/v3.3/runs/${encodeURIComponent(testRunId)}/experiment`, {
        method: "POST", body: JSON.stringify({ schemaVersion: "v3.3-scenario-experiment-command-v1", confirmation: "CREATE_V33_FIXTURE_EXPERIMENT" }),
      });
      const stored = await api<any>(`/api/v1/acceptance/v3/v3.3/runs/${encodeURIComponent(testRunId)}`);
      if (stored.testRunId !== testRunId || stored.evidence?.workflowStep !== "EXPERIMENT_RESERVED" || stored.evidence?.experiment?.budget?.status !== "RESERVED") throw new Error("同一 V3.3 TestRun 未持久化准确的 Fixture Experiment 预留");
      setReadinessRun(stored);
    } catch (cause) { setError(cause instanceof Error ? cause.message : String(cause)); }
    finally { setLoading(false); }
  };

  const verifyScenarioRejection = async () => {
    if (!readinessRun?.testRunId || readinessRun.scenarioId !== "rejection" || readinessRun.status !== "WAITING" || readinessRun.evidence?.workflowStep !== "TEST_RUN_BUDGET_BOUND") return;
    setLoading(true); setError(null);
    try {
      const testRunId = String(readinessRun.testRunId);
      await api<any>(`/api/v1/acceptance/v3/v3.3/runs/${encodeURIComponent(testRunId)}/verify-rejection`, {
        method: "POST", body: JSON.stringify({ schemaVersion: "v3.3-rejection-verify-command-v1", confirmation: "VERIFY_V33_BUDGET_REJECTION" }),
      });
      const stored = await api<any>(`/api/v1/acceptance/v3/v3.3/runs/${encodeURIComponent(testRunId)}`);
      if (stored.testRunId !== testRunId || stored.status !== "RUNNING" || stored.evidence?.workflowStep !== "REJECTION_ASSERTION_VERIFIED" || stored.evidence?.businessValidation !== "PASS" || stored.evidence?.rejectionAssertion?.result !== "PASS") throw new Error("拒绝场景没有在同一 V3.3 TestRun 持久化预算拒绝与零副作用断言");
      setReadinessRun(stored);
    } catch (cause) { setError(cause instanceof Error ? cause.message : String(cause)); }
    finally { setLoading(false); }
  };

  const dispatchScenarioExperiment = async () => {
    if (!readinessRun?.testRunId || readinessRun.status !== "WAITING" || readinessRun.evidence?.workflowStep !== "EXPERIMENT_RESERVED") return;
    setLoading(true); setError(null);
    try {
      const testRunId = String(readinessRun.testRunId);
      const result = await api<any>(`/api/v1/acceptance/v3/v3.3/runs/${encodeURIComponent(testRunId)}/dispatch`, {
        method: "POST", body: JSON.stringify({ schemaVersion: "v3.3-scenario-dispatch-command-v1", confirmation: "DISPATCH_V33_FIXTURE_RUNNER" }),
      });
      const stored = await api<any>(`/api/v1/acceptance/v3/v3.3/runs/${encodeURIComponent(testRunId)}`);
      if (result.testRunId !== testRunId || result.runnerJobsCreated !== 2 || stored.testRunId !== testRunId || stored.status !== "RUNNING" || stored.evidence?.workflowStep !== "RUNNER_JOBS_QUEUED" || stored.evidence?.runnerJobsCreated !== 2) throw new Error("同一 V3.3 TestRun 未持久化两轮 Runner Job 派发证据");
      setReadinessRun(stored); setTestRunId(testRunId);
      setPageCursors([null]); setBudgetSummaryCursors([null]);
      await readQueue(0, testRunId, null);
    } catch (cause) { setError(cause instanceof Error ? cause.message : String(cause)); }
    finally { setLoading(false); }
  };

  const reconcileScenarioResults = async () => {
    if (!readinessRun?.testRunId || readinessRun.status !== "RUNNING" || readinessRun.evidence?.workflowStep !== "RUNNER_JOBS_QUEUED") return;
    setLoading(true); setError(null);
    try {
      const testRunId = String(readinessRun.testRunId);
      const result = await api<any>(`/api/v1/acceptance/v3/v3.3/runs/${encodeURIComponent(testRunId)}/reconcile`, {
        method: "POST", body: JSON.stringify({ schemaVersion: "v3.3-scenario-reconcile-command-v1", confirmation: "RECONCILE_V33_FIXTURE_RESULTS" }),
      });
      const stored = await api<any>(`/api/v1/acceptance/v3/v3.3/runs/${encodeURIComponent(testRunId)}`);
      if (result.testRunId !== testRunId || result.completedRounds !== 2 || result.experimentSettlement !== "VERIFIED_FIXTURE_LEDGER" || stored.testRunId !== testRunId || stored.status !== "RUNNING" || stored.evidence?.workflowStep !== "EXPERIMENT_SETTLED_AND_RESULTS_RECONCILED" || stored.evidence?.completedRounds?.length !== 2 || stored.evidence?.experimentSettlement !== "VERIFIED_FIXTURE_LEDGER") throw new Error("同一 V3.3 TestRun 未持久化两轮结果与Fixture预算结算事实");
      setReadinessRun(stored);
      setPageCursors([null]); setBudgetSummaryCursors([null]);
      await readQueue(0, testRunId, null);
    } catch (cause) { setError(cause instanceof Error ? cause.message : String(cause)); }
    finally { setLoading(false); }
  };

  const verifyScenarioRecovery = async () => {
    if (!readinessRun?.testRunId || readinessRun.scenarioId !== "recovery" || readinessRun.status !== "RUNNING" || readinessRun.evidence?.workflowStep !== "EXPERIMENT_SETTLED_AND_RESULTS_RECONCILED") return;
    setLoading(true); setError(null);
    try {
      const testRunId = String(readinessRun.testRunId);
      const result = await api<any>(`/api/v1/acceptance/v3/v3.3/runs/${encodeURIComponent(testRunId)}/verify-recovery`, {
        method: "POST", body: JSON.stringify({ schemaVersion: "v3.3-recovery-verify-command-v1", confirmation: "VERIFY_V33_CHECKPOINT_RECOVERY" }),
      });
      const stored = await api<any>(`/api/v1/acceptance/v3/v3.3/runs/${encodeURIComponent(testRunId)}`);
      if (result.testRunId !== testRunId || result.assertion?.id !== "V3.3_CHECKPOINT_RECOVERY_001" || stored.testRunId !== testRunId || stored.status !== "RUNNING" || stored.evidence?.workflowStep !== "RECOVERY_ASSERTION_VERIFIED" || stored.evidence?.businessValidation !== "PASS") throw new Error("恢复场景没有在同一 V3.3 TestRun 持久化检查点恢复断言");
      setReadinessRun(stored);
    } catch (cause) { setError(cause instanceof Error ? cause.message : String(cause)); }
    finally { setLoading(false); }
  };

  const verifyScenarioNormal = async () => {
    if (!readinessRun?.testRunId || readinessRun.scenarioId !== "normal" || readinessRun.status !== "RUNNING" || readinessRun.evidence?.workflowStep !== "EXPERIMENT_SETTLED_AND_RESULTS_RECONCILED") return;
    setLoading(true); setError(null);
    try {
      const testRunId = String(readinessRun.testRunId);
      const result = await api<any>(`/api/v1/acceptance/v3/v3.3/runs/${encodeURIComponent(testRunId)}/verify-normal`, { method: "POST", body: JSON.stringify({ schemaVersion: "v3.3-normal-verify-command-v1", confirmation: "VERIFY_V33_NORMAL_RESULTS" }) });
      const stored = await api<any>(`/api/v1/acceptance/v3/v3.3/runs/${encodeURIComponent(testRunId)}`);
      if (result.testRunId !== testRunId || result.assertion?.id !== "V3.3_NORMAL_RESULTS_001" || stored.testRunId !== testRunId || stored.status !== "RUNNING" || stored.evidence?.workflowStep !== "NORMAL_ASSERTION_VERIFIED" || stored.evidence?.businessValidation !== "PASS") throw new Error("正常场景没有在同一 V3.3 TestRun 持久化输出和结算断言");
      setReadinessRun(stored);
    } catch (cause) { setError(cause instanceof Error ? cause.message : String(cause)); }
    finally { setLoading(false); }
  };

  const cancelReadinessRun = async () => {
    if (!readinessRun?.testRunId || readinessRun.status !== "WAITING") return;
    setLoading(true); setError(null);
    try {
      const cancelled = await api<any>(`/api/v1/acceptance/v3/v3.3/runs/${encodeURIComponent(readinessRun.testRunId)}/cancel`, {
        method: "POST", body: JSON.stringify({ confirmation: "CANCEL_V33_READINESS_RUN" }),
      });
      if (cancelled.testRunId !== readinessRun.testRunId || cancelled.status !== "CANCELLED") throw new Error("V3.3 readiness cancellation did not persist for the exact TestRun");
      const stored = await api<any>(`/api/v1/acceptance/v3/v3.3/runs/${encodeURIComponent(readinessRun.testRunId)}`);
      if (stored.testRunId !== readinessRun.testRunId || stored.status !== "CANCELLED" || stored.evidence?.cancellation?.scope !== "READINESS_ONLY") throw new Error("Stored V3.3 cancellation does not match the exact readiness-only run");
      setReadinessRun(stored);
    } catch (cause) { setError(cause instanceof Error ? cause.message : String(cause)); }
    finally { setLoading(false); }
  };

  return <main>
    <header><p className="eyebrow">StockQuant · 开发验收中心</p><h1>V3.3 研究队列与预算证据</h1><p>可创建阶段 TestRun，按明确确认逐步预留并派发冻结的两轮 Fixture Runner Job，再只读查看同一 TestRun 的运行尝试与预算。Fixture Runner 使用隔离容器、网络 DENY 和显式镜像摘要；这不会调用外部模型、行情、Paper 或 Broker，也不等同于 Paper 共存或阶段验收。</p></header>
    <section aria-label="创建等待态阶段运行"><h2>记录阶段准备状态</h2><p>提供精确的 V3.1 与 PromotionRequest UUID 可核验对应门禁；按冻结Fixture绑定TestRun预算后默认保持WAITING。normal/recovery可明确确认创建80 cents、两轮Fixture Experiment，并再次确认后为两轮各运行Fixture模型响应、发布输入Artifact并派发Runner Job。</p><label>已接受的 V3.1 TestRun UUID <input aria-label="已接受的 V3.1 TestRun UUID" value={sourceV31TestRunId} onChange={(event) => setSourceV31TestRunId(event.target.value)} /></label><label>PromotionRequest UUID <input aria-label="PromotionRequest UUID" value={promotionRequestId} onChange={(event) => setPromotionRequestId(event.target.value)} /></label><button data-testid="v33-create-normal" disabled={loading} onClick={() => void createReadinessRun("normal")}>记录正常场景</button><button data-testid="v33-create-rejection" disabled={loading} onClick={() => void createReadinessRun("rejection")}>记录预算/故障拒绝场景</button><button data-testid="v33-create-recovery" disabled={loading} onClick={() => void createReadinessRun("recovery")}>记录恢复场景</button>{readinessRun && <section aria-label="持久化运行状态"><h3>{readinessRun.scenarioId} · {readinessRun.status}</h3><p>TestRun：<code>{readinessRun.testRunId}</code> · seed {readinessRun.seed}</p><details open><summary>未通过门禁与执行事实</summary><pre data-testid="v33-readiness-evidence">{JSON.stringify(readinessRun.evidence, null, 2)}</pre></details>{readinessRun.status === "WAITING" && readinessRun.evidence?.workflowStep === "TEST_RUN_BUDGET_BOUND" && <><button data-testid="v33-reserve-experiment" disabled={loading || !["normal", "recovery"].includes(String(readinessRun.scenarioId))} onClick={() => void reserveScenarioExperiment()}>明确确认并预留 Fixture Experiment</button><p>只创建Experiment及预算预留，不派发Job。</p>{readinessRun.scenarioId === "rejection" && <><button data-testid="v33-verify-rejection" disabled={loading} onClick={() => void verifyScenarioRejection()}>明确确认并验证预算拒绝</button><p>对同一 TestRun 尝试80 cents请求，核实50 cents上限返回拒绝且无Experiment、模型调用或Runner Job。</p></>}<button data-testid="v33-cancel-readiness" disabled={loading} onClick={() => void cancelReadinessRun()}>取消准备态 TestRun</button></>}{readinessRun.status === "WAITING" && readinessRun.evidence?.workflowStep === "EXPERIMENT_RESERVED" && <><button data-testid="v33-dispatch-runner" disabled={loading} onClick={() => void dispatchScenarioExperiment()}>明确确认并派发两轮 Fixture Runner</button><p>会产生两次明确标注的本地Fixture模型响应、不可变输入Artifact和两条Runner Job；外部Provider调用为0。</p></>}{readinessRun.status === "RUNNING" && readinessRun.evidence?.workflowStep === "RUNNER_JOBS_QUEUED" && <><button data-testid="v33-reconcile-runner-results" disabled={loading} onClick={() => void reconcileScenarioResults()}>明确确认并归并已完成的两轮结果</button><p>只在两条指定Job均完成且输出Artifact字节通过SHA-256校验后归并；这不会替代Experiment结算、场景断言或用户验收。</p></>}{readinessRun.status === "RUNNING" && readinessRun.scenarioId === "recovery" && readinessRun.evidence?.workflowStep === "EXPERIMENT_SETTLED_AND_RESULTS_RECONCILED" && <><button data-testid="v33-verify-recovery" disabled={loading} onClick={() => void verifyScenarioRecovery()}>明确确认并验证检查点恢复</button><p>复核同一 TestRun 的持久检查点序列及从检查点恢复的输出指标，并保存业务断言。</p></>}{readinessRun.status === "RUNNING" && readinessRun.scenarioId === "normal" && readinessRun.evidence?.workflowStep === "EXPERIMENT_SETTLED_AND_RESULTS_RECONCILED" && <><button data-testid="v33-verify-normal" disabled={loading} onClick={() => void verifyScenarioNormal()}>明确确认并验证正常场景结果</button><p>重新读取同一 TestRun 的Runner输出、Fixture指标与两轮结算账本并保存业务断言。</p></>}</section>}</section>
    <section aria-label="读取已有研究队列"><h2>读取已有 TestRun 队列</h2><label>V3.3 TestRun UUID <input aria-label="V3.3 TestRun UUID" value={testRunId} onChange={(event) => setTestRunId(event.target.value)} /></label><button data-testid="v33-read-queue" disabled={loading} onClick={() => { setPageCursors([null]); void readQueue(0, testRunId, null); }}>{loading ? "读取中…" : "读取只读队列和预算"}</button>{error && <p role="alert" className="error">{error}</p>}</section>
    <section aria-label="V3.3能力边界"><h2>当前能力边界</h2><dl><dt>准备态 TestRun 元数据</dt><dd data-testid="v33-readiness-status">PERSISTED_WAITING_WITH_SCENARIO_PROGRESS</dd><dt>Runner 队列读取</dt><dd>OWNER_SCOPED_READ_ONLY</dd><dt>实验预算读取</dt><dd data-testid="v33-budget-status">OWNER_SCOPED_LEDGER_READ_ONLY</dd><dt>隔离 Fixture 工作流</dt><dd data-testid="v33-business-status">TWO_ROUND_EXECUTION_SETTLEMENT_AND_NORMAL_RECOVERY_REJECTION_ASSERTIONS_VERIFIED</dd><dt>TestRun及轮次预算硬限制</dt><dd data-testid="v33-stage-budget-status">TEST_RUN_AND_ROUND_CAP_ENFORCED</dd><dt>Paper 并行可用性</dt><dd data-testid="v33-paper-status">NOT_CHECKED</dd></dl><p>TestRun总账按唯一Experiment去重，UNKNOWN预留与实验预留不可重复计算。明确确认后，normal/recovery可运行隔离双轮Fixture并保存同一TestRun的业务断言；rejection验证超预算请求被拒且没有账本或Job副作用。自动代码套件已在隔离服务、数据库和无网络Runner容器中验证执行、结算及恢复路径。真实Provider与行情调用、Paper并行连续性、Ubuntu运行和阶段人工验收仍未通过此Fixture结果替代。</p></section>
    {queue && <section aria-label="研究队列结果"><h2>Runner 队列</h2><p data-testid="v33-queue-scope">TestRun：<code>{queue.testRunId}</code> · {queue.jobs.length} 条 · 偏移 {offset} · 每页 {queue.limit}</p>{queue.jobs.length === 0 ? <p data-testid="v33-queue-empty">此 TestRun 当前没有 Runner Job。</p> : <table><thead><tr><th>Job</th><th>状态</th><th>尝试</th><th>提交时间</th><th>完成时间</th><th>退出码</th><th>Artifact 数</th></tr></thead><tbody>{queue.jobs.map((job) => <tr key={job.jobId}><td><code>{job.jobId}</code>{job.retryOf && <small>重试自 {job.retryOf}</small>}</td><td>{job.status}</td><td>{job.attempt}</td><td>{job.submittedAt}</td><td>{job.completedAt ?? "—"}</td><td>{job.execution?.exitCode ?? "—"}</td><td>{job.artifacts.length}</td></tr>)}</tbody></table>}<div><button data-testid="v33-previous-page" disabled={loading || offset === 0} onClick={() => void readQueue(Math.max(0, Math.floor(offset / pageSize) - 1))}>上一页</button><button data-testid="v33-next-page" disabled={loading || !queue.hasMore || !queue.nextAfterCursor} onClick={() => void readQueue(Math.floor(offset / pageSize) + 1, testRunId, queue.nextAfterCursor)}>下一页</button></div><details><summary>查看原始队列证据</summary><pre data-testid="v33-queue-evidence">{JSON.stringify(queue, null, 2)}</pre></details></section>}
    {budgetError && <p role="alert" className="error">预算账本读取失败：{budgetError}</p>}
    {testRunBudgetSummary && <section aria-label="V3.3 TestRun完整预算汇总"><h2>TestRun 预算总账（按唯一 Experiment）</h2><p>{testRunBudgetTotals ? `${testRunBudgetTotals.experiments} 个实验 · 申请 ${testRunBudgetTotals.requestedCents} cents · 保留 ${testRunBudgetTotals.reservedCents} cents · 已结算 ${testRunBudgetTotals.settledCents} cents · 未知预留 ${testRunBudgetTotals.unknownReservedCents} cents · 模型尝试 ${testRunBudgetTotals.modelCallCount}` : "总额仅在第一页计算，返回第一页读取。"}</p>{testRunBudgetSummary.rows.length === 0 ? <p data-testid="v33-test-run-budget-empty">该 TestRun 尚无已绑定的实验账本。</p> : <table><thead><tr><th>实验</th><th>轮数</th><th>每轮额度 / 已用</th><th>申请</th><th>预留</th><th>结算</th><th>UNKNOWN预留</th><th>模型调用</th><th>状态</th></tr></thead><tbody>{testRunBudgetSummary.rows.map((row) => <tr key={row.experimentId}><td><code>{row.experimentId}</code></td><td>{row.rounds}</td><td>{row.roundBudget.map((round) => `R${round.roundIndex}: ${round.usedCents}/${round.allocatedCents}${round.unknownReservedCents ? `（UNKNOWN ${round.unknownReservedCents}）` : ""}`).join(" · ")}</td><td>{row.requestedCents}</td><td>{row.reservedCents}</td><td>{row.settledCents}</td><td>{row.unknownReservedCents}</td><td>{row.modelCallCount}</td><td>{row.status}</td></tr>)}</tbody></table>}<p data-testid="v33-test-run-budget-scope">{testRunBudgetSummary.accountingScope}; stage budget control: {testRunBudgetSummary.stageBudgetControl}</p><div><button data-testid="v33-summary-previous-page" disabled={budgetSummaryLoading || budgetSummaryPage === 0} onClick={() => void readBudgetSummaryPage(budgetSummaryPage - 1)}>预算上页</button><button data-testid="v33-summary-next-page" disabled={budgetSummaryLoading || !testRunBudgetSummary.hasMore || !testRunBudgetSummary.nextAfterCursor} onClick={() => void readBudgetSummaryPage(budgetSummaryPage + 1, testRunId, testRunBudgetSummary.nextAfterCursor)}>预算下页</button><span>预算页 {budgetSummaryPage + 1}</span></div><details><summary>查看TestRun预算总账原始证据</summary><pre data-testid="v33-test-run-budget-evidence">{JSON.stringify(testRunBudgetSummary, null, 2)}</pre></details></section>}
    {budget && <section aria-label="V3.3持久预算证据"><h2>实验预算账本（本页 Runner Job）</h2><p>{budget.coverage.budgetsFound}/{budget.coverage.experimentsOnPage} 个不同实验可找到账本；缺失 {budget.coverage.budgetsMissing}。金额单位为 USD cents；费用未知时保留为 UNKNOWN。</p>{budget.rows.length === 0 ? <p>此页无Runner Job，因此没有可归属的实验预算行。</p> : <table><thead><tr><th>实验</th><th>申请额度</th><th>预留</th><th>已结算</th><th>未知预留</th><th>账本状态</th><th>来源</th></tr></thead><tbody>{budget.rows.map((row) => <tr key={`${row.jobId}:${row.experimentId}`}><td><code>{row.experimentId}</code></td><td>{row.requestedCents ?? "—"}</td><td>{row.reservedCents ?? "—"}</td><td>{row.settledCents ?? "—"}</td><td>{row.unknownReservedCents ?? "—"}</td><td>{row.status}</td><td>{row.source}</td></tr>)}</tbody></table>}<p>{budget.note}</p><details><summary>查看预算账本原始证据</summary><pre data-testid="v33-budget-evidence">{JSON.stringify(budget, null, 2)}</pre></details></section>}
  </main>;
}

function Dc06Acceptance() { const [data, setData] = useState<any>(null); const [error, setError] = useState<string | null>(null); const call = async (path: string, init?: RequestInit) => { try { setError(null); setData(await api<any>(path, init)); } catch (e) { setError(String(e)); } }; const run = async (scenarioId: string) => { try { setError(null); const accepted = await api<any>("/api/v1/acceptance/v2/dc06/runs", { method: "POST", body: JSON.stringify({ scenarioId, seed: 20260907 }) }); setData(await api<any>(`/api/v1/acceptance/v2/dc06/runs/${accepted.testRunId}`)); } catch (e) { setError(String(e)); } }; return <main><header><p className="eyebrow">StockQuant · 开发验收中心</p><h1>DC-06 多项目数据交付</h1><p>项目隔离、分页、导出脱敏和令牌恢复；仅调用真实 market-data-service，不触发交易。</p></header>{error && <p role="alert" className="error">{error}</p>}<section><h2>交付能力</h2><button onClick={()=>void call("/api/v1/acceptance/v2/dc06/preview")}>查看项目配置</button><button onClick={()=>void run("normal")}>运行分页与脱敏</button><button onClick={()=>void run("rejection")}>运行跨项目拒绝</button><button onClick={()=>void run("recovery")}>运行令牌恢复</button></section>{data && <pre data-testid="dc06-evidence">{JSON.stringify(data,null,2)}</pre>}</main>; }

function Dc08Acceptance() { const [data, setData] = useState<any>(null); const [error, setError] = useState<string | null>(null); const refresh = async () => { try { setError(null); setData(await api<any>("/api/v1/acceptance/v2/dc08/preview")); } catch (e) { setError(String(e)); } }; return <main><header><p className="eyebrow">StockQuant · 开发验收中心</p><h1>DC-08A 分钟采集观察</h1><p>只读查看正式订阅、服务就绪状态和缺口；不会从 Web 页面开启采集。</p></header>{error && <p role="alert" className="error">{error}</p>}<section><h2>当前状态</h2><button onClick={()=>void refresh()}>刷新采集状态</button></section>{data && <section><dl><dt>订阅</dt><dd data-testid="dc08-subscription-id">{data.subscriptionId}</dd><dt>采集器</dt><dd data-testid="dc08-executor-status">{data.ready?.collectionExecutor}</dd><dt>订阅是否启用</dt><dd data-testid="dc08-schedule-enabled">{String(data.schedule?.enabled)}</dd><dt>开放缺口</dt><dd data-testid="dc08-open-gaps">{data.gaps?.open?.length ?? 0}</dd></dl><pre data-testid="dc08-evidence">{JSON.stringify(data,null,2)}</pre></section>}</main>; }

createRoot(document.getElementById("root")!).render(<App />);
