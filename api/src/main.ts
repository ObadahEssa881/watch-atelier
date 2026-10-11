import "reflect-metadata";
import { NestFactory } from "@nestjs/core";
import { AppModule } from "./app.module";
import { configure } from "./setup";

async function bootstrap() {
  const app = configure(await NestFactory.create(AppModule));
  await app.listen(process.env.PORT ?? 3001);
}
void bootstrap();
