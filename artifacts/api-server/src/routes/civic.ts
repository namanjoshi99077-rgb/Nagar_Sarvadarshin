import { and, desc, eq, sql } from "drizzle-orm";
import { Router, type IRouter } from "express";
import {
  GetCivicCaseParams,
  GetCivicCaseResponse,
  GetCivicCasesResponse,
  GetMapIssuesResponse,
  GetNotificationsResponse,
  MarkNotificationReadParams,
  MarkNotificationReadResponse,
  SubmitComplaintBody,
  SubmitComplaintResponse,
} from "@workspace/api-zod";
import { db, civicCasesTable, complaintsTable, notificationsTable } from "@workspace/db";
import { findAuthenticatedUser } from "../lib/auth";

const router: IRouter = Router();

type CaseRecord = typeof civicCasesTable.$inferSelect;
type CasePriority = "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
type ComplaintInput = ReturnType<typeof SubmitComplaintBody.parse>;

function toApiCase(row: CaseRecord) {
  return {
    id: row.id,
    caseNumber: row.caseNumber,
    title: row.title,
    description: row.description,
    category: row.category,
    subcategory: row.subcategory,
    latitude: row.latitude,
    longitude: row.longitude,
    address: row.address,
    department: row.department,
    priorityScore: row.priorityScore,
    priorityLevel: row.priorityLevel as CasePriority,
    status: row.status,
    reportCount: row.reportCount,
    affectedPopulation: row.affectedPopulation,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

function distanceMeters(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const radians = (degrees: number) => (degrees * Math.PI) / 180;
  const earthRadius = 6_371_000;
  const dLat = radians(lat2 - lat1);
  const dLon = radians(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(radians(lat1)) * Math.cos(radians(lat2)) * Math.sin(dLon / 2) ** 2;
  return earthRadius * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function wordSet(text: string): Set<string> {
  const ignored = new Set(["near", "there", "this", "that", "with", "from", "issue", "road"]);
  return new Set(
    text
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, " ")
      .split(/\s+/)
      .filter((word) => word.length > 2 && !ignored.has(word)),
  );
}

function overlapScore(left: string, right: string): number {
  const a = wordSet(left);
  const b = wordSet(right);
  if (a.size === 0 || b.size === 0) return 0;
  const intersection = [...a].filter((word) => b.has(word)).length;
  const union = new Set([...a, ...b]).size;
  return union === 0 ? 0 : intersection / union;
}

function departmentFor(category: string): string {
  if (category === "Potholes & Road Damage" || category === "Street & Public Infrastructure") {
    return "Roads & Infrastructure";
  }
  if (
    category === "Road Obstruction" ||
    category === "Illegal Parking" ||
    category === "Traffic Signal Issue"
  ) {
    return "Traffic / Transport";
  }
  if (category === "Bus Stop / Public Transport Issue") return "Transport Department";
  if (category === "Waste Management") return "Waste Management";
  if (category === "Water Supply & Pipeline") return "Water Supply";
  if (category === "Streetlight Issue") return "Public Works";
  if (category === "Noise Complaint") return "Civic Enforcement";
  if (category === "Bribe / Corruption Complaint") return "Vigilance / Authorized Officer";
  if (category === "Pedestrian Safety Hazard" || category === "Public Safety Hazard") {
    return "Public Safety";
  }
  return "Municipal Services";
}

function categorize(input: ComplaintInput): { category: string; subcategory: string } {
  const text = `${input.title} ${input.description} ${input.voiceTranscript ?? ""}`.toLowerCase();
  const explicit = input.category?.trim();
  if (explicit && explicit !== "Auto-detect") return { category: explicit, subcategory: explicit };
  if (/pothole|road damage|road hole|crater/.test(text)) {
    return { category: "Potholes & Road Damage", subcategory: "Road surface damage" };
  }
  if (/obstruct|blocked|debris|fallen tree/.test(text)) {
    return { category: "Road Obstruction", subcategory: "Travel-lane obstruction" };
  }
  if (/illegal park|parked|parking/.test(text)) {
    return { category: "Illegal Parking", subcategory: "Mobility obstruction" };
  }
  if (/signal|traffic light|traffic signal/.test(text)) {
    return { category: "Traffic Signal Issue", subcategory: "Signal malfunction" };
  }
  if (/bus stop|bus shelter|public transport/.test(text)) {
    return { category: "Bus Stop / Public Transport Issue", subcategory: "Transit infrastructure" };
  }
  if (/pedestrian|footpath|sidewalk|crosswalk/.test(text)) {
    return { category: "Pedestrian Safety Hazard", subcategory: "Pedestrian route hazard" };
  }
  if (/waste|garbage|rubbish|trash/.test(text)) {
    return { category: "Waste Management", subcategory: "Waste collection issue" };
  }
  if (/water|leak|pipe|pipeline/.test(text)) {
    return { category: "Water Supply & Pipeline", subcategory: "Water leak" };
  }
  if (/streetlight|street light|lamp/.test(text)) {
    return { category: "Streetlight Issue", subcategory: "Lighting outage" };
  }
  if (/noise|loud|sound/.test(text)) {
    return { category: "Noise Complaint", subcategory: "Noise disturbance" };
  }
  if (/bribe|corrupt/.test(text)) {
    return { category: "Bribe / Corruption Complaint", subcategory: "Protected report" };
  }
  if (/unsafe|danger|accident|injury/.test(text)) {
    return { category: "Public Safety Hazard", subcategory: "Public safety risk" };
  }
  return { category: "Street & Public Infrastructure", subcategory: "Infrastructure issue" };
}

function calculateAnalysis(
  input: ComplaintInput,
  category: string,
  subcategory: string,
  duplicateScore: number,
) {
  const text = `${input.title} ${input.description} ${input.voiceTranscript ?? ""}`.toLowerCase();
  const dangerous = /danger|accident|injur|blocked|large|critical|school|hospital/.test(text);
  const severity = dangerous ? "HIGH" : "MEDIUM";
  const priorityScore =
    category === "Potholes & Road Damage" && dangerous
      ? 87
      : Math.min(95, Math.max(42, 58 + (dangerous ? 16 : 0) + (duplicateScore > 65 ? 8 : 0)));
  const priorityLevel: CasePriority =
    priorityScore >= 81 ? "CRITICAL" : priorityScore >= 61 ? "HIGH" : priorityScore >= 31 ? "MEDIUM" : "LOW";
  return {
    category,
    subcategory,
    severity,
    confidence: category === "Potholes & Road Damage" ? 94 : 88,
    priorityScore,
    priorityLevel,
    department: departmentFor(category),
    duplicateScore,
    reason: dangerous
      ? "Prototype rules identified a safety risk on an active public route."
      : "Prototype rules matched the issue description to a municipal service category.",
  };
}

async function findDuplicate(input: ComplaintInput, category: string) {
  const nearbyCases = await db
    .select()
    .from(civicCasesTable)
    .where(eq(civicCasesTable.category, category))
    .orderBy(desc(civicCasesTable.createdAt))
    .limit(100);

  let best:
    | { civicCase: CaseRecord; score: number; distance: number; similarity: number }
    | undefined;
  for (const civicCase of nearbyCases) {
    if (civicCase.status === "Resolved") continue;
    const distance = distanceMeters(input.latitude, input.longitude, civicCase.latitude, civicCase.longitude);
    if (distance > 500) continue;
    const similarity = overlapScore(
      `${input.title} ${input.description} ${input.voiceTranscript ?? ""}`,
      `${civicCase.title} ${civicCase.description}`,
    );
    const proximity = Math.max(0, 1 - distance / 500) * 25;
    const semantic = 12 + similarity * 28;
    const time = Date.now() - civicCase.createdAt.getTime() < 14 * 24 * 60 * 60 * 1000 ? 10 : 2;
    const score = Math.min(99, Math.round(semantic + proximity + time));
    if (!best || score > best.score) best = { civicCase, score, distance, similarity };
  }
  return best;
}

router.get("/civic-cases", async (req, res): Promise<void> => {
  if (!(await findAuthenticatedUser(req))) {
    res.status(401).json({ error: "Authentication required." });
    return;
  }
  const rows = await db.select().from(civicCasesTable).orderBy(desc(civicCasesTable.createdAt)).limit(100);
  res.json(GetCivicCasesResponse.parse(rows.map(toApiCase)));
});

router.get("/civic-cases/:id", async (req, res): Promise<void> => {
  if (!(await findAuthenticatedUser(req))) {
    res.status(401).json({ error: "Authentication required." });
    return;
  }
  const params = GetCivicCaseParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const [row] = await db
    .select()
    .from(civicCasesTable)
    .where(eq(civicCasesTable.id, params.data.id))
    .limit(1);
  if (!row) {
    res.status(404).json({ error: "Civic case not found." });
    return;
  }
  res.json(GetCivicCaseResponse.parse(toApiCase(row)));
});

router.get("/map/issues", async (req, res): Promise<void> => {
  if (!(await findAuthenticatedUser(req))) {
    res.status(401).json({ error: "Authentication required." });
    return;
  }
  const rows = await db.select().from(civicCasesTable).orderBy(desc(civicCasesTable.createdAt)).limit(100);
  res.json(GetMapIssuesResponse.parse(rows.map(toApiCase)));
});

router.post("/complaints", async (req, res): Promise<void> => {
  const user = await findAuthenticatedUser(req);
  if (!user) {
    res.status(401).json({ error: "Authentication required." });
    return;
  }
  if (user.role !== "citizen") {
    res.status(403).json({ error: "This action is available to citizen accounts." });
    return;
  }
  const parsed = SubmitComplaintBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const input = parsed.data;
  const classification = categorize(input);
  const candidate = await findDuplicate(input, classification.category);
  const isPotentialDuplicate = Boolean(candidate && candidate.score >= 68);
  const analysis = calculateAnalysis(input, classification.category, classification.subcategory, candidate?.score ?? 0);

  if (isPotentialDuplicate && !input.duplicateAction) {
    res.status(200).json(
      SubmitComplaintResponse.parse({
        complaintId: null,
        civicCase: null,
        candidateCase: candidate ? toApiCase(candidate.civicCase) : null,
        awaitingDecision: true,
        isDuplicate: true,
        relatedReports: candidate?.civicCase.reportCount ?? 0,
        analysis,
      }),
    );
    return;
  }

  let chosenCase: CaseRecord | undefined;
  let isDuplicate = false;
  let submittedComplaintId: string | undefined;
  if (input.duplicateAction === "link") {
    if (!candidate || !input.linkCaseId || candidate.civicCase.id !== input.linkCaseId) {
      res.status(400).json({ error: "Select the nearby case suggested by the duplicate check." });
      return;
    }
    isDuplicate = true;
  }

  await db.transaction(async (tx) => {
    if (isDuplicate && input.linkCaseId) {
      const [updatedCase] = await tx
        .update(civicCasesTable)
        .set({
          reportCount: sql`${civicCasesTable.reportCount} + 1`,
          affectedPopulation: sql`${civicCasesTable.affectedPopulation} + 7`,
          priorityScore: Math.max(candidate?.civicCase.priorityScore ?? 0, analysis.priorityScore),
          priorityLevel: analysis.priorityLevel,
          updatedAt: new Date(),
        })
        .where(eq(civicCasesTable.id, input.linkCaseId))
        .returning();
      chosenCase = updatedCase;
    } else {
      const [createdCase] = await tx
        .insert(civicCasesTable)
        .values({
          caseNumber: `NS-${Date.now().toString(36).toUpperCase()}`,
          title: input.title,
          description: input.description,
          category: classification.category,
          subcategory: classification.subcategory,
          latitude: input.latitude,
          longitude: input.longitude,
          address: input.address,
          department: analysis.department,
          priorityScore: analysis.priorityScore,
          priorityLevel: analysis.priorityLevel,
          status: "Pending Approval",
          reportCount: 1,
          affectedPopulation: 10,
        })
        .returning();
      chosenCase = createdCase;
    }
    if (!chosenCase) throw new Error("Civic case could not be saved.");
    const [complaint] = await tx
      .insert(complaintsTable)
      .values({
        civicCaseId: chosenCase.id,
        citizenId: user.id,
        title: input.title,
        description: input.description,
        category: classification.category,
        latitude: input.latitude,
        longitude: input.longitude,
        accuracy: input.accuracy,
        address: input.address,
        imageData: input.imageData,
        voiceTranscript: input.voiceTranscript,
        aiConfidence: analysis.confidence,
        duplicateScore: candidate?.score ?? 0,
        isDuplicate,
        isProtected:
          input.isProtected === true || classification.category === "Bribe / Corruption Complaint",
      })
      .returning({ id: complaintsTable.id });
    submittedComplaintId = complaint?.id;
    await tx.insert(notificationsTable).values({
      userId: user.id,
      title: isDuplicate ? "Report linked to a Civic Case" : "Civic report submitted",
      message: isDuplicate
        ? `${chosenCase.caseNumber} now includes your report. One coordinated response is underway.`
        : `${chosenCase.caseNumber} is pending municipal review.`,
      type: "case_update",
    });
  });

  if (!chosenCase || !submittedComplaintId) {
    res.status(500).json({ error: "Civic case could not be saved." });
    return;
  }
  const result = {
    complaintId: submittedComplaintId,
    civicCase: toApiCase(chosenCase),
    candidateCase: isDuplicate && candidate ? toApiCase(candidate.civicCase) : null,
    awaitingDecision: false,
    isDuplicate,
    relatedReports: chosenCase.reportCount,
    analysis,
  };
  res.status(201).json(SubmitComplaintResponse.parse(result));
});

router.get("/notifications", async (req, res): Promise<void> => {
  const user = await findAuthenticatedUser(req);
  if (!user) {
    res.status(401).json({ error: "Authentication required." });
    return;
  }
  const rows = await db
    .select()
    .from(notificationsTable)
    .where(eq(notificationsTable.userId, user.id))
    .orderBy(desc(notificationsTable.createdAt))
    .limit(50);
  res.json(
    GetNotificationsResponse.parse(
      rows.map((item) => ({
        id: item.id,
        title: item.title,
        message: item.message,
        type: item.type,
        isRead: item.isRead,
        createdAt: item.createdAt.toISOString(),
      })),
    ),
  );
});

router.patch("/notifications/:id/read", async (req, res): Promise<void> => {
  const user = await findAuthenticatedUser(req);
  if (!user) {
    res.status(401).json({ error: "Authentication required." });
    return;
  }
  const params = MarkNotificationReadParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const [updated] = await db
    .update(notificationsTable)
    .set({ isRead: true })
    .where(and(eq(notificationsTable.id, params.data.id), eq(notificationsTable.userId, user.id)))
    .returning();
  if (!updated) {
    res.status(404).json({ error: "Notification not found." });
    return;
  }
  res.json(
    MarkNotificationReadResponse.parse({
      id: updated.id,
      title: updated.title,
      message: updated.message,
      type: updated.type,
      isRead: updated.isRead,
      createdAt: updated.createdAt.toISOString(),
    }),
  );
});

export default router;