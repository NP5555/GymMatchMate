import { pgTable, text, serial, integer, boolean, jsonb, timestamp, real, primaryKey } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { relations } from "drizzle-orm";
import { z } from "zod";

// User schema
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  password: text("password"),  // Allow null for OAuth users
  name: text("name").notNull(),
  email: text("email"),
  googleId: text("google_id").unique(),
  googleProfile: jsonb("google_profile"),
  age: integer("age"),
  gender: text("gender"),
  fitnessGoals: text("fitness_goals").array().default([]),
  bodyMeasurements: jsonb("body_measurements"),
  profilePic: text("profile_pic"),
  progressPhotos: text("progress_photos").array().default([]),
  gymPreferences: text("gym_preferences").array().default([]),
  isAdmin: boolean("is_admin").default(false),
  isBanned: boolean("is_banned").default(false),
  status: text("status").default("active"),
  createdAt: timestamp("created_at").defaultNow()
});

// Gyms schema
export const gyms = pgTable("gyms", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  location: jsonb("location").notNull(),
  images: text("images").array(),
  amenities: text("amenities").array(),
  rating: real("rating"),
  addedBy: integer("added_by"),
  createdAt: timestamp("created_at").defaultNow()
});

// Saved Gyms schema
export const savedGyms = pgTable("saved_gyms", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id, { onDelete: 'cascade' }),
  gymId: integer("gym_id").notNull().references(() => gyms.id, { onDelete: 'cascade' }),
  matchScore: integer("match_score"),
  savedAt: timestamp("saved_at").defaultNow()
});

// User Matches schema (for connecting users)
export const userMatches = pgTable("user_matches", {
  id: serial("id").primaryKey(),
  senderId: integer("sender_id").notNull().references(() => users.id, { onDelete: 'cascade' }),
  receiverId: integer("receiver_id").notNull().references(() => users.id, { onDelete: 'cascade' }),
  status: text("status").notNull().default("pending"), // pending, accepted, rejected
  matchScore: integer("match_score"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow()
});

// Messages schema
export const messages = pgTable("messages", {
  id: serial("id").primaryKey(),
  senderId: integer("sender_id").notNull().references(() => users.id, { onDelete: 'cascade' }),
  receiverId: integer("receiver_id").notNull().references(() => users.id, { onDelete: 'cascade' }),
  content: text("content").notNull(),
  read: boolean("read").default(false),
  createdAt: timestamp("created_at").defaultNow()
});

// Relations
export const usersRelations = relations(users, ({ many }) => ({
  savedGyms: many(savedGyms),
  sentMatches: many(userMatches, { relationName: "sender" }),
  receivedMatches: many(userMatches, { relationName: "receiver" }),
  sentMessages: many(messages, { relationName: "sender" }),
  receivedMessages: many(messages, { relationName: "receiver" }),
}));

export const gymsRelations = relations(gyms, ({ many, one }) => ({
  savedGyms: many(savedGyms),
  addedByUser: one(users, {
    fields: [gyms.addedBy],
    references: [users.id],
  }),
}));

export const savedGymsRelations = relations(savedGyms, ({ one }) => ({
  user: one(users, {
    fields: [savedGyms.userId],
    references: [users.id],
  }),
  gym: one(gyms, {
    fields: [savedGyms.gymId],
    references: [gyms.id],
  }),
}));

export const userMatchesRelations = relations(userMatches, ({ one }) => ({
  sender: one(users, {
    fields: [userMatches.senderId],
    references: [users.id],
    relationName: "sender"
  }),
  receiver: one(users, {
    fields: [userMatches.receiverId],
    references: [users.id],
    relationName: "receiver"
  }),
}));

export const messagesRelations = relations(messages, ({ one }) => ({
  sender: one(users, {
    fields: [messages.senderId],
    references: [users.id],
    relationName: "sender"
  }),
  receiver: one(users, {
    fields: [messages.receiverId],
    references: [users.id],
    relationName: "receiver"
  }),
}));

// Insert schemas for validation
export const insertUserSchema = createInsertSchema(users).omit({
  id: true,
  isAdmin: true,
  createdAt: true
});

export const insertGymSchema = createInsertSchema(gyms).omit({
  id: true,
  createdAt: true
});

export const insertSavedGymSchema = createInsertSchema(savedGyms).omit({
  id: true,
  savedAt: true
});

export const insertUserMatchSchema = createInsertSchema(userMatches).omit({
  id: true,
  status: true,
  createdAt: true,
  updatedAt: true
});

export const insertMessageSchema = createInsertSchema(messages).omit({
  id: true,
  read: true,
  createdAt: true
});

// Define types
export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;
export type Gym = typeof gyms.$inferSelect;
export type InsertGym = z.infer<typeof insertGymSchema>;
export type SavedGym = typeof savedGyms.$inferSelect;
export type InsertSavedGym = z.infer<typeof insertSavedGymSchema>;
export type UserMatch = typeof userMatches.$inferSelect;
export type InsertUserMatch = z.infer<typeof insertUserMatchSchema>;
export type Message = typeof messages.$inferSelect;
export type InsertMessage = z.infer<typeof insertMessageSchema>;

// Extended types for frontend
export const loginSchema = z.object({
  username: z.string().min(1, "Username is required"),
  password: z.string().min(1, "Password is required")
});

export type LoginData = z.infer<typeof loginSchema>;

export const registerSchema = insertUserSchema.pick({
  username: true,
  password: true,
  name: true
}).extend({
  password: z.string().min(6, "Password must be at least 6 characters")
});

export type RegisterData = z.infer<typeof registerSchema>;