import "reflect-metadata";
import { NestFactory } from "@nestjs/core";
import { AppModule, PortfolioContainer } from "./bootstrap/app.module.js";
import { isV11TradingModeAllowed } from "./domain/v11-policy.js";

async function bootstrap() {
  if (!isV11TradingModeAllowed("PAPER", process.env.STOCKQUANT_BROKER_MODE, process.env.STOCKQUANT_LIVE_TRADING_ENABLED)) {
    throw new Error("V1.1 refuses LIVE trading or non-FAKE broker mode");
  }
  const app = await NestFactory.create(AppModule, { logger: ["error", "warn", "log"] });
  const container = app.get(PortfolioContainer);
  await container.repository.migrate();
  await app.listen(Number(process.env.STOCKQUANT_PORT ?? 3001), process.env.STOCKQUANT_BIND_HOST ?? "127.0.0.1");
}

void bootstrap();
