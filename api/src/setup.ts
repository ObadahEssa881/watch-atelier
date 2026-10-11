import { ValidationPipe, type INestApplication, type Type } from "@nestjs/common";
import { DocumentBuilder, SwaggerModule } from "@nestjs/swagger";

/**
 * Validation that names its DTO. Nest's global ValidationPipe finds the DTO
 * class through TypeScript decorator metadata, which esbuild-style compilers
 * (tsx, many serverless bundlers) do not emit — the pipe then validates
 * nothing and lets everything through. Naming the type makes it hold anywhere.
 */
export const validated = (expectedType: Type) => new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true, expectedType });

/** Shared by main.ts and the tests, so they run the same app. */
export function configure(app: INestApplication) {
  const origins = (process.env.WEB_ORIGIN ?? "").split(",").map((s) => s.trim()).filter(Boolean);
  app.enableCors({ origin: origins.length ? origins : true, methods: ["GET", "POST"] });
  const doc = SwaggerModule.createDocument(
    app,
    new DocumentBuilder().setTitle("Qasioun atelier API").setDescription("Catalogue, quotes and reservations for the Q-01.").setVersion("1.0").build(),
  );
  SwaggerModule.setup("docs", app, doc);
  return app;
}
