import { createServer } from "node:http";
import { randomUUID } from "node:crypto";
import { Pool } from "pg";
import { InMemoryExperimentRepository } from "../adapters/in-memory-experiment-repository.js";
import { PgExperimentRepository } from "../adapters/pg-experiment-repository.js";
import { ExperimentService } from "../application/experiment-service.js";

const port = Number(process.env.STOCKQUANT_PORT ?? 3008);
const repository = process.env.STOCKQUANT_DATABASE_URL ? new PgExperimentRepository(new Pool({ connectionString: process.env.STOCKQUANT_DATABASE_URL })) : new InMemoryExperimentRepository();
if (repository instanceof PgExperimentRepository) await repository.initialize();
const service = new ExperimentService(repository);
const json = (res: import("node:http").ServerResponse, status: number, body: unknown) => { res.writeHead(status, { "content-type": "application/json" }); res.end(JSON.stringify(body)); };

const server = createServer(async (req, res) => {
  if (req.url === "/live") return json(res, 200, { status: "live", service: "research-automation-service" });
  if (req.url === "/ready") return json(res, 200, { status: "ready", service: "research-automation-service", runner: "NOT_CONFIGURED", modelGateway: "NOT_CONFIGURED" });
  let raw = "";
  for await (const chunk of req) raw += chunk;
  try {
    if (req.method === "POST" && req.url === "/v1/experiments") {
      const result = await service.create(JSON.parse(raw));
      return json(res, result.existing ? 200 : 202, result.experiment);
    }
    const match = req.url?.match(/^\/v1\/experiments\/([^/]+)(\/cancel)?$/);
    if (match && req.method === "GET" && !match[2]) {
      const experiment = await service.get(match[1]);
      return experiment ? json(res, 200, experiment) : json(res, 404, { error: "experiment not found" });
    }
    if (match && req.method === "POST" && match[2]) {
      const experiment = await service.cancel(match[1]);
      return experiment ? json(res, 200, experiment) : json(res, 404, { error: "experiment not found" });
    }
    return json(res, 404, { error: "not found" });
  } catch (error) {
    return json(res, 422, { error: error instanceof Error ? error.message : "invalid request", traceId: randomUUID() });
  }
});

server.listen(port, process.env.STOCKQUANT_BIND_HOST ?? "127.0.0.1");
