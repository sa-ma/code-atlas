import { Module } from "@nestjs/common";
import { AuthModule } from "@thallesp/nestjs-better-auth";
import { ConfigModule } from "@nestjs/config";
import { loadEnv } from "@/config/env";
import { auth } from "@/lib/auth";
import { AnalysisModule } from "@/modules/analysis/analysis.module";
import { AuthApiModule } from "@/modules/auth/auth.module";
import { HealthModule } from "@/modules/health/health.module";
import { PrismaModule } from "@/modules/prisma/prisma.module";
import { SavedAnalysesModule } from "@/modules/saved-analyses/saved-analyses.module";

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      validate: loadEnv,
    }),
    AuthModule.forRoot({
      auth,
      bodyParser: {
        json: { limit: "2mb" },
        urlencoded: { limit: "2mb", extended: true },
      },
    }),
    PrismaModule,
    AuthApiModule,
    AnalysisModule,
    SavedAnalysesModule,
    HealthModule,
  ],
})
export class AppModule {}
