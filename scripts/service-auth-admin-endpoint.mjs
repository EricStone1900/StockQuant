export function serviceAuthAdminEndpoint(value, isolatedContainerName = "") {
  const endpoint = new URL(value ?? "postgresql://postgres@127.0.0.1:5433/postgres");
  const helperMarked = /^sq-test-postgres-[a-f0-9]{16}$/u.test(isolatedContainerName);
  if (endpoint.hostname !== "127.0.0.1" || endpoint.username !== "postgres" || endpoint.pathname !== "/postgres" || (endpoint.port !== "5433" && !helperMarked)) {
    throw new Error("service auth HTTP smokes require the dedicated local PostgreSQL admin endpoint or a helper-marked disposable PostgreSQL endpoint");
  }
  return endpoint;
}
