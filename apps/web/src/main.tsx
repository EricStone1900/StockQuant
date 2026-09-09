import { useEffect, useMemo, useState } from "react";
import { createRoot } from "react-dom/client";
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

async function api<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(path, { credentials: "include", headers: { "content-type": "application/json", ...(init?.headers ?? {}) }, ...init });
  if (!response.ok) throw new Error(`${response.status} ${await response.text()}`);
  return response.json() as Promise<T>;
}

function App() {
  const [scenarios, setScenarios] = useState<Scenario[]>([]);
  const [run, setRun] = useState<TestRun | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [capabilities, setCapabilities] = useState<{ brokerMode: string; liveTradingEnabled: boolean } | null>(null);

  const route = useMemo(() => window.location.pathname, []);
  if (route === "/acceptance/v1/v1.2") return <V12Acceptance />;
  if (route === "/acceptance/v1/v1.3") return <V13Acceptance />;
  if (route === "/acceptance/v1/v1.4") return <V14Acceptance />;
  if (route === "/acceptance/v1/v1.5") return <V15Acceptance />;
  if (route === "/acceptance/v2/v2.1") return <V21Acceptance />;
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
    if (!run || !["QUEUED", "RUNNING"].includes(run.status)) return;
    const timer = window.setInterval(() => {
      void api<TestRun>(`/api/v1/acceptance/runs/${run.testRunId}`).then(setRun).catch((cause) => setError(String(cause)));
    }, 500);
    return () => window.clearInterval(timer);
  }, [run]);

  const start = async (scenarioId: Scenario["scenarioId"]) => {
    setError(null);
    try {
      const accepted = await api<{ testRunId: string }>("/api/v1/acceptance/v1/v1.1/runs", {
        method: "POST",
        body: JSON.stringify({ scenarioId, seed: 20260907 })
      });
      setRun(await api<TestRun>(`/api/v1/acceptance/runs/${accepted.testRunId}`));
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "无法创建验收运行");
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

function V21Acceptance() { const [data, setData] = useState<any>(null); const [error, setError] = useState<string | null>(null); const load = async (path: string) => { try { setError(null); const r = await api<any>(path); setData((old: any) => ({ ...(old ?? {}), [path.split("/").pop()!]: r })); } catch (e) { setError(String(e)); } }; const over = async () => { try { const securities = Array.from({ length: 101 }, (_, i) => `${String(600000 + i).padStart(6, "0")}.SH`); await api("/api/v1/acceptance/v2/v2.1/watchlist", { method: "PUT", body: JSON.stringify({ securities }) }); } catch (e) { setError(String(e)); } }; const run = async (scenarioId: string) => { try { setError(null); const accepted = await api<any>("/api/v1/acceptance/v2/v2.1/runs", { method: "POST", body: JSON.stringify({ scenarioId, seed: 20260907 }) }); const result = await api<any>(`/api/v1/acceptance/v2/v2.1/runs/${accepted.testRunId}`); setData((old: any) => ({ ...(old ?? {}), run: result })); } catch (e) { setError(String(e)); } }; return <main><header><p className="eyebrow">StockQuant · 开发验收中心</p><h1>V2.1 免费行情、新闻聚合与在线股票池</h1><p>真实来源能力与小样本验收；不触发交易。</p></header>{error && <p role="alert" className="error">{error}</p>}<section><h2>来源与股票池</h2><button onClick={()=>void load("/api/v1/acceptance/v2/v2.1/sources")}>检查来源能力</button><button onClick={()=>void load("/api/v1/acceptance/v2/v2.1/sampling")}>查看20/30分钟规则</button><button onClick={()=>void load("/api/v1/acceptance/v2/v2.1/watchlist")}>查看股票池</button><button onClick={()=>void load("/api/v1/acceptance/v2/v2.1/quotes")}>采集实时快照</button><button onClick={()=>void load("/api/v1/acceptance/v2/v2.1/news/live")}>抓取实时新闻</button><button onClick={()=>void load("/api/v1/acceptance/v2/v2.1/news")}>查看新闻去重样本</button><button onClick={()=>void over()}>提交101只并验证拒绝</button></section><section><h2>统一场景运行</h2><button onClick={()=>void run("normal")}>运行正常</button><button onClick={()=>void run("rejection")}>运行容量拒绝</button><button onClick={()=>void run("recovery")}>运行熔断恢复</button></section>{data && <pre data-testid="v21-evidence">{JSON.stringify(data,null,2)}</pre>}</main>; }

createRoot(document.getElementById("root")!).render(<App />);
