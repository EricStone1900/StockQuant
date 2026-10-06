import { basename, dirname, resolve } from "node:path";
import { tmpdir } from "node:os";

export function validateQlibBackfillTarget(databaseUrl: string | undefined, contentRoot: string | undefined): { databaseUrl: string; contentRoot: string } {
  if (!databaseUrl || !contentRoot) throw new Error("PLATFORM_API_QLIB_BACKFILL_DATABASE_URL and PLATFORM_API_QLIB_BACKFILL_CONTENT_ROOT are required");
  const target = new URL(databaseUrl);
  if (decodeURIComponent(target.pathname.slice(1)) !== "platform_api_test") throw new Error("Qlib legacy backfill is restricted to the isolated platform_api_test database");
  const resolvedContentRoot = resolve(contentRoot);
  if (dirname(resolvedContentRoot) !== resolve(tmpdir()) || !/^stockquant-qlib-backfill-[a-f0-9-]{8,}$/u.test(basename(resolvedContentRoot))) {
    throw new Error("Qlib legacy backfill content root must be a dedicated stockquant-qlib-backfill-* directory directly under the system temp directory");
  }
  return { databaseUrl, contentRoot: resolvedContentRoot };
}
