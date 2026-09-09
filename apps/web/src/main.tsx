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

createRoot(document.getElementById("root")!).render(<App />);
