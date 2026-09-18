import { ValidationPipe } from "@nestjs/common";
import { NestFactory } from "@nestjs/core";
import { AppModule } from "./app.module";

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  const configuredOrigins = (
    process.env.FRONTEND_ORIGIN ??
    "http://localhost:3003,http://192.168.0.103:3003"
  )
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean);

  const allowedOrigins = Array.from(
    new Set([
      ...configuredOrigins,

      // Local development
      "http://localhost:3000",
      "http://localhost:3003",
      "http://127.0.0.1:3000",
      "http://127.0.0.1:3003",

      // Network testing
      "http://192.168.0.103:3000",
      "http://192.168.0.103:3003",
    ]),
  );

  app.enableCors({
    origin: allowedOrigins,
    credentials: true,
  });

  app.useGlobalPipes(
    new ValidationPipe({
      transform: true,
      whitelist: true,
      forbidUnknownValues: true,
    }),
  );

  app.enableShutdownHooks();

  const port = process.env.PORT ? Number(process.env.PORT) : 3001;

  await app.listen(port);
}

void bootstrap();