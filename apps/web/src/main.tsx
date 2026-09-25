import { useEffect, useMemo, useState } from "react";
import { createRoot } from "react-dom/client";
import type { V24ObservationRevisionList } from "../../../packages/contracts/generated/types.js";
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
  const basePath = "/api/v1/acceptance/v2/v2.2";
  const [data, setData] = useState<any>(null); const [error, setError] = useState<string | null>(null);
  const [runId, setRunId] = useState(() => window.localStorage.getItem(storageKey) ?? "");
  const load = async (path: string, body?: any) => { try { setError(null); const r = await api<any>(path, body ? { method: "POST", body: JSON.stringify(body) } : undefined); setData((old: any) => ({ ...(old ?? {}), [path.split("/").pop()!]: r })); } catch (e) { setError(String(e)); } };
  const run = async (scenarioId: string) => { try { setError(null); const accepted = await api<any>(`${basePath}/runs`, { method: "POST", body: JSON.stringify({ scenarioId, seed: 20260907 }) }); window.localStorage.setItem(storageKey, accepted.testRunId); setRunId(accepted.testRunId); const result = await api<any>(`${basePath}/runs/${accepted.testRunId}`); setData((old: any) => ({ ...(old ?? {}), run: result })); } catch (e) { setError(String(e)); } };
  useEffect(() => { if (!runId) return; void api<any>(`${basePath}/runs/${runId}`).then((result) => setData((old: any) => ({ ...(old ?? {}), run: result }))).catch((e) => { window.localStorage.removeItem(storageKey); setRunId(""); setError(String(e)); }); }, [runId]);
  return <main><header><p className="eyebrow">StockQuant · 开发验收中心</p><h1>V2.2 历史分钟数据导入与校验</h1><p>1分钟 CN Fixture；导入、质量拒绝和幂等验证，不触发交易。</p></header>{error && <p role="alert" className="error">{error}</p>}<section><h2>导入与预览</h2><button onClick={()=>void load(`${basePath}/preview`)}>预览分钟数据</button><button onClick={()=>void load(`${basePath}/import`, { fixture: "normal" })}>导入正常文件</button><button onClick={()=>void load(`${basePath}/import`, { fixture: "bad" })}>导入坏文件并拒绝</button></section><section><h2>统一场景运行</h2><button onClick={()=>void run("normal")}>运行正常</button><button onClick={()=>void run("rejection")}>运行质量拒绝</button><button onClick={()=>void run("recovery")}>运行重复幂等</button></section>{data?.run && <section aria-label="V2.2 持久运行"><h2>当前持久运行</h2><dl><dt>testRunId</dt><dd data-testid="v22-test-run-id">{data.run.testRunId}</dd><dt>状态</dt><dd data-testid="v22-run-status">{data.run.status}</dd></dl></section>}{data && <pre data-testid="v22-evidence">{JSON.stringify(data,null,2)}</pre>}</main>; }

function V23Acceptance() { const [data, setData] = useState<any>(null); const [error, setError] = useState<string | null>(null); const load = async (path: string) => { try { setError(null); const preview = await api<any>(path); setData((old: any) => ({ ...(old ?? {}), preview })); } catch (e) { setError(String(e)); } }; const run = async (scenarioId: string, defer = false) => { try { setError(null); const accepted = await api<any>("/api/v1/acceptance/v2/v2.3/runs", { method: "POST", body: JSON.stringify({ scenarioId, seed: 20260907, defer }) }); const result = defer ? accepted : await api<any>(`/api/v1/acceptance/v2/v2.3/runs/${accepted.testRunId}`); setData((old: any) => ({ ...(old ?? {}), run: result })); } catch (e) { setError(String(e)); } }; const worker = async (action?: string) => { const id = data?.run?.testRunId; if (!id) return; try { setError(null); const path = action ? `/api/v1/acceptance/v2/v2.3/runs/${id}/worker/${action}` : `/api/v1/acceptance/v2/v2.3/runs/${id}/worker`; const result = await api<any>(path, action ? { method: "POST", body: "{}" } : undefined); setData((old: any) => ({ ...(old ?? {}), worker: result })); } catch (e) { setError(String(e)); } }; const research = data?.run?.evidence?.crossService?.research; return <main><header><p className="eyebrow">StockQuant · 开发验收中心</p><h1>V2.3 日频决策、分钟撮合与历史事件回放</h1><p>MINUTE_BAR / BACKTEST / FAKE；虚拟时钟、确定性事件屏障、检查点恢复与 Qlib 研究 Artifact。</p></header>{error && <p role="alert" className="error">{error}</p>}<section><h2>回放数据</h2><button onClick={()=>void load("/api/v1/acceptance/v2/v2.3/preview")}>预览回放数据</button></section><section><h2>统一场景运行</h2><button onClick={()=>void run("normal")}>运行正常回放</button><button onClick={()=>void run("rejection")}>运行未来信息拒绝</button><button onClick={()=>void run("recovery")}>运行检查点恢复</button><button onClick={()=>void run("normal", true)}>启动可暂停长回放</button></section>{data?.run && <section><h2>Worker 生命周期</h2><button onClick={()=>void worker()}>查询状态</button><button onClick={()=>void worker("pause")}>暂停</button><button onClick={()=>void worker("resume")}>恢复</button><button onClick={()=>void worker("cancel")}>取消</button>{data.worker && <pre data-testid="v23-worker-status">{JSON.stringify(data.worker,null,2)}</pre>}</section>}{research && <section><h2>量化研究 Artifact</h2><p data-testid="v23-research-status">{research.status} · {research.adapter} · {research.dataMode} · modelCalls={research.modelCalls}</p><code data-testid="v23-research-hash">{research.artifactHash}</code></section>}{data && <pre data-testid="v23-evidence">{JSON.stringify(data,null,2)}</pre>}</main>; }

function V24Acceptance() {
  const [data, setData] = useState<any>(null); const [error, setError] = useState<string | null>(null);
  const [observations, setObservations] = useState<Array<{ observationDate: string; testRunId: string | null; reconciliationStatus: string; errors: string[] }>>([]);
  const [revisionData, setRevisionData] = useState<V24ObservationRevisionList | null>(null);
  const call = async (path: string, init?: RequestInit) => { try { setError(null); setData(await api<any>(path, init)); } catch (e) { setError(String(e)); } };
  const loadObservations = async () => { try { setError(null); setObservations(await api<Array<{ observationDate: string; testRunId: string | null; reconciliationStatus: string; errors: string[] }>>("/api/v1/acceptance/v2/v2.4/observations")); } catch (e) { setError(String(e)); } };
  const loadRevisions = async (testRunId: string) => { try { setError(null); setRevisionData(await api<V24ObservationRevisionList>(`/api/v1/acceptance/v2/v2.4/runs/${testRunId}/revisions`)); } catch (e) { setError(String(e)); } };
  const run = async (scenarioId: string) => { try { setError(null); setRevisionData(null); const accepted = await api<any>("/api/v1/acceptance/v2/v2.4/runs", { method: "POST", body: JSON.stringify({ scenarioId, seed: 20260907 }) }); setData(await api<any>(`/api/v1/acceptance/v2/v2.4/runs/${accepted.testRunId}`)); } catch (e) { setError(String(e)); } };
  const summary = data?.targetDays !== undefined && data?.countedDays !== undefined ? data : null;
  return <main><header><p className="eyebrow">StockQuant · 开发验收中心</p><h1>V2.4 真实时钟下持续模拟交易</h1><p>PAPER / LIVE_SOURCE_SMOKE / FAKE；仅模拟 Mandate，LIVE 激活关闭。</p></header>{error && <p role="alert" className="error">{error}</p>}<section><h2>运行配置</h2><button onClick={()=>void call("/api/v1/acceptance/v2/v2.4/preview")}>查看采样与执行窗口</button><button onClick={()=>void call("/api/v1/acceptance/v2/v2.4/scheduler/status")}>查看调度状态</button><button onClick={()=>void call("/api/v1/acceptance/v2/v2.4/observation-summary")}>查看日终观察进度</button><button onClick={()=>void loadObservations()}>查看观察记录</button><button onClick={()=>void call("/api/v1/acceptance/v2/v2.4/scheduler/start", { method: "POST", body: "{}" })}>启动调度</button><button onClick={()=>void call("/api/v1/acceptance/v2/v2.4/scheduler/tick", { method: "POST", body: "{}" })}>执行一次采样 Tick</button><button onClick={()=>void call("/api/v1/acceptance/v2/v2.4/scheduler/stop", { method: "POST" })}>停止调度</button><button onClick={()=>void run("normal")}>运行持续采样</button><button onClick={()=>void run("rejection")}>运行陈旧/重复拒绝</button><button onClick={()=>void run("recovery")}>运行断网恢复</button></section>{summary && <section aria-label="日终观察汇总"><h2>日终观察汇总</h2><dl><dt>有效日终观察</dt><dd data-testid="v24-observed-days">{summary.countedDays}/{summary.targetDays}</dd><dt>剩余观察日</dt><dd data-testid="v24-remaining-days">{summary.remainingDays}</dd><dt>状态</dt><dd data-testid="v24-observation-status">{summary.status}</dd></dl></section>}{observations.length > 0 && <section aria-label="观察运行历史"><h2>观察运行历史</h2><ul>{observations.filter((item) => item.testRunId).map((item) => <li key={item.testRunId} data-testid={`v24-observation-run-${item.testRunId}`}>{item.observationDate} · {item.reconciliationStatus} · {item.errors.length} 个错误 <button onClick={() => void loadRevisions(item.testRunId!)}>查看 {item.observationDate} 修订历史</button></li>)}</ul></section>}{revisionData && <section aria-label="观察证据修订历史"><h2>观察证据修订历史</h2><p>TestRun：{revisionData.testRunId}；修订数：{revisionData.revisions.length}</p>{revisionData.revisions.length === 0 ? <p>此运行没有历史修订。</p> : revisionData.revisions.map((revision) => <article key={revision.revisionId}><h3>修订 {revision.revisionId} · {revision.reason}</h3><p>原状态：{revision.priorStatus}；记录时间：{revision.recordedAt}</p><pre>{JSON.stringify({ assertions: revision.priorAssertions, evidence: revision.priorEvidence }, null, 2)}</pre></article>)}</section>}{data && <pre data-testid="v24-evidence">{JSON.stringify(data,null,2)}</pre>}</main>; }

function V25Acceptance() { const [data, setData] = useState<any>(null); const [error, setError] = useState<string | null>(null); const call = async (path: string, init?: RequestInit) => { try { setError(null); setData(await api<any>(path, init)); } catch (e) { setError(String(e)); } }; const run = async (scenarioId: string) => { try { setError(null); const accepted = await api<any>("/api/v1/acceptance/v2/v2.5/runs", { method: "POST", body: JSON.stringify({ scenarioId, seed: 20260907 }) }); setData(await api<any>(`/api/v1/acceptance/v2/v2.5/runs/${accepted.testRunId}`)); } catch (e) { setError(String(e)); } }; return <main><header><p className="eyebrow">StockQuant · 开发验收中心</p><h1>V2.5 历史数据扩容与 V2 验收</h1><p>20只 × 60交易日扩容档；BACKTEST / FIXTURE / FAKE。V2.4 20日观察门禁仍待完成。</p></header>{error && <p role="alert" className="error">{error}</p>}<section><h2>扩容与资源</h2><button onClick={()=>void call("/api/v1/acceptance/v2/v2.5/preview")}>查看扩容档与预算</button><button onClick={()=>void run("normal")}>运行扩容与模型验证</button><button onClick={()=>void run("rejection")}>运行资源/缓存拒绝</button><button onClick={()=>void run("recovery")}>运行任务恢复</button></section>{data && <pre data-testid="v25-evidence">{JSON.stringify(data,null,2)}</pre>}</main>; }

function V31Acceptance() {
  const [data, setData] = useState<V31Run | Record<string, unknown> | null>(null); const [error, setError] = useState<string | null>(null);
  const call = async (path: string, init?: RequestInit) => { try { setError(null); setData(await api<Record<string, unknown>>(path, init)); } catch (cause) { setError(String(cause)); } };
  const run = async (scenarioId: string) => { try { setError(null); const accepted = await api<{ testRunId: string }>("/api/v1/acceptance/v3/v3.1/runs", { method: "POST", body: JSON.stringify({ scenarioId, seed: 20260907 }) }); setData(await api<V31Run>(`/api/v1/acceptance/v3/v3.1/runs/${accepted.testRunId}`)); } catch (cause) { setError(String(cause)); } };
  const refresh = async () => { const id = (data as V31Run | null)?.testRunId; if (id) await call(`/api/v1/acceptance/v3/v3.1/runs/${id}`); };
  const runData = data as V31Run | null;
  const evidence = runData?.evidence ?? {};
  const orchestration = evidence.orchestration as Record<string, unknown> | undefined;
  const inputRef = orchestration?.inputRef as Record<string, unknown> | undefined;
  const runnerJob = orchestration?.runnerJob as Record<string, unknown> | undefined;
  const runnerDefinition = runnerJob?.job as Record<string, unknown> | undefined;
  const experiment = evidence.experiment as Record<string, unknown> | undefined;
  const experimentRecord = typeof experiment?.first === "object" && experiment.first ? experiment.first as Record<string, unknown> : experiment;
  return <main><header><p className="eyebrow">StockQuant · 开发验收中心</p><h1>V3.1 研究实验编排准备</h1><p>RESEARCH / FIXTURE / FAKE；当前只验证编排、拒绝和取消幂等，真实模型与 Runner 保持未启用。</p></header>{error && <p role="alert" className="error">{error}</p>}<section><h2>固定输入与能力</h2><button onClick={()=>void call("/api/v1/acceptance/v3/v3.1/preview")}>查看 V3.1 准备状态</button></section><section><h2>准备场景</h2><button onClick={()=>void run("normal")}>运行正常前置检查</button><button onClick={()=>void run("rejection")}>运行 LIVE 拒绝</button><button onClick={()=>void run("recovery")}>运行取消与幂等恢复</button></section>{runData?.testRunId && <section aria-label="V3.1 TestRun 编排摘要"><h2>当前 TestRun 编排</h2><button data-testid="v31-refresh" onClick={()=>void refresh()}>刷新同一 TestRun</button><dl><dt>testRunId</dt><dd data-testid="v31-test-run-id">{runData.testRunId}</dd><dt>场景</dt><dd>{runData.scenarioId}</dd><dt>TestRun 状态</dt><dd data-testid="v31-run-status">{runData.status}</dd><dt>Experiment 状态</dt><dd data-testid="v31-experiment-status">{String(experimentRecord?.status ?? "未创建")}</dd><dt>输入 Artifact</dt><dd data-testid="v31-artifact-status">{String(inputRef?.status ?? "未发布")}</dd><dt>Runner Job</dt><dd data-testid="v31-runner-status">{String(runnerJob?.status ?? "未提交")}</dd><dt>执行状态</dt><dd data-testid="v31-execution-status">{String(runnerJob?.execution ?? "未启动")}</dd><dt>前置条件</dt><dd data-testid="v31-prerequisite-status">{String(runnerJob?.prerequisiteStatus ?? "未检查")}</dd></dl>{runnerDefinition && <p>隔离镜像：<code>{String(runnerDefinition.imageDigest)}</code>；网络：<code>{String((runnerDefinition.networkPolicy as Record<string, unknown>)?.mode)}</code></p>}{runData.assertions && <table><thead><tr><th>断言</th><th>状态</th><th>预期</th></tr></thead><tbody>{runData.assertions.map((assertion) => <tr key={assertion.assertionId}><td>{assertion.assertionId}</td><td>{assertion.status}</td><td><code>{JSON.stringify(assertion.expected)}</code></td></tr>)}</tbody></table>}<details><summary>查看原始后端证据</summary><pre data-testid="v31-evidence">{JSON.stringify(runData,null,2)}</pre></details></section>}</main>;
}

function Dc06Acceptance() { const [data, setData] = useState<any>(null); const [error, setError] = useState<string | null>(null); const call = async (path: string, init?: RequestInit) => { try { setError(null); setData(await api<any>(path, init)); } catch (e) { setError(String(e)); } }; const run = async (scenarioId: string) => { try { setError(null); const accepted = await api<any>("/api/v1/acceptance/v2/dc06/runs", { method: "POST", body: JSON.stringify({ scenarioId, seed: 20260907 }) }); setData(await api<any>(`/api/v1/acceptance/v2/dc06/runs/${accepted.testRunId}`)); } catch (e) { setError(String(e)); } }; return <main><header><p className="eyebrow">StockQuant · 开发验收中心</p><h1>DC-06 多项目数据交付</h1><p>项目隔离、分页、导出脱敏和令牌恢复；仅调用真实 market-data-service，不触发交易。</p></header>{error && <p role="alert" className="error">{error}</p>}<section><h2>交付能力</h2><button onClick={()=>void call("/api/v1/acceptance/v2/dc06/preview")}>查看项目配置</button><button onClick={()=>void run("normal")}>运行分页与脱敏</button><button onClick={()=>void run("rejection")}>运行跨项目拒绝</button><button onClick={()=>void run("recovery")}>运行令牌恢复</button></section>{data && <pre data-testid="dc06-evidence">{JSON.stringify(data,null,2)}</pre>}</main>; }

function Dc08Acceptance() { const [data, setData] = useState<any>(null); const [error, setError] = useState<string | null>(null); const refresh = async () => { try { setError(null); setData(await api<any>("/api/v1/acceptance/v2/dc08/preview")); } catch (e) { setError(String(e)); } }; return <main><header><p className="eyebrow">StockQuant · 开发验收中心</p><h1>DC-08A 分钟采集观察</h1><p>只读查看正式订阅、服务就绪状态和缺口；不会从 Web 页面开启采集。</p></header>{error && <p role="alert" className="error">{error}</p>}<section><h2>当前状态</h2><button onClick={()=>void refresh()}>刷新采集状态</button></section>{data && <section><dl><dt>订阅</dt><dd data-testid="dc08-subscription-id">{data.subscriptionId}</dd><dt>采集器</dt><dd data-testid="dc08-executor-status">{data.ready?.collectionExecutor}</dd><dt>订阅是否启用</dt><dd data-testid="dc08-schedule-enabled">{String(data.schedule?.enabled)}</dd><dt>开放缺口</dt><dd data-testid="dc08-open-gaps">{data.gaps?.open?.length ?? 0}</dd></dl><pre data-testid="dc08-evidence">{JSON.stringify(data,null,2)}</pre></section>}</main>; }

createRoot(document.getElementById("root")!).render(<App />);
