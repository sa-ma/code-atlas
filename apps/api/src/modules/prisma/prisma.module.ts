import { Global, Module } from "@nestjs/common";
import { PrismaClient } from "@prisma/client";
import { prisma } from "@/lib/prisma";

@Global()
@Module({
  providers: [
    {
      provide: PrismaClient,
      useValue: prisma,
    },
  ],
  exports: [PrismaClient],
})
export class PrismaModule {}
