import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import type { DailyDirectionInput } from "../application/v24-daily-direction.js";

export async function loadV24DailyDirectionFixture(): Promise<{ input: Omit<DailyDirectionInput, "clock">; sha256: string }> {
  const path = "fixtures/v2/v2.4/daily-direction-v1/input.json";
  const read = (file: string) => readFile(resolve(process.cwd(), file)).catch(() => readFile(resolve(process.cwd(), "../..", file)));
  const bytes = await read(path);
  const sha256 = createHash("sha256").update(bytes).digest("hex");
  const manifest = JSON.parse((await read("fixtures/v2/v2.4/daily-direction-v1/manifest.json")).toString("utf8")) as { status: string; fixtureVersion: string; files: Array<{ path: string; sha256: string }> };
  if (manifest.status !== "FROZEN" || manifest.fixtureVersion !== "v24-daily-direction-1" || manifest.files.length !== 1 || manifest.files[0].path !== path || manifest.files[0].sha256 !== sha256) throw new Error("C5_DAILY_DIRECTION_FIXTURE_HASH_MISMATCH");
  return { input: JSON.parse(bytes.toString("utf8")) as Omit<DailyDirectionInput, "clock">, sha256 };
}
