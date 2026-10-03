import { eq } from "drizzle-orm";
import { db, civicCasesTable, usersTable } from "@workspace/db";
import { hashPassword } from "./auth";

const demoUsers = [
  { name: "Demo Citizen", email: "citizen@demo.com", password: "citizen123", role: "citizen" },
  { name: "Demo Employee", email: "employee@demo.com", password: "employee123", role: "employee" },
  { name: "Demo Administrator", email: "admin@demo.com", password: "admin123", role: "admin" },
] as const;

export async function seedDemoData(): Promise<void> {
  for (const demoUser of demoUsers) {
    const [existing] = await db
      .select({ id: usersTable.id })
      .from(usersTable)
      .where(eq(usersTable.email, demoUser.email))
      .limit(1);
    if (!existing) {
      await db.insert(usersTable).values({
        name: demoUser.name,
        email: demoUser.email,
        passwordHash: hashPassword(demoUser.password),
        role: demoUser.role,
      });
    }
  }

  const sampleCases = [
    {
      caseNumber: "P-1024",
      title: "Large pothole near Central Market",
      description: "Road damage on the Sector 14 market approach, creating risk for two-wheelers.",
      category: "Potholes & Road Damage",
      subcategory: "Large Road Pothole",
      latitude: 30.7415,
      longitude: 76.7681,
      address: "Sector 14, Central Market (demo location)",
      department: "Roads & Infrastructure",
      priorityScore: 87,
      priorityLevel: "CRITICAL",
      status: "In Progress",
      reportCount: 47,
      affectedPopulation: 320,
    },
    {
      caseNumber: "T-2088",
      title: "Traffic signal timing issue",
      description: "Signal cycle is causing long queues at the main crossing.",
      category: "Traffic Signal Issue",
      subcategory: "Signal timing",
      latitude: 30.7441,
      longitude: 76.7712,
      address: "Sector 14, Main Crossing (demo location)",
      department: "Traffic / Transport",
      priorityScore: 72,
      priorityLevel: "HIGH",
      status: "Pending Approval",
      reportCount: 11,
      affectedPopulation: 140,
    },
    {
      caseNumber: "W-0314",
      title: "Overflowing waste collection point",
      description: "A collection point is overflowing beside a busy walking route.",
      category: "Waste Management",
      subcategory: "Overflowing collection point",
      latitude: 30.7394,
      longitude: 76.7648,
      address: "Sector 14, Community Lane (demo location)",
      department: "Waste Management",
      priorityScore: 54,
      priorityLevel: "MEDIUM",
      status: "Resolved",
      reportCount: 8,
      affectedPopulation: 65,
    },
  ];

  for (const sampleCase of sampleCases) {
    const [existing] = await db
      .select({ id: civicCasesTable.id })
      .from(civicCasesTable)
      .where(eq(civicCasesTable.caseNumber, sampleCase.caseNumber))
      .limit(1);
    if (!existing) {
      await db.insert(civicCasesTable).values(sampleCase);
    }
  }
}