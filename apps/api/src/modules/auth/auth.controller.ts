import { Controller, Get } from "@nestjs/common";
import { OptionalAuth, Session, type UserSession } from "@thallesp/nestjs-better-auth";
import type { SessionResponse } from "@code-atlas/shared";

@OptionalAuth()
@Controller("api")
export class AuthController {
  @Get("me")
  me(@Session() session: UserSession | null): SessionResponse {
    return {
      user: session?.user
        ? {
            id: session.user.id,
            email: session.user.email,
            name: session.user.name,
            image: session.user.image ?? null,
          }
        : null,
    };
  }
}
