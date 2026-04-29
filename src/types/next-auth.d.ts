import "next-auth";
import "next-auth/jwt";

declare module "next-auth" {
  interface Session {
    /** Passed to `update()` after successful `/api/auth/step-up` POST. */
    sensitiveStepUpVerified?: boolean;
    /** Passed to `update()` when toggling 2FA from settings so JWT stays in sync. */
    twoFactorEnabled?: boolean;
    user: {
      id: string;
      emailVerified?: Date | null;
      name?: string | null;
      email?: string | null;
      image?: string | null;
      /** Present when user has enabled TOTP in settings. */
      twoFactorEnabled?: boolean;
      /** False until OAuth users complete `/auth/step-up` TOTP for this session (credentials users set at login). */
      sensitiveStepUpOk?: boolean;
    };
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    emailVerified?: Date | null;
    twoFactorEnabled?: boolean;
    /** Unix seconds when sensitive routes may be accessed without another TOTP (OAuth step-up or credentials login). */
    sensitiveStepUpAt?: number;
  }
}
