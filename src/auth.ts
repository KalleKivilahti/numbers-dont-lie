import NextAuth from "next-auth";
import { PrismaAdapter } from "@auth/prisma-adapter";
import Credentials from "next-auth/providers/credentials";
import GitHub from "next-auth/providers/github";
import Google from "next-auth/providers/google";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { validateTotpToken } from "@/lib/totp-utils";
import type { NextAuthConfig } from "next-auth";

const providers: NextAuthConfig["providers"] = [];

if (process.env.AUTH_GOOGLE_ID && process.env.AUTH_GOOGLE_SECRET) {
  providers.push(
    Google({
      clientId: process.env.AUTH_GOOGLE_ID,
      clientSecret: process.env.AUTH_GOOGLE_SECRET,
      allowDangerousEmailAccountLinking: true,
    })
  );
}

if (process.env.AUTH_GITHUB_ID && process.env.AUTH_GITHUB_SECRET) {
  providers.push(
    GitHub({
      clientId: process.env.AUTH_GITHUB_ID,
      clientSecret: process.env.AUTH_GITHUB_SECRET,
      allowDangerousEmailAccountLinking: true,
    })
  );
}

providers.push(
  Credentials({
    name: "Email",
    credentials: {
      email: { label: "Email", type: "email" },
      password: { label: "Password", type: "password" },
      totp: { label: "Authenticator code", type: "text" },
    },
    async authorize(credentials) {
      const email = credentials?.email as string | undefined;
      const password = credentials?.password as string | undefined;
      const totp = credentials?.totp as string | undefined;
      if (!email || !password) return null;

      const user = await prisma.user.findUnique({
        where: { email: email.toLowerCase() },
      });
      if (!user?.passwordHash) return null;

      const ok = await bcrypt.compare(password, user.passwordHash);
      if (!ok) return null;

      if (!user.emailVerified) {
        throw new Error("Verify your email before signing in.");
      }

      if (user.twoFactorEnabled && user.twoFactorSecret) {
        if (!validateTotpToken(user.twoFactorSecret, totp ?? "")) {
          throw new Error("Invalid authenticator code.");
        }
      }

      return {
        id: user.id,
        email: user.email,
        name: user.name,
        image: user.image,
        emailVerified: user.emailVerified,
      };
    },
  })
);

export const authConfig: NextAuthConfig = {
  adapter: PrismaAdapter(prisma) as NextAuthConfig["adapter"],
  session: {
    strategy: "jwt",
    /** Access-ish session lifetime (JWT). Refresh via Auth.js session update + refresh-token API issues HS256 access JWTs. */
    maxAge: 15 * 60,
    updateAge: 5 * 60,
  },
  trustHost: true,
  providers,
  callbacks: {
    async signIn({ user, account }) {
      if (account?.provider && account.provider !== "credentials" && user?.id) {
        await prisma.user.updateMany({
          where: { id: user.id, emailVerified: null },
          data: { emailVerified: new Date() },
        });
      }
      return true;
    },
    async jwt({ token, user, account, trigger, session }) {
      if (user?.id) {
        token.sub = user.id;
        const dbUser = await prisma.user.findUnique({
          where: { id: user.id },
          select: { emailVerified: true, twoFactorEnabled: true },
        });
        token.emailVerified = dbUser?.emailVerified ?? null;
        token.twoFactorEnabled = dbUser?.twoFactorEnabled ?? false;

        const nowSec = Math.floor(Date.now() / 1000);
        const provider = account?.provider;
        const oauthSignIn = provider === "google" || provider === "github";
        const credentialSignIn = provider === "credentials";

        if (!token.twoFactorEnabled) {
          token.sensitiveStepUpAt = nowSec;
        } else if (credentialSignIn) {
          token.sensitiveStepUpAt = nowSec;
        } else if (oauthSignIn) {
          delete token.sensitiveStepUpAt;
        } else {
          token.sensitiveStepUpAt = nowSec;
        }
      }

      if (trigger === "update" && session) {
        const s = session as {
          sensitiveStepUpVerified?: boolean;
          twoFactorEnabled?: boolean;
          user?: { name?: string | null };
        };
        if (s.sensitiveStepUpVerified === true) {
          token.sensitiveStepUpAt = Math.floor(Date.now() / 1000);
        }
        if (typeof s.twoFactorEnabled === "boolean") {
          token.twoFactorEnabled = s.twoFactorEnabled;
          if (!s.twoFactorEnabled) {
            token.sensitiveStepUpAt = Math.floor(Date.now() / 1000);
          }
        }
        if (s.user?.name != null) {
          token.name = s.user.name;
        }
      }

      return token;
    },
    async session({ session, token }) {
      if (session.user && token.sub) {
        session.user.id = token.sub;
        const ev = token.emailVerified;
        session.user.emailVerified =
          ev != null ? new Date(ev as string | number | Date) : null;
        session.user.twoFactorEnabled = Boolean(token.twoFactorEnabled);
        session.user.sensitiveStepUpOk =
          !session.user.twoFactorEnabled || Boolean(token.sensitiveStepUpAt);
      }
      return session;
    },
  },
  pages: {
    signIn: "/login",
    error: "/login",
  },
};

export const { handlers, auth, signIn, signOut } = NextAuth(authConfig);
