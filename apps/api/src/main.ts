import "reflect-metadata";
import { Logger, ValidationPipe } from "@nestjs/common";
import { NestFactory } from "@nestjs/core";
import { FastifyAdapter, NestFastifyApplication } from "@nestjs/platform-fastify";
import cors from "@fastify/cors";
import { AppModule } from "@/app.module";
import { env } from "@/config/env";
import { validateGitHubToken } from "@/lib/server/github/github-client";

async function bootstrap() {
  await validateGitHubToken();

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
  Logger.log("GitHub token validated successfully", "Bootstrap");
}

void bootstrap().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : String(error);
  Logger.error(message, undefined, "Bootstrap");
  process.exit(1);
});
