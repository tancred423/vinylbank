import { Router } from "oak";
import { getDb } from "../db/database.ts";
import { mediaAttributes, mediaItems, mediaTypeFields, mediaTypes } from "../db/schema.ts";
import { and, asc, eq } from "drizzle-orm";
import type { MediaTypeConfig, MediaTypeField } from "../types/config.ts";

export const configRouter = new Router({ prefix: "/api/config" });

function slugifyFieldKey(input: string): string {
  return input
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .replace(/_{2,}/g, "_");
}

function buildUniqueFieldKey(baseKey: string, existingKeys: string[]): string {
  const sanitized = baseKey || "field";
  let candidate = sanitized;
  let counter = 1;
  while (existingKeys.includes(candidate)) {
    candidate = `${sanitized}_${counter++}`;
  }
  return candidate;
}

// Get all media types with their field configurations
configRouter.get("/types", async (ctx) => {
  const db = await getDb();

  const types = await db.select().from(mediaTypes).orderBy(mediaTypes.name);

  const typesWithFields: MediaTypeConfig[] = await Promise.all(
    types.map(async (type) => {
      const fields = await db
        .select()
        .from(mediaTypeFields)
        .where(eq(mediaTypeFields.type_id, type.id!))
        .orderBy(asc(mediaTypeFields.display_order));

      return {
        id: type.id!,
        name: type.name!,
        created_at: type.created_at?.toISOString(),
        fields: fields.map((f) => ({
          id: f.id,
          type_id: f.type_id!,
          field_key: f.field_key!,
          field_label: f.field_label!,
          field_type: f.field_type as MediaTypeField["field_type"],
          required: Boolean(f.required),
          options: f.options || undefined,
          display_order: f.display_order!,
          created_at: f.created_at?.toISOString(),
        })),
      };
    }),
  );

  ctx.response.body = typesWithFields;
});

// Create a new media type
configRouter.post("/types", async (ctx) => {
  const db = await getDb();
  const body = await ctx.request.body.json() as { name: string };

  if (!body.name) {
    ctx.response.status = 400;
    ctx.response.body = { error: "Name is required" };
    return;
  }

  const [result] = await db.insert(mediaTypes).values({ name: body.name });
  const typeId = result.insertId;

  ctx.response.status = 201;
  ctx.response.body = { id: typeId, name: body.name };
});

// Update a media type name
configRouter.put("/types/:id", async (ctx) => {
  const db = await getDb();
  const id = parseInt(ctx.params.id);
  const body = await ctx.request.body.json() as { name: string };

  if (!body.name) {
    ctx.response.status = 400;
    ctx.response.body = { error: "Name is required" };
    return;
  }

  await db.update(mediaTypes).set({ name: body.name }).where(eq(mediaTypes.id, id));

  ctx.response.body = { id, name: body.name };
});

// Delete a media type (cascade deletes fields and all items of this type)
configRouter.delete("/types/:id", async (ctx) => {
  const db = await getDb();
  const id = parseInt(ctx.params.id);

  // Get all media items of this type
  const itemsOfType = await db
    .select({ id: mediaItems.id })
    .from(mediaItems)
    .where(eq(mediaItems.type_id, id));

  // Delete all attributes for items of this type
  for (const item of itemsOfType) {
    await db.delete(mediaAttributes).where(eq(mediaAttributes.media_id, item.id!));
  }

  // Delete all media items of this type
  await db.delete(mediaItems).where(eq(mediaItems.type_id, id));

  // Delete all fields for this type
  await db.delete(mediaTypeFields).where(eq(mediaTypeFields.type_id, id));

  // Delete the type itself
  await db.delete(mediaTypes).where(eq(mediaTypes.id, id));

  ctx.response.status = 204;
});

// Add a field to a media type
configRouter.post("/types/:typeId/fields", async (ctx) => {
  const db = await getDb();
  const typeId = parseInt(ctx.params.typeId);
  const body = await ctx.request.body.json() as Partial<
    Omit<MediaTypeField, "id" | "type_id" | "created_at">
  >;

  const fieldLabel = body.field_label?.trim();
  if (!fieldLabel) {
    ctx.response.status = 400;
    ctx.response.body = { error: "field_label is required" };
    return;
  }

  const baseKey = body.field_key?.trim() || slugifyFieldKey(fieldLabel);
  const existingKeysResult = await db
    .select({ field_key: mediaTypeFields.field_key })
    .from(mediaTypeFields)
    .where(eq(mediaTypeFields.type_id, typeId));
  const existingKeys = existingKeysResult.map((row) => row.field_key!);
  const fieldKey = buildUniqueFieldKey(baseKey, existingKeys);

  const [result] = await db.insert(mediaTypeFields).values({
    type_id: typeId,
    field_key: fieldKey,
    field_label: fieldLabel,
    field_type: body.field_type || "text",
    required: body.required ? 1 : 0,
    options: body.options || null,
    display_order: body.display_order ?? existingKeys.length,
  });

  ctx.response.status = 201;
  ctx.response.body = {
    id: result.insertId,
    type_id: typeId,
    field_key: fieldKey,
    field_label: fieldLabel,
    field_type: body.field_type || "text",
    required: !!body.required,
    options: body.options || null,
    display_order: body.display_order ?? existingKeys.length,
  };
});

// Update a field
configRouter.put("/fields/:id", async (ctx) => {
  const db = await getDb();
  const id = parseInt(ctx.params.id);
  const body = await ctx.request.body.json() as Partial<MediaTypeField>;

  // Build update object with only provided fields
  type UpdateData = {
    field_label?: string;
    field_type?:
      | "text"
      | "number"
      | "date"
      | "textarea"
      | "select"
      | "boolean"
      | "image"
      | "rating";
    required?: number;
    options?: string | null;
    display_order?: number;
  };

  const updateData: UpdateData = {};
  if (body.field_label !== undefined) updateData.field_label = body.field_label;
  if (body.field_type !== undefined) {
    updateData.field_type = body.field_type as UpdateData["field_type"];
  }
  if (body.required !== undefined) updateData.required = body.required ? 1 : 0;
  if (body.options !== undefined) updateData.options = body.options;
  if (body.display_order !== undefined) updateData.display_order = body.display_order;

  await db
    .update(mediaTypeFields)
    .set(updateData)
    .where(eq(mediaTypeFields.id, id));

  ctx.response.body = { id, ...body };
});

// Delete a field and clean up associated attribute data
configRouter.delete("/fields/:id", async (ctx) => {
  const db = await getDb();
  const id = parseInt(ctx.params.id);

  // Get the field info before deleting
  const fieldRows = await db
    .select({ type_id: mediaTypeFields.type_id, field_key: mediaTypeFields.field_key })
    .from(mediaTypeFields)
    .where(eq(mediaTypeFields.id, id))
    .limit(1);

  if (fieldRows.length > 0) {
    const { type_id, field_key } = fieldRows[0];

    // Get all media items of this type
    const itemsOfType = await db
      .select({ id: mediaItems.id })
      .from(mediaItems)
      .where(eq(mediaItems.type_id, type_id!));

    // Delete attributes with this field_key for all items of this type
    for (const item of itemsOfType) {
      await db
        .delete(mediaAttributes)
        .where(
          and(
            eq(mediaAttributes.media_id, item.id!),
            eq(mediaAttributes.attribute_key, field_key!),
          ),
        );
    }
  }

  await db.delete(mediaTypeFields).where(eq(mediaTypeFields.id, id));

  ctx.response.status = 204;
});

// Export with configuration (types, fields, and data)
configRouter.get("/export/full", async (ctx) => {
  const db = await getDb();

  // Get all types with fields
  const types = await db.select().from(mediaTypes).orderBy(mediaTypes.name);
  const typesWithFields: MediaTypeConfig[] = await Promise.all(
    types.map(async (type) => {
      const fields = await db
        .select()
        .from(mediaTypeFields)
        .where(eq(mediaTypeFields.type_id, type.id!))
        .orderBy(asc(mediaTypeFields.display_order));

      return {
        id: type.id!,
        name: type.name!,
        created_at: type.created_at?.toISOString(),
        fields: fields.map((f) => ({
          id: f.id,
          type_id: f.type_id!,
          field_key: f.field_key!,
          field_label: f.field_label!,
          field_type: f.field_type as MediaTypeField["field_type"],
          required: Boolean(f.required),
          options: f.options || undefined,
          display_order: f.display_order!,
          created_at: f.created_at?.toISOString(),
        })),
      };
    }),
  );

  // Get all media items with attributes and type names
  const items = await db
    .select({
      id: mediaItems.id,
      type_id: mediaItems.type_id,
      title: mediaItems.title,
      status: mediaItems.status,
      borrowed_by: mediaItems.borrowed_by,
      borrowed_date: mediaItems.borrowed_date,
      notes: mediaItems.notes,
      cover_image: mediaItems.cover_image,
      created_at: mediaItems.created_at,
      updated_at: mediaItems.updated_at,
      type_name: mediaTypes.name,
    })
    .from(mediaItems)
    .innerJoin(mediaTypes, eq(mediaItems.type_id, mediaTypes.id))
    .orderBy(mediaItems.id);

  const itemsWithAttributes = await Promise.all(
    items.map(async (item) => {
      const attributes = await db
        .select()
        .from(mediaAttributes)
        .where(eq(mediaAttributes.media_id, item.id!));

      return {
        id: item.id,
        type_id: item.type_id,
        type_name: item.type_name,
        title: item.title,
        status: item.status,
        borrowed_by: item.borrowed_by || undefined,
        borrowed_date: item.borrowed_date?.toISOString() || undefined,
        notes: item.notes || undefined,
        cover_image: item.cover_image || undefined,
        created_at: item.created_at?.toISOString(),
        updated_at: item.updated_at?.toISOString(),
        attributes: attributes.reduce((acc, attr) => {
          acc[attr.attribute_key!] = attr.attribute_value || "";
          return acc;
        }, {} as Record<string, string>),
      };
    }),
  );

  const exportData = {
    version: "1.0",
    exported_at: new Date().toISOString(),
    config: {
      types: typesWithFields,
    },
    data: {
      items: itemsWithAttributes,
    },
  };

  ctx.response.headers.set("Content-Type", "application/json");
  ctx.response.headers.set(
    "Content-Disposition",
    `attachment; filename="vinylbank-export-${new Date().toISOString().split("T")[0]}.json"`,
  );
  ctx.response.body = exportData;
});

// Export data only
configRouter.get("/export/data", async (ctx) => {
  const db = await getDb();

  // Get all media items with attributes and type names
  const items = await db
    .select({
      id: mediaItems.id,
      type_id: mediaItems.type_id,
      title: mediaItems.title,
      status: mediaItems.status,
      borrowed_by: mediaItems.borrowed_by,
      borrowed_date: mediaItems.borrowed_date,
      notes: mediaItems.notes,
      cover_image: mediaItems.cover_image,
      created_at: mediaItems.created_at,
      updated_at: mediaItems.updated_at,
      type_name: mediaTypes.name,
    })
    .from(mediaItems)
    .innerJoin(mediaTypes, eq(mediaItems.type_id, mediaTypes.id))
    .orderBy(mediaItems.id);

  const itemsWithAttributes = await Promise.all(
    items.map(async (item) => {
      const attributes = await db
        .select()
        .from(mediaAttributes)
        .where(eq(mediaAttributes.media_id, item.id!));

      return {
        id: item.id,
        type_id: item.type_id,
        type_name: item.type_name,
        title: item.title,
        status: item.status,
        borrowed_by: item.borrowed_by || undefined,
        borrowed_date: item.borrowed_date?.toISOString() || undefined,
        notes: item.notes || undefined,
        cover_image: item.cover_image || undefined,
        created_at: item.created_at?.toISOString(),
        updated_at: item.updated_at?.toISOString(),
        attributes: attributes.reduce((acc, attr) => {
          acc[attr.attribute_key!] = attr.attribute_value || "";
          return acc;
        }, {} as Record<string, string>),
      };
    }),
  );

  const exportData = {
    version: "1.0",
    exported_at: new Date().toISOString(),
    data: {
      items: itemsWithAttributes,
    },
  };

  ctx.response.headers.set("Content-Type", "application/json");
  ctx.response.headers.set(
    "Content-Disposition",
    `attachment; filename="vinylbank-data-export-${new Date().toISOString().split("T")[0]}.json"`,
  );
  ctx.response.body = exportData;
});

// Import with configuration
configRouter.post("/import/full", async (ctx) => {
  const db = await getDb();
  const body = await ctx.request.body.json() as {
    config?: { types?: MediaTypeConfig[] };
    data?: { items?: unknown[] };
  };

  if (!body.config || !body.data) {
    ctx.response.status = 400;
    ctx.response.body = { error: "Invalid export format: missing config or data" };
    return;
  }

  try {
    // Import types and fields
    if (body.config.types) {
      for (const typeConfig of body.config.types) {
        // Check if type exists by name
        const existingTypes = await db
          .select()
          .from(mediaTypes)
          .where(eq(mediaTypes.name, typeConfig.name));

        let typeId: number;
        if (existingTypes.length > 0) {
          // Update existing type
          typeId = existingTypes[0].id!;
          await db.update(mediaTypes).set({ name: typeConfig.name }).where(
            eq(mediaTypes.id, typeId),
          );
        } else {
          // Create new type
          const [result] = await db.insert(mediaTypes).values({ name: typeConfig.name });
          typeId = result.insertId;
        }

        // Delete existing fields for this type
        await db.delete(mediaTypeFields).where(eq(mediaTypeFields.type_id, typeId));

        // Import fields
        if (typeConfig.fields) {
          for (const field of typeConfig.fields) {
            await db.insert(mediaTypeFields).values({
              type_id: typeId,
              field_key: field.field_key,
              field_label: field.field_label,
              field_type: field.field_type,
              required: field.required ? 1 : 0,
              options: field.options || null,
              display_order: field.display_order,
            });
          }
        }
      }
    }

    // Import data
    if (body.data.items) {
      // Clear existing data
      await db.delete(mediaAttributes);
      await db.delete(mediaItems);

      // Create a map of type names to type IDs
      const typeMapByName = new Map<string, number>();
      const allTypes = await db.select().from(mediaTypes);
      for (const type of allTypes) {
        typeMapByName.set(type.name!, type.id!);
      }

      for (
        const item of body.data.items as Array<{
          type_id?: number;
          type_name?: string;
          title: string;
          status: string;
          borrowed_by?: string;
          borrowed_date?: string;
          notes?: string;
          cover_image?: string;
          attributes?: Record<string, string>;
        }>
      ) {
        // Try to find type by name first, then by ID
        let newTypeId: number | undefined;
        if (item.type_name) {
          newTypeId = typeMapByName.get(item.type_name);
        }
        if (!newTypeId && item.type_id) {
          newTypeId = allTypes.find((t) => t.id === item.type_id)?.id;
        }

        if (!newTypeId) {
          console.warn(
            `Skipping item "${item.title}": type not found (type_name: ${item.type_name}, type_id: ${item.type_id})`,
          );
          continue;
        }

        const [result] = await db.insert(mediaItems).values({
          type_id: newTypeId,
          title: item.title,
          status: item.status as "available" | "borrowed" | "lost",
          borrowed_by: item.borrowed_by || null,
          borrowed_date: item.borrowed_date ? new Date(item.borrowed_date) : null,
          notes: item.notes || null,
          cover_image: item.cover_image || null,
        });

        const newItemId = result.insertId;

        // Import attributes
        if (item.attributes) {
          for (const [key, value] of Object.entries(item.attributes)) {
            await db.insert(mediaAttributes).values({
              media_id: newItemId,
              attribute_key: key,
              attribute_value: value || null,
            });
          }
        }
      }
    }

    ctx.response.body = { success: true, message: "Import completed successfully" };
  } catch (error) {
    console.error("Import error:", error);
    ctx.response.status = 500;
    ctx.response.body = {
      error: "Import failed",
      details: error instanceof Error ? error.message : String(error),
    };
  }
});

// Import data only
configRouter.post("/import/data", async (ctx) => {
  const db = await getDb();
  const body = await ctx.request.body.json() as {
    data?: { items?: unknown[] };
  };

  if (!body.data || !body.data.items) {
    ctx.response.status = 400;
    ctx.response.body = { error: "Invalid export format: missing data" };
    return;
  }

  try {
    // Get all existing types to map by name
    const allTypes = await db.select().from(mediaTypes);
    const typeMapByName = new Map<string, number>();
    for (const type of allTypes) {
      typeMapByName.set(type.name!, type.id!);
    }

    // Get all existing fields to check if they exist
    const allFields = await db.select().from(mediaTypeFields);
    const fieldMap = new Map<string, Set<string>>(); // type_id -> Set of field_keys
    for (const field of allFields) {
      if (!fieldMap.has(String(field.type_id))) {
        fieldMap.set(String(field.type_id), new Set());
      }
      fieldMap.get(String(field.type_id))!.add(field.field_key!);
    }

    const skippedItems: string[] = [];
    const skippedFields: string[] = [];

    for (
      const item of body.data.items as Array<{
        type_id: number;
        type_name?: string;
        title: string;
        status: string;
        borrowed_by?: string;
        borrowed_date?: string;
        notes?: string;
        cover_image?: string;
        attributes?: Record<string, string>;
      }>
    ) {
      // Try to find type by ID or name
      let typeId: number | undefined;
      if (item.type_id) {
        const type = allTypes.find((t) => t.id === item.type_id);
        if (type) {
          typeId = type.id!;
        }
      }
      if (!typeId && item.type_name) {
        typeId = typeMapByName.get(item.type_name);
      }

      if (!typeId) {
        skippedItems.push(item.title);
        continue;
      }

      const [result] = await db.insert(mediaItems).values({
        type_id: typeId,
        title: item.title,
        status: item.status as "available" | "borrowed" | "lost",
        borrowed_by: item.borrowed_by || null,
        borrowed_date: item.borrowed_date ? new Date(item.borrowed_date) : null,
        notes: item.notes || null,
        cover_image: item.cover_image || null,
      });

      const newItemId = result.insertId;

      // Import attributes only if field exists
      if (item.attributes) {
        const validFields = fieldMap.get(String(typeId)) || new Set();
        for (const [key, value] of Object.entries(item.attributes)) {
          if (validFields.has(key)) {
            await db.insert(mediaAttributes).values({
              media_id: newItemId,
              attribute_key: key,
              attribute_value: value || null,
            });
          } else {
            skippedFields.push(`${item.title}: ${key}`);
          }
        }
      }
    }

    ctx.response.body = {
      success: true,
      message: "Import completed",
      warnings: {
        skippedItems: skippedItems.length > 0 ? skippedItems : undefined,
        skippedFields: skippedFields.length > 0 ? skippedFields : undefined,
      },
    };
  } catch (error) {
    console.error("Import error:", error);
    ctx.response.status = 500;
    ctx.response.body = {
      error: "Import failed",
      details: error instanceof Error ? error.message : String(error),
    };
  }
});
