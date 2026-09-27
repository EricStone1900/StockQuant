import { expect, test } from "@playwright/test";

test("V2.2 small CSV import requires a quality preview before publishing", async ({ page }) => {
  const requests: Array<{ path: string; body: any }> = [];
  await page.route("**/api/v1/session", async (route) => route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ status: "authenticated" }) }));
  await page.route("**/api/v1/acceptance/v2/v2.2/csv/**", async (route) => {
    const request = route.request();
    const body = request.postDataJSON();
    requests.push({ path: new URL(request.url()).pathname, body });
    if (new URL(request.url()).pathname.endsWith("/preview")) return route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ headers: ["securityId", "timestamp", "open", "high", "low", "close", "volume", "amount"], totalRows: 1, acceptedRows: 1, errors: [], bars: [{ securityId: "600000.SH", barStart: "2026-09-24T01:30:00.000Z" }] }) });
    return route.fulfill({ status: 201, contentType: "application/json", body: JSON.stringify({ status: "PUBLISHED", accepted: 1, sha256: "a".repeat(64), idempotent: false }) });
  });

  await page.goto("/acceptance/v2/v2.2");
  await expect(page.getByRole("heading", { name: "分钟文件上传" })).toBeVisible();
  await page.getByLabel("CSV 或 Parquet 文件").setInputFiles({ name: "minute.csv", mimeType: "text/csv", buffer: Buffer.from("securityId,timestamp,open,high,low,close,volume,amount\n600000.SH,2026-09-24 09:30,10,11,9,10.5,100,1050\n") });
  await expect(page.getByRole("button", { name: "确认并导入" })).toBeDisabled();
  await page.getByLabel("数据来源名称").fill("V22 synthetic browser fixture");
  await page.getByLabel("许可声明").fill("Synthetic test data permitted for repository tests");
  await page.getByLabel("取得时间").fill("2026-09-24T09:35");
  await page.getByLabel("我确认已核对许可允许研究使用（这是操作者声明，不代表系统完成法律审查）").check();
  await page.getByRole("button", { name: "上传并预览" }).click();
  await expect(page.getByRole("button", { name: "确认并导入" })).toBeEnabled();
  await page.getByRole("button", { name: "确认并导入" }).click();
  await expect(page.getByTestId("v22-evidence")).toContainText("PUBLISHED");
  expect(requests.map((item) => item.path)).toEqual(["/api/v1/acceptance/v2/v2.2/csv/preview", "/api/v1/acceptance/v2/v2.2/csv/import"]);
  expect(requests[0].body).toMatchObject({ market: "CN_A", frequency: "1m", adjustment: "RAW", timezone: "Asia/Shanghai", timestampSemantics: "BAR_START", volumeUnit: "SHARES", amountUnit: "CNY", mapping: { securityId: "securityId", timestamp: "timestamp" } });
  expect(requests[0].body.provenance).toMatchObject({ sourceName: "V22 synthetic browser fixture", sourceReference: null, licenseStatement: "Synthetic test data permitted for repository tests", licenseVerification: "OPERATOR_CONFIRMED" });
  expect(requests[0].body.content).toContain("600000.SH,2026-09-24 09:30");
});

test("V2.2 large CSV resumes missing chunks after page reload", async ({ page }) => {
  let activeUploadId = "";
  const acceptedChunks = new Set<number>(); const calls: string[] = []; const sessionIds: string[] = []; const progressSnapshots: number[][] = []; let failedChunkOnce = false;
  await page.route("**/api/v1/session", async (route) => route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ status: "authenticated" }) }));
  await page.route("**/api/v1/acceptance/v2/v2.2/csv/uploads**", async (route) => {
    const request = route.request(); const url = new URL(request.url()); const method = request.method(); calls.push(`${method} ${url.pathname}`);
    if (method === "POST" && url.pathname.endsWith("/csv/uploads")) { activeUploadId = request.postDataJSON().uploadId; sessionIds.push(activeUploadId); return route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ uploadId: activeUploadId, status: "OPEN", expectedBytes: 848055, expectedChunks: 2, receivedBytes: 0, receivedChunks: [], result: null }) }); }
    if (method === "GET" && url.pathname.endsWith(`/csv/uploads/${activeUploadId}`)) { progressSnapshots.push([...acceptedChunks]); return route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ uploadId: activeUploadId, status: "OPEN", expectedBytes: 848055, expectedChunks: 2, receivedBytes: acceptedChunks.size * 524288, receivedChunks: [...acceptedChunks], result: null }) }); }
    const chunk = url.pathname.match(/\/chunks\/(\d+)$/u);
    if (method === "PUT" && chunk) {
      const index = Number(chunk[1]);
      if (index === 1 && !failedChunkOnce) { failedChunkOnce = true; return route.fulfill({ status: 503, contentType: "application/json", body: JSON.stringify({ message: "simulated transient disconnect" }) }); }
      acceptedChunks.add(index);
      return route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ uploadId: activeUploadId, status: "OPEN", expectedBytes: 848055, expectedChunks: 2, receivedBytes: acceptedChunks.size * 524288, receivedChunks: [...acceptedChunks], result: null }) });
    }
    if (method === "POST" && url.pathname.endsWith("/preview")) return route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ totalRows: 16000, acceptedRows: 16000, errors: [], bars: [] }) });
    if (method === "POST" && url.pathname.endsWith("/finalize")) return route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ status: "PUBLISHED", accepted: 16000, version: "large-fixture-v1", uploadStatus: "COMPLETED" }) });
    return route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ uploadId: activeUploadId, status: "CANCELLED", expectedBytes: 848055, expectedChunks: 2, receivedBytes: 0, receivedChunks: [], result: null }) });
  });
  const rows = ["securityId,timestamp,open,high,low,close,volume,amount"];
  for (let minute = 0; minute < 160; minute += 1) {
    const totalMinutes = minute < 120 ? 570 + minute : 780 + minute - 120;
    const stamp = `${String(Math.floor(totalMinutes / 60)).padStart(2, "0")}:${String(totalMinutes % 60).padStart(2, "0")}`;
    for (let security = 0; security < 100; security += 1) rows.push(`${String(600000 + security).padStart(6, "0")}.SH,2026-09-21 ${stamp},10,10.2,9.9,10.1,100,1000`);
  }
  const largeFile = { name: "minute-large.csv", mimeType: "text/csv", buffer: Buffer.from(`${rows.join("\n")}\n`) };
  await page.goto("/acceptance/v2/v2.2");
  const chooseFileAndMetadata = async () => {
    await page.getByLabel("CSV 或 Parquet 文件").setInputFiles(largeFile);
    await page.getByLabel("数据来源名称").fill("V22 large resume fixture");
    await page.getByLabel("许可声明").fill("Synthetic data for the browser upload test");
    await page.getByLabel("取得时间").fill("2026-09-21T15:00");
    await page.getByLabel("我确认已核对许可允许研究使用（这是操作者声明，不代表系统完成法律审查）").check();
  };
  await chooseFileAndMetadata();
  await page.getByRole("button", { name: "上传并预览" }).click();
  await expect(page.getByRole("alert")).toContainText("503");
  expect(acceptedChunks).toEqual(new Set([0]));
  expect(JSON.parse((await page.evaluate(() => window.localStorage.getItem("stockquant:v22:csvUpload")))!).uploadId).toBe(sessionIds[0]);
  await page.reload();
  await chooseFileAndMetadata();
  await page.getByRole("button", { name: "上传并预览" }).click();
  await expect(page.getByRole("button", { name: "确认并导入" })).toBeEnabled();
  expect(acceptedChunks).toEqual(new Set([0, 1]));
  expect(sessionIds).toHaveLength(2); expect(sessionIds[1]).toBe(sessionIds[0]);
  expect(progressSnapshots).toEqual([[], [0]]);
  expect(calls.filter((call) => call.includes("/chunks/0"))).toHaveLength(1);
  expect(calls.filter((call) => call.includes("/chunks/1"))).toHaveLength(2);
  await page.getByRole("button", { name: "确认并导入" }).click();
  await expect(page.getByTestId("v22-evidence")).toContainText("large-fixture-v1");
  expect(calls.filter((call) => call.endsWith("/finalize"))).toHaveLength(1);
});


test("V2.2 imports BaoStock five-minute end-stamped CSV with explicit semantics", async ({ page }) => {
  let submitted: any;
  await page.route("**/api/v1/session", async (route) => route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ status: "authenticated" }) }));
  await page.route("**/api/v1/acceptance/v2/v2.2/csv/**", async (route) => {
    submitted = route.request().postDataJSON();
    return route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ totalRows: 1, acceptedRows: 1, errors: [], bars: [{ securityId: "600259.SH", frequency: "5m", barStart: "2024-01-02T01:30:00.000Z", barEnd: "2024-01-02T01:35:00.000Z" }] }) });
  });
  await page.goto("/acceptance/v2/v2.2");
  await page.getByLabel("CSV 或 Parquet 文件").setInputFiles({ name: "baostock-5m.csv", mimeType: "text/csv", buffer: Buffer.from("date,time,code,open,high,low,close,volume,amount\n2024-01-02,20240102093500000,sh.600259,36.5800,36.5800,34.8000,34.8700,3191500,113428416.0000\n") });
  await page.getByLabel("securityId CSV 源列").selectOption("code");
  await page.getByLabel("timestamp CSV 源列").selectOption("time");
  await page.getByLabel("分钟频率").selectOption("5m");
  await page.getByLabel("时间戳语义").selectOption("BAR_END");
  await page.getByLabel("数据来源名称").fill("BaoStock frozen archive smoke");
  await page.getByLabel("许可声明").fill("Source license is not verified; not eligible for research");
  await page.getByLabel("取得时间").fill("2026-09-18T19:14");
  await page.getByRole("button", { name: "上传并预览" }).click();
  await expect(page.getByRole("button", { name: "确认并导入" })).toBeEnabled();
  expect(submitted).toMatchObject({ market: "CN_A", frequency: "5m", timestampSemantics: "BAR_END", timezone: "Asia/Shanghai", mapping: { securityId: "code", timestamp: "time" } });
});
