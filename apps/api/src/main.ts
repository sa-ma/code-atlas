import "reflect-metadata";
import { Logger, ValidationPipe } from "@nestjs/common";
import { NestFactory } from "@nestjs/core";
import { FastifyAdapter, NestFastifyApplication } from "@nestjs/platform-fastify";
import cors from "@fastify/cors";
import { AppModule } from "@/app.module";
import { env } from "@/config/env";

async function bootstrap() {
  const app = await NestFactory.create<NestFastifyApplication>(
    AppModule,
    new FastifyAdapter({
      logger: env.NODE_ENV === "development",
    }),
    {
      bodyParser: false,
    },
  );

  await app.register(cors, {
    origin: env.corsAllowedOrigins,
    credentials: true,
    methods: ["GET", "HEAD", "POST", "DELETE", "OPTIONS"],
  });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
    }),
  );

  await app.listen(env.PORT, "0.0.0.0");

  Logger.log(`API listening on ${env.BACKEND_PUBLIC_URL}`, "Bootstrap");
  Logger.log(`Better Auth base URL ${env.BETTER_AUTH_URL}`, "Bootstrap");
}

void bootstrap();
