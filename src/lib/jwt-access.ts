import { SignJWT } from "jose";

const ACCESS_SECONDS = 15 * 60;

export async function signAccessToken(userId: string): Promise<{
  accessToken: string;
  expiresIn: number;
}> {
  const secret = process.env.NEXTAUTH_SECRET;
  if (!secret) {
    throw new Error("NEXTAUTH_SECRET is required for access tokens");
  }
  const key = new TextEncoder().encode(secret);
  const accessToken = await new SignJWT({
    sub: userId,
    typ: "access",
  })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${ACCESS_SECONDS}s`)
    .sign(key);

  return { accessToken, expiresIn: ACCESS_SECONDS };
}
