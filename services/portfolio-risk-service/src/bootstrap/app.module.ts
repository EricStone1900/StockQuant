import { Body, ConflictException, Controller, ForbiddenException, Get, Headers, Injectable, Module, NotFoundException, Param, Post, ServiceUnavailableException } from "@nestjs/common";
import { Pool } from "pg";
import { AccountService } from "../application/account-service.js";
import { PostgresAccountRepository } from "../adapters/postgres-account-repository.js";
import type { InitializeAccountCommand, RecordFillCommand } from "../domain/account.js";
import { canonicalInitialCash, isSimulationModeAllowed } from "../domain/v11-policy.js";

const allowedServiceIds = (process.env.STOCKQUANT_ALLOWED_SERVICE_ID ?? "platform-api-service").split(",").map((item) => item.trim());

function assertService(serviceId: string | undefined): void {
  if (!serviceId || !allowedServiceIds.includes(serviceId)) throw new ForbiddenException("service identity is not allowed");
}

@Injectable()
export class PortfolioContainer {
  readonly pool = new Pool({ connectionString: process.env.STOCKQUANT_DATABASE_URL });
  readonly repository = new PostgresAccountRepository(this.pool);
  readonly accounts = new AccountService(this.repository);

  async ready(): Promise<void> {
    await this.pool.query("SELECT 1");
  }
}

@Controller()
export class HealthController {
  constructor(private readonly container: PortfolioContainer) {}

  @Get("live")
  live() {
    return { status: "live", service: "portfolio-risk-service" };
  }

  @Get("ready")
  async ready() {
    try {
      await this.container.ready();
      return { status: "ready", service: "portfolio-risk-service", brokerMode: "FAKE" };
    } catch {
      throw new ServiceUnavailableException("database is unavailable");
    }
  }
}

@Controller("internal/v1/accounts")
export class AccountController {
  constructor(private readonly container: PortfolioContainer) {}


  @Post("initialize")
  async initialize(@Headers("x-stockquant-service-id") serviceId: string | undefined, @Body() command: InitializeAccountCommand) {
    assertService(serviceId);
    if (!isSimulationModeAllowed(command.environmentMode, command.brokerMode, "false")) {
      throw new ForbiddenException("only simulated FAKE broker mode is allowed");
    }
    command.initialCash.amount = canonicalInitialCash(command.initialCash.amount);
    try {
      return await this.container.accounts.initialize(command);
    } catch (error) {
      if (error instanceof Error && error.name === "IdempotencyConflict") {
        throw new ConflictException("same idempotency key has a different payload");
      }
      throw error;
    }
  }

  @Post(":accountId/fills")
  async recordFill(
    @Headers("x-stockquant-service-id") serviceId: string | undefined,
    @Param("accountId") accountId: string,
    @Body() body: Omit<RecordFillCommand, "accountId">
  ) {
    assertService(serviceId);
    try { return await this.container.accounts.recordFill({ ...body, accountId }); }
    catch (error) {
      if (error instanceof Error && error.message === "ACCOUNT_NOT_FOUND") throw new NotFoundException("account was not found in namespace");
      throw error;
    }
  }

  @Get(":accountId/snapshot")
  async snapshot(
    @Headers("x-stockquant-service-id") serviceId: string | undefined,
    @Headers("x-stockquant-owner-id") ownerId: string | undefined,
    @Param("accountId") accountId: string
  ) {
    assertService(serviceId);
    if (!ownerId) throw new ForbiddenException("owner scope is required");
    const snapshot = await this.container.accounts.snapshot(accountId, ownerId);
    if (!snapshot) {
      if (await this.container.accounts.accountExists(accountId)) {
        throw new ForbiddenException("account is outside owner scope");
      }
      throw new NotFoundException("account was not found");
    }
    return snapshot;
  }
}

@Controller("internal/v1/faults")
export class FaultController {
  constructor(private readonly container: PortfolioContainer) {}
  @Post("fill")
  injectFillFailures(@Headers("x-stockquant-service-id") serviceId: string | undefined, @Body() body: { failures?: number }) {
    assertService(serviceId);
    return { failuresRemaining: this.container.accounts.injectFillFailures(Number(body.failures ?? 0)) };
  }
}

@Module({ controllers: [HealthController, AccountController, FaultController], providers: [PortfolioContainer] })
export class AppModule {}
