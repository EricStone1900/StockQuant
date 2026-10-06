import test from "node:test";
import assert from "node:assert/strict";
import { assessUbuntuHost, isLocalDockerEndpoint } from "./w8-ubuntu-host-preflight.mjs";

const docker = { status: "AVAILABLE", osType: "linux", architecture: "x86_64", operatingSystem: "Ubuntu 24.04", serverVersion: "28.0.0" };

test("Ubuntu x86_64 host inventory never implies release readiness or authorization", () => {
  const result = assessUbuntuHost({ system: "linux", machine: "x86_64", distroId: "ubuntu", distroVersion: "24.04", cpuCount: 8, memoryBytes: 16_000_000_000, diskAvailableBytes: 100_000_000_000, docker });
  assert.equal(result.status, "INVENTORY_ONLY");
  assert.equal(result.checks.targetIsUbuntuX86_64, "PASS");
  assert.equal(result.checks.approvedResourceThresholds, "NOT_DEFINED");
  assert.equal(result.checks.targetHostAuthorized, "NOT_CONFIRMED");
  assert.equal(result.checks.deploymentOrMigrationPerformed, false);
});

test("macOS and emulated/non-Ubuntu targets remain blocked", () => {
  for (const input of [
    { system: "darwin", machine: "arm64", distroId: undefined },
    { system: "linux", machine: "aarch64", distroId: "ubuntu" },
    { system: "linux", machine: "x86_64", distroId: "debian" },
  ]) assert.equal(assessUbuntuHost({ ...input, cpuCount: 4, memoryBytes: 1, diskAvailableBytes: 1, docker }).status, "BLOCKED");
});

test("missing or non-Linux Docker daemon blocks host readiness", () => {
  assert.equal(assessUbuntuHost({ system: "linux", machine: "x86_64", distroId: "ubuntu", cpuCount: 4, memoryBytes: 1, diskAvailableBytes: 1, docker: { status: "UNAVAILABLE" } }).status, "BLOCKED");
  assert.equal(assessUbuntuHost({ system: "linux", machine: "x86_64", distroId: "ubuntu", cpuCount: 4, memoryBytes: 1, diskAvailableBytes: 1, docker: { status: "AVAILABLE", osType: "windows" } }).status, "BLOCKED");
  assert.equal(assessUbuntuHost({ system: "linux", machine: "x86_64", distroId: "ubuntu", cpuCount: 4, memoryBytes: 1, diskAvailableBytes: 1, docker: { ...docker, architecture: "aarch64" } }).status, "BLOCKED");
  assert.equal(assessUbuntuHost({ system: "linux", machine: "x86_64", distroId: "ubuntu", cpuCount: 4, memoryBytes: 1, diskAvailableBytes: 1, docker: { status: "UNAVAILABLE" } }).checks.linuxContainerRuntimeMatchesTarget, "FAIL");
  const desktopArm = assessUbuntuHost({ system: "darwin", machine: "aarch64", distroId: undefined, cpuCount: 10, memoryBytes: 32, diskAvailableBytes: 1, docker: { status: "AVAILABLE", osType: "linux", architecture: "aarch64", operatingSystem: "Docker Desktop" } });
  assert.equal(desktopArm.containerRuntime.status, "AVAILABLE");
  assert.equal(desktopArm.checks.linuxContainerRuntimeMatchesTarget, "FAIL");
});

test("only local Unix-socket Docker endpoints are eligible for read-only inventory", () => {
  assert.equal(isLocalDockerEndpoint("unix:///var/run/docker.sock"), true);
  assert.equal(isLocalDockerEndpoint("unix:///custom/docker.sock", "unix:///custom/docker.sock"), true);
  assert.equal(isLocalDockerEndpoint("tcp://192.0.2.1:2376"), false);
  assert.equal(isLocalDockerEndpoint("unix:///var/run/docker.sock", "tcp://registry.example:2376"), false);
});
