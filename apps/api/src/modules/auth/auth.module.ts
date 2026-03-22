import { Module } from "@nestjs/common";
import { AuthController } from "@/modules/auth/auth.controller";

@Module({
  controllers: [AuthController],
})
export class AuthApiModule {}
