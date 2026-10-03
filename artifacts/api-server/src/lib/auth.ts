import { createHmac, randomBytes, scryptSync, timingSafeEqual } from "node:crypto";
import type { Request } from "express";
import { eq } from "drizzle-orm";
import { db, usersTable } from "@workspace/db";

type UserRecord = typeof usersTable.$inferSelect;
type PublicUser = {
  id: string;
  name: string;
  email: string;
  role: "citizen" | "employee" | "admin";
};

function getSessionSecret(): string {
  const secret = process.env["SESSION_SECRET"];
  if (!secret) throw new Error("SESSION_SECRET is required for civic API sessions.");
  return secret;
}

export function toPublicUser(user: UserRecord): PublicUser {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role as PublicUser["role"],
  };
}

export function hashPassword(password: string): string {
  const salt = randomBytes(16);
  const derived = scryptSync(password, salt, 64);
  return `${salt.toString("base64url")}.${derived.toString("base64url")}`;
}

export function verifyPassword(password: string, stored: string): boolean {
  const [saltPart, hashPart] = stored.split(".");
  if (!saltPart || !hashPart) return false;
  try {
    const salt = Buffer.from(saltPart, "base64url");
    const expected = Buffer.from(hashPart, "base64url");
    const actual = scryptSync(password, salt, expected.length);
    return expected.length === actual.length && timingSafeEqual(expected, actual);
  } catch {
    return false;
  }
}

export function signSessionToken(userId: string): string {
  const header = Buffer.from(JSON.stringify({ alg: "HS256", typ: "JWT" })).toString("base64url");
  const payload = Buffer.from(
    JSON.stringify({ sub: userId, exp: Math.floor(Date.now() / 1000) + 60 * 60 * 24 * 7 }),
  ).toString("base64url");
  const input = `${header}.${payload}`;
  const signature = createHmac("sha256", getSessionSecret()).update(input).digest("base64url");
  return `${input}.${signature}`;
}

function readTokenSubject(token: string): string | null {
  const parts = token.split(".");
  if (parts.length !== 3 || !parts[0] || !parts[1] || !parts[2]) return null;
  const input = `${parts[0]}.${parts[1]}`;
  const expected = createHmac("sha256", getSessionSecret()).update(input).digest();
  let provided: Buffer;
  try {
    provided = Buffer.from(parts[2], "base64url");
  } catch {
    return null;
  }
  if (expected.length !== provided.length || !timingSafeEqual(expected, provided)) return null;
  try {
    const payload = JSON.parse(Buffer.from(parts[1], "base64url").toString()) as {
      sub?: unknown;
      exp?: unknown;
    };
    if (
      typeof payload.sub !== "string" ||
      typeof payload.exp !== "number" ||
      payload.exp <= Math.floor(Date.now() / 1000)
    ) {
      return null;
    }
    return payload.sub;
  } catch {
    return null;
  }
}

export async function findAuthenticatedUser(req: Request): Promise<UserRecord | null> {
  const authorization = req.header("authorization");
  if (!authorization?.startsWith("Bearer ")) return null;
  const userId = readTokenSubject(authorization.slice(7));
  if (!userId) return null;
  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, userId)).limit(1);
  return user ?? null;
}