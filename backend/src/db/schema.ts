import { date, int, mysqlEnum, mysqlTable, text, timestamp, varchar } from "drizzle-orm/mysql-core";
import { relations } from "drizzle-orm";

export const mediaTypes = mysqlTable("media_types", {
  id: int("id").primaryKey().autoincrement(),
  name: varchar("name", { length: 255 }).notNull().unique(),
  created_at: timestamp("created_at").notNull().defaultNow(),
});

export const mediaItems = mysqlTable("media_items", {
  id: int("id").primaryKey().autoincrement(),
  type_id: int("type_id").notNull(),
  title: varchar("title", { length: 255 }).notNull(),
  status: mysqlEnum("status", ["available", "borrowed", "lost"]).notNull().default("available"),
  borrowed_by: varchar("borrowed_by", { length: 255 }),
  borrowed_date: date("borrowed_date"),
  notes: text("notes"),
  cover_image: varchar("cover_image", { length: 500 }),
  created_at: timestamp("created_at").notNull().defaultNow(),
  updated_at: timestamp("updated_at").notNull().defaultNow().onUpdateNow(),
});

export const mediaAttributes = mysqlTable("media_attributes", {
  id: int("id").primaryKey().autoincrement(),
  media_id: int("media_id").notNull(),
  attribute_key: varchar("attribute_key", { length: 255 }).notNull(),
  attribute_value: text("attribute_value").$type<string>(), // Using text which maps to LONGTEXT in MySQL
});

// Relations
export const mediaTypesRelations = relations(mediaTypes, ({ many }) => ({
  mediaItems: many(mediaItems),
}));

export const mediaItemsRelations = relations(mediaItems, ({ one, many }) => ({
  type: one(mediaTypes, {
    fields: [mediaItems.type_id],
    references: [mediaTypes.id],
  }),
  attributes: many(mediaAttributes),
}));

export const mediaAttributesRelations = relations(mediaAttributes, ({ one }) => ({
  mediaItem: one(mediaItems, {
    fields: [mediaAttributes.media_id],
    references: [mediaItems.id],
  }),
}));

export const mediaTypeFields = mysqlTable("media_type_fields", {
  id: int("id").primaryKey().autoincrement(),
  type_id: int("type_id").notNull(),
  field_key: varchar("field_key", { length: 255 }).notNull(),
  field_label: varchar("field_label", { length: 255 }).notNull(),
  field_type: mysqlEnum("field_type", [
    "text",
    "number",
    "date",
    "select",
    "textarea",
    "boolean",
    "checkbox",
    "radio",
    "image",
    "rating",
    "keyvalue",
  ]).notNull().default("text"),
  required: int("required").notNull().default(0), // MySQL uses tinyint(1) for boolean
  options: text("options"), // JSON string for select options
  display_order: int("display_order").notNull().default(0),
  created_at: timestamp("created_at").notNull().defaultNow(),
});

export const mediaTypeFieldsRelations = relations(mediaTypeFields, ({ one }) => ({
  type: one(mediaTypes, {
    fields: [mediaTypeFields.type_id],
    references: [mediaTypes.id],
  }),
}));
