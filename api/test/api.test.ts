import "reflect-metadata";
import { test } from "node:test";
import assert from "node:assert/strict";
import { Test } from "@nestjs/testing";
import request from "supertest";
import { AppModule } from "../src/app.module";
import { configure } from "../src/setup";

async function app() {
  const mod = await Test.createTestingModule({ imports: [AppModule] }).compile();
  const a = configure(mod.createNestApplication());
  await a.init();
  return a;
}

test("quotes price a build on the server", async () => {
  const a = await app();
  const r = await request(a.getHttpServer()).post("/quotes").send({ case: "rosegold", dial: "blued", strap: "cognac", engraving: "For Lina" }).expect(200);
  assert.equal(r.body.price, 18900 + 300 + 0 + 150);
  assert.deepEqual(r.body.leadWeeks, [14, 18]);
  await a.close();
});

test("unknown options and stray fields are refused", async () => {
  const a = await app();
  await request(a.getHttpServer()).post("/quotes").send({ case: "platinum", dial: "ink", strap: "black" }).expect(400);
  await request(a.getHttpServer()).post("/quotes").send({ case: "steel", dial: "ink", strap: "black", price: 1 }).expect(400);
  await request(a.getHttpServer()).post("/quotes").send({ case: "steel", dial: "ink", strap: "black", engraving: "<script>" }).expect(400);
  await a.close();
});

test("a reservation is priced by the server and can be looked up without exposing the email", async () => {
  const a = await app();
  const s = a.getHttpServer();
  const r = await request(s)
    .post("/reservations")
    .send({ build: { case: "steel", dial: "ink", strap: "black", engraving: "" }, name: "Lina Haddad", email: "Lina@Example.com" })
    .expect(201);
  assert.match(r.body.reference, /^Q01-[2-9A-HJ-NP-Z]{3}-[2-9A-HJ-NP-Z]{3}$/);
  assert.equal(r.body.price, 6400);
  const g = await request(s).get(`/reservations/${r.body.reference}`).expect(200);
  assert.equal(g.body.name, "Lina");
  assert.equal(g.body.email, undefined);
  await request(s).get("/reservations/Q01-AAA-AAA").expect(404);
  await a.close();
});

test("reservations are rate limited", async () => {
  const a = await app();
  const s = a.getHttpServer();
  const body = { build: { case: "steel", dial: "ink", strap: "black" }, name: "Test Person", email: "t@example.com" };
  const codes: number[] = [];
  for (let i = 0; i < 7; i++) codes.push((await request(s).post("/reservations").send(body)).status);
  assert.deepEqual(codes.slice(0, 5), [201, 201, 201, 201, 201]);
  assert.equal(codes[6], 429);
  await a.close();
});
