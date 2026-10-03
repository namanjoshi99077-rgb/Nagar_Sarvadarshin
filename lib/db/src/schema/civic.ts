import {
  boolean,
  doublePrecision,
  index,
  integer,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";

export const usersTable = pgTable(
  "users",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    name: text("name").notNull(),
    email: text("email").notNull(),
    passwordHash: text("password_hash").notNull(),
    role: text("role").notNull().default("citizen"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [uniqueIndex("users_email_idx").on(table.email)],
);

export const civicCasesTable = pgTable(
  "civic_cases",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    caseNumber: text("case_number").notNull(),
    title: text("title").notNull(),
    description: text("description").notNull(),
    category: text("category").notNull(),
    subcategory: text("subcategory"),
    latitude: doublePrecision("latitude").notNull(),
    longitude: doublePrecision("longitude").notNull(),
    address: text("address").notNull(),
    department: text("department").notNull(),
    priorityScore: integer("priority_score").notNull().default(40),
    priorityLevel: text("priority_level").notNull().default("MEDIUM"),
    status: text("status").notNull().default("Pending Approval"),
    reportCount: integer("report_count").notNull().default(1),
    affectedPopulation: integer("affected_population").notNull().default(10),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("civic_cases_case_number_idx").on(table.caseNumber),
    index("civic_cases_created_at_idx").on(table.createdAt),
  ],
);

export const complaintsTable = pgTable(
  "complaints",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    civicCaseId: uuid("civic_case_id")
      .notNull()
      .references(() => civicCasesTable.id, { onDelete: "cascade" }),
    citizenId: uuid("citizen_id")
      .notNull()
      .references(() => usersTable.id, { onDelete: "cascade" }),
    title: text("title").notNull(),
    description: text("description").notNull(),
    category: text("category").notNull(),
    latitude: doublePrecision("latitude").notNull(),
    longitude: doublePrecision("longitude").notNull(),
    accuracy: doublePrecision("accuracy"),
    address: text("address").notNull(),
    imageData: text("image_data"),
    voiceTranscript: text("voice_transcript"),
    aiConfidence: integer("ai_confidence").notNull(),
    duplicateScore: integer("duplicate_score").notNull().default(0),
    isDuplicate: boolean("is_duplicate").notNull().default(false),
    isProtected: boolean("is_protected").notNull().default(false),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index("complaints_case_idx").on(table.civicCaseId)],
);

export const notificationsTable = pgTable(
  "notifications",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id")
      .notNull()
      .references(() => usersTable.id, { onDelete: "cascade" }),
    title: text("title").notNull(),
    message: text("message").notNull(),
    type: text("type").notNull().default("case_update"),
    isRead: boolean("is_read").notNull().default(false),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index("notifications_user_created_idx").on(table.userId, table.createdAt)],
);