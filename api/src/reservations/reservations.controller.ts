import { Body, Controller, Get, Inject, Param, Post } from "@nestjs/common";
import { ApiCreatedResponse, ApiOperation, ApiTags, ApiTooManyRequestsResponse } from "@nestjs/swagger";
import { Throttle } from "@nestjs/throttler";
import { CreateReservationDto } from "./reservation.dto";
import { ReservationsService } from "./reservations.service";
import { validated } from "../setup";

@ApiTags("reservations")
@Controller("reservations")
export class ReservationsController {
  constructor(@Inject(ReservationsService) private readonly reservations: ReservationsService) {}

  @Post()
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  @ApiOperation({ summary: "Reserve a build. Priced on the server; nothing is charged." })
  @ApiCreatedResponse({ description: "The reservation reference, price and lead time" })
  @ApiTooManyRequestsResponse({ description: "More than five reservations a minute from one address" })
  create(@Body(validated(CreateReservationDto)) dto: CreateReservationDto) {
    const r = this.reservations.create(dto);
    return { reference: r.reference, price: r.price, leadWeeks: r.leadWeeks, createdAt: r.createdAt };
  }

  @Get(":reference")
  @ApiOperation({ summary: "Look up a reservation by its reference" })
  find(@Param("reference") reference: string) {
    return this.reservations.find(reference);
  }
}
