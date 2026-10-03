import { Router, type IRouter } from "express";
import { eq } from "drizzle-orm";
import { db, usersTable } from "@workspace/db";
import { LoginBody, LoginResponse, RegisterBody, RegisterResponse, GetMeResponse } from "@workspace/api-zod";
import { findAuthenticatedUser, hashPassword, signSessionToken, toPublicUser, verifyPassword } from "../lib/auth";

const router: IRouter = Router();

router.post("/auth/login", async (req, res): Promise<void> => {
  const parsed = LoginBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const email = parsed.data.email.trim().toLowerCase();
  const [user] = await db.select().from(usersTable).where(eq(usersTable.email, email)).limit(1);
  if (!user || !verifyPassword(parsed.data.password, user.passwordHash)) {
    res.status(401).json({ error: "Email or password is incorrect." });
    return;
  }
  res.json(LoginResponse.parse({ token: signSessionToken(user.id), user: toPublicUser(user) }));
});

router.post("/auth/register", async (req, res): Promise<void> => {
  const parsed = RegisterBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const email = parsed.data.email.trim().toLowerCase();
  const [existing] = await db.select({ id: usersTable.id }).from(usersTable).where(eq(usersTable.email, email)).limit(1);
  if (existing) {
    res.status(409).json({ error: "An account with this email already exists." });
    return;
  }
  const [user] = await db
    .insert(usersTable)
    .values({
      name: parsed.data.name.trim(),
      email,
      passwordHash: hashPassword(parsed.data.password),
      role: "citizen",
    })
    .returning();
  if (!user) {
    res.status(500).json({ error: "Unable to create your account." });
    return;
  }
  res.status(201).json(RegisterResponse.parse({ token: signSessionToken(user.id), user: toPublicUser(user) }));
});

router.get("/auth/me", async (req, res): Promise<void> => {
  const user = await findAuthenticatedUser(req);
  if (!user) {
    res.status(401).json({ error: "Authentication required." });
    return;
  }
  res.json(GetMeResponse.parse(toPublicUser(user)));
});

export default router;