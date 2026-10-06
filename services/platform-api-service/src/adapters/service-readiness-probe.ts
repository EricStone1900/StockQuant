export type ReadinessResult = { status: "READY"; body: unknown } | { status: "UNAVAILABLE" };

export async function probeServiceReadiness(
  url: string,
  timeoutMs = 3000,
  request: typeof fetch = fetch,
): Promise<ReadinessResult> {
  try {
    const response = await request(url, { signal: AbortSignal.timeout(timeoutMs) });
    if (!response.ok) return { status: "UNAVAILABLE" };
    const body: unknown = await response.json();
    return { status: "READY", body };
  } catch {
    return { status: "UNAVAILABLE" };
  }
}

export async function requireServiceReadiness(url: string, dependency: string, request: typeof fetch = fetch): Promise<void> {
  const result = await probeServiceReadiness(url, 3000, request);
  if (result.status !== "READY") throw new Error(`${dependency} dependency is unavailable`);
}
