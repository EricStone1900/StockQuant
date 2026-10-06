import { BadRequestException, Body, ConflictException, Controller, ForbiddenException, Get, Headers, HttpCode, Injectable, Module, NotFoundException, Param, Post, ServiceUnavailableException, UnauthorizedException } from "@nestjs/common";
import { Pool } from "pg";
import { authorizePortfolioRequest, loadPortfolioCredentials } from "../application/service-auth.js";
import { AccountService } from "../application/account-service.js";
import { PostgresAccountRepository } from "../adapters/postgres-account-repository.js";
import type { CorrectFillFeeCommand, InitializeAccountCommand, RecordFillCommand, ReserveResourceCommand } from "../domain/account.js";
import { canonicalInitialCash, isSimulationModeAllowed } from "../domain/v11-policy.js";

function assertService(serviceId: string | undefined, authorization: string | undefined, method: string, path: string): void {
  const result = authorizePortfolioRequest({ callerId: serviceId, authorization, method, path, credentials: loadPortfolioCredentials(process.env) });
  if (result === "NOT_CONFIGURED") throw new ServiceUnavailableException("calling service bearer credential is not configured");
  if (result === "UNAUTHENTICATED") throw new UnauthorizedException("valid service bearer credential is required");
  if (result === "FORBIDDEN") throw new ForbiddenException("service identity is not allowed for this route");
}

@Injectable()
export class PortfolioContainer {
  readonly pool = new Pool({ connectionString: process.env.STOCKQUANT_DATABASE_URL });
  readonly repository = new PostgresAccountRepository(this.pool);
  readonly accounts = new AccountService(this.repository);

  async ready(): Promise<void> {
    const credentials = loadPortfolioCredentials(process.env);
    const requiredCredentials = [credentials["platform-api-service"], credentials["trade-execution-service"], credentials["historical-replay-worker"]];
    if (requiredCredentials.some((credential) => !credential || credential.length < 32)) throw new Error("required caller bearer credentials are not configured");
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
  async initialize(@Headers("x-stockquant-service-id") serviceId: string | undefined, @Headers("authorization") authorization: string | undefined, @Body() command: InitializeAccountCommand) {
    assertService(serviceId, authorization, "POST", "/internal/v1/accounts/initialize");
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
    @Headers("authorization") authorization: string | undefined,
    @Param("accountId") accountId: string,
    @Body() body: Omit<RecordFillCommand, "accountId">
  ) {
    assertService(serviceId, authorization, "POST", `/internal/v1/accounts/${accountId}/fills`);
    try { return await this.container.accounts.recordFill({ ...body, accountId }); }
    catch (error) {
      if (error instanceof Error && error.message === "ACCOUNT_NOT_FOUND") throw new NotFoundException("account was not found in namespace");
      if (error instanceof Error && ["FILL_RESERVATION_SCOPE_MISMATCH", "PAPER_FILL_REQUIRES_RESERVATION"].includes(error.message)) throw new ForbiddenException(error.message);
      if (error instanceof Error && ["FILL_EXCEEDS_RESERVED_CASH", "FILL_EXCEEDS_RESERVED_QUANTITY", "FILL_EXCEEDS_AVAILABLE_POSITION", "FILL_IDEMPOTENCY_CONFLICT"].includes(error.message)) throw new ConflictException(error.message);
      if (error instanceof Error && (error.message.startsWith("invalid fill") || error.message.startsWith("FILL_CURRENCY") || error.message === "INVALID_FILL_SIDE")) throw new BadRequestException(error.message);
      throw error;
    }
  }

  @Post(":accountId/fills/:externalFillId/fee-corrections")
  @HttpCode(200)
  async correctFillFee(
    @Headers("x-stockquant-service-id") serviceId: string | undefined,
    @Headers("authorization") authorization: string | undefined,
    @Param("accountId") accountId: string,
    @Param("externalFillId") externalFillId: string,
    @Body() body: Omit<CorrectFillFeeCommand, "accountId" | "externalFillId">
  ) {
    const path = `/internal/v1/accounts/${accountId}/fills/${externalFillId}/fee-corrections`;
    assertService(serviceId, authorization, "POST", path);
    try { return await this.container.accounts.correctFillFee({ ...body, accountId, externalFillId }); }
    catch (error) {
      if (error instanceof Error && error.message === "ACCOUNT_NOT_FOUND") throw new NotFoundException("account was not found");
      if (error instanceof Error && error.message === "FILL_NOT_FOUND") throw new NotFoundException("fill was not found in account");
      if (error instanceof Error && error.message.startsWith("INVALID_")) throw new BadRequestException(error.message);
      if (error instanceof Error && error.message.startsWith("FEE_CORRECTION_")) throw new ConflictException(error.message);
      throw error;
    }
  }

  @Post(":accountId/reservations")
  async reserveResource(
    @Headers("x-stockquant-service-id") serviceId: string | undefined,
    @Headers("authorization") authorization: string | undefined,
    @Param("accountId") accountId: string,
    @Body() body: Omit<ReserveResourceCommand, "accountId">
  ) {
    assertService(serviceId, authorization, "POST", `/internal/v1/accounts/${accountId}/reservations`);
    try { return await this.container.accounts.reserveResource({ ...body, accountId }); }
    catch (error) {
      if (error instanceof Error && error.message.startsWith("INVALID_")) throw new BadRequestException(error.message);
      if (error instanceof Error && ["ACCOUNT_SCOPE_MISMATCH", "RESERVATION_REQUIRES_PAPER_FAKE", "RESERVATION_CURRENCY_MISMATCH"].includes(error.message)) throw new ForbiddenException(error.message);
      if (error instanceof Error && ["INSUFFICIENT_AVAILABLE_CASH", "INSUFFICIENT_SELLABLE_QUANTITY", "RESERVATION_IDEMPOTENCY_CONFLICT"].includes(error.message)) throw new ConflictException(error.message);
      throw error;
    }
  }

  @Post(":accountId/reservations/:reservationId/resolve")
  @HttpCode(200)
  async resolveReservation(
    @Headers("x-stockquant-service-id") serviceId: string | undefined,
    @Headers("authorization") authorization: string | undefined,
    @Param("accountId") accountId: string,
    @Param("reservationId") reservationId: string,
    @Body() body: { namespace: string; testRunId: string; ownerId: string; outcome: "FILLED" | "CANCELLED" | "REJECTED" | "EXPIRED" | "UNKNOWN"; evidenceRef: string }
  ) {
    assertService(serviceId, authorization, "POST", `/internal/v1/accounts/${accountId}/reservations/${reservationId}/resolve`);
    try {
      const reservation = await this.container.accounts.resolveReservation({ ...body, accountId, reservationId });
      if (!reservation) throw new NotFoundException("reservation was not found");
      return reservation;
    } catch (error) {
      if (error instanceof Error && error.message.startsWith("INVALID_") || error instanceof Error && error.message === "RESOLUTION_EVIDENCE_REQUIRED") throw new BadRequestException(error.message);
      if (error instanceof Error && error.message === "ACCOUNT_SCOPE_MISMATCH") throw new ForbiddenException(error.message);
      if (error instanceof Error && ["RESERVATION_ALREADY_RESOLVED", "RESERVATION_FILL_REQUIRED"].includes(error.message)) throw new ConflictException(error.message);
      throw error;
    }
  }

  @Get(":accountId/snapshot")
  async snapshot(
    @Headers("x-stockquant-service-id") serviceId: string | undefined,
    @Headers("authorization") authorization: string | undefined,
    @Headers("x-stockquant-owner-id") ownerId: string | undefined,
    @Param("accountId") accountId: string
  ) {
    assertService(serviceId, authorization, "GET", `/internal/v1/accounts/${accountId}/snapshot`);
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
  injectFillFailures(@Headers("x-stockquant-service-id") serviceId: string | undefined, @Headers("authorization") authorization: string | undefined, @Body() body: { failures?: number }) {
    assertService(serviceId, authorization, "POST", "/internal/v1/faults/fill");
    return { failuresRemaining: this.container.accounts.injectFillFailures(Number(body.failures ?? 0)) };
  }
}

@Module({ controllers: [HealthController, AccountController, FaultController], providers: [PortfolioContainer] })
export class AppModule {}
