import { Inject, Injectable, NotFoundException } from "@nestjs/common";
import { randomBytes } from "node:crypto";
import { CatalogueService } from "../catalogue/catalogue.service";
import type { CreateReservationDto } from "./reservation.dto";

export interface Reservation {
  reference: string;
  createdAt: string;
  build: CreateReservationDto["build"];
  name: string;
  email: string;
  city?: string;
  note?: string;
  price: number;
  leadWeeks: [number, number];
}

/**
 * Reservations, held in memory.
 *
 * Honest about its limits: this is a concept site, so there is no database;
 * on a serverless host each instance keeps its own short-lived list. To make
 * it permanent, replace `store` with a repository over Postgres (Prisma) —
 * the controller and the DTOs do not change.
 */
@Injectable()
export class ReservationsService {
  private readonly store = new Map<string, Reservation>();

  constructor(@Inject(CatalogueService) private readonly catalogue: CatalogueService) {}

  create(dto: CreateReservationDto): Reservation {
    const q = this.catalogue.quote(dto.build);
    // unambiguous characters only: no 0/O, 1/I
    const alphabet = "23456789ABCDEFGHJKLMNPQRSTUVWXYZ";
    const bytes = randomBytes(6);
    const code = Array.from(bytes, (b) => alphabet[b % alphabet.length]).join("");
    const r: Reservation = {
      reference: `Q01-${code.slice(0, 3)}-${code.slice(3)}`,
      createdAt: new Date().toISOString(),
      build: dto.build,
      name: dto.name.trim(),
      email: dto.email.trim().toLowerCase(),
      city: dto.city?.trim() || undefined,
      note: dto.note?.trim() || undefined,
      price: q.price,
      leadWeeks: q.leadWeeks,
    };
    this.store.set(r.reference, r);
    return r;
  }

  /** What a customer may see again with only the reference: no email, no note. */
  find(reference: string) {
    const r = this.store.get(reference.toUpperCase());
    if (!r) throw new NotFoundException(`No reservation ${reference}`);
    const { reference: ref, createdAt, build, price, leadWeeks, name } = r;
    return { reference: ref, createdAt, build, price, leadWeeks, name: name.split(" ")[0] };
  }
}
