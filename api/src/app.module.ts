import { Controller, Get, Module } from "@nestjs/common";
import { APP_GUARD } from "@nestjs/core";
import { ThrottlerGuard, ThrottlerModule } from "@nestjs/throttler";
import { ApiExcludeController } from "@nestjs/swagger";
import { CatalogueModule } from "./catalogue/catalogue.module";
import { ReservationsModule } from "./reservations/reservations.module";

@ApiExcludeController()
@Controller()
class HealthController {
  @Get()
  health() {
    return { service: "qasioun-api", status: "ok", docs: "/docs" };
  }
}

@Module({
  imports: [ThrottlerModule.forRoot([{ ttl: 60_000, limit: 120 }]), CatalogueModule, ReservationsModule],
  controllers: [HealthController],
  providers: [{ provide: APP_GUARD, useClass: ThrottlerGuard }],
})
export class AppModule {}
