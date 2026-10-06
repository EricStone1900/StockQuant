import test from "node:test";
import assert from "node:assert/strict";
import { isIsolatedPostgresTarget } from "./isolated-postgres-target.mjs";

const name = "sq-test-postgres-0123456789abcdef";
const url = "postgresql://trade_execution_test:secret@127.0.0.1:49123/trade_execution_test";
function inspection(overrides = {}) {
  return {
    Name: `/${name}`,
    Image: "sha256:abc123",
    Config: { Image: "sha256:abc123" },
    State: { Running: true },
    HostConfig: { ReadonlyRootfs: true, Tmpfs: { "/var/lib/postgresql/data": "rw,size=512m" }, Memory: 1024 ** 3, PidsLimit: 128 },
    NetworkSettings: { Ports: { "5432/tcp": [{ HostIp: "127.0.0.1", HostPort: "49123" }] } },
    ...overrides,
  };
}

function portfolioInspection(overrides = {}) {
  return inspection({
    NetworkSettings: { Ports: { "5432/tcp": [{ HostIp: "127.0.0.1", HostPort: "49123" }] } },
    ...overrides,
  });
}

test("accepts a bounded read-only disposable PostgreSQL container on its exact loopback port", () => {
  assert.equal(isIsolatedPostgresTarget(url, name, () => inspection()), true);
});

test("rejects the shared Compose PostgreSQL test databases on port 5433", () => {
  assert.equal(isIsolatedPostgresTarget("postgresql://trade_execution_test@127.0.0.1:5433/trade_execution_test", undefined, () => { throw new Error("must not inspect Docker"); }), false);
});

test("supports a second named database and role only in the same disposable PostgreSQL container", () => {
  const portfolioUrl = "postgresql://portfolio_risk@127.0.0.1:49123/portfolio_risk_test";
  assert.equal(isIsolatedPostgresTarget(portfolioUrl, name, portfolioInspection, { username: "portfolio_risk", database: "portfolio_risk_test" }), true);
  assert.equal(isIsolatedPostgresTarget(portfolioUrl.replace("49123", "5433"), name, portfolioInspection, { username: "portfolio_risk", database: "portfolio_risk_test" }), false);
});

test("rejects arbitrary dynamic ports without a verifiable disposable container", () => {
  assert.equal(isIsolatedPostgresTarget(url, undefined, () => null), false);
  assert.equal(isIsolatedPostgresTarget(url, "other-container", () => inspection()), false);
  assert.equal(isIsolatedPostgresTarget(url.replace("49123", "5433"), name, () => inspection()), false);
});

test("rejects a writable, unbounded, non-loopback, misbound, or non-digest container", () => {
  assert.equal(isIsolatedPostgresTarget(url, name, () => inspection({ HostConfig: { ...inspection().HostConfig, ReadonlyRootfs: false } })), false);
  assert.equal(isIsolatedPostgresTarget(url, name, () => inspection({ HostConfig: { ...inspection().HostConfig, Memory: 0 } })), false);
  const publishedAt = (hostIp, hostPort) => inspection({ NetworkSettings: { Ports: { "5432/tcp": [{ HostIp: hostIp, HostPort: hostPort }] } } });
  assert.equal(isIsolatedPostgresTarget(url, name, () => publishedAt("0.0.0.0", "49123")), false);
  assert.equal(isIsolatedPostgresTarget(url, name, () => publishedAt("127.0.0.1", "5432")), false);
  assert.equal(isIsolatedPostgresTarget(url, name, () => inspection({ Config: { Image: "postgres:latest" } })), false);
});
