import { Router } from "oak";
import { getDb } from "../db/database.ts";
import { mediaAttributes, mediaItems, mediaTypeFields, mediaTypes } from "../db/schema.ts";
import { and, desc, eq, like, or, sql } from "drizzle-orm";
import type { MediaItem, MediaItemWithType } from "../types/media.ts";

export const mediaRouter = new Router({ prefix: "/api/media" });

// Get all media items
mediaRouter.get("/", async (ctx) => {
  const db = await getDb();
  const typeFilter = ctx.request.url.searchParams.get("type");
  const statusFilter = ctx.request.url.searchParams.get("status");

  const baseQuery = db
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
    .innerJoin(mediaTypes, eq(mediaItems.type_id, mediaTypes.id));

  // Build where conditions
  const whereConditions: ReturnType<typeof eq>[] = [];

  // Apply type filter
  if (typeFilter && typeFilter !== "all" && !isNaN(parseInt(typeFilter))) {
    whereConditions.push(eq(mediaItems.type_id, parseInt(typeFilter)));
  }

  // Apply status filter
  if (
    statusFilter && statusFilter !== "all" &&
    ["available", "borrowed", "lost"].includes(statusFilter)
  ) {
    whereConditions.push(eq(mediaItems.status, statusFilter as "available" | "borrowed" | "lost"));
  }

  const items = await (whereConditions.length > 0
    ? baseQuery.where(and(...whereConditions)).orderBy(desc(mediaItems.created_at))
    : baseQuery.orderBy(desc(mediaItems.created_at)));

  const result = await Promise.all(
    items.map(async (item) => {
      // Get custom attributes
      const attributes = await db
        .select()
        .from(mediaAttributes)
        .where(eq(mediaAttributes.media_id, item.id!));

      const itemWithType: MediaItemWithType = {
        id: item.id!,
        type_id: item.type_id!,
        title: item.title!,
        status: item.status as "available" | "borrowed" | "lost",
        borrowed_by: item.borrowed_by || undefined,
        borrowed_date: item.borrowed_date
          ? item.borrowed_date.toISOString().split("T")[0]
          : undefined,
        notes: item.notes || undefined,
        cover_image: item.cover_image || undefined,
        created_at: item.created_at ? item.created_at.toISOString() : undefined,
        updated_at: item.updated_at ? item.updated_at.toISOString() : undefined,
        type_name: item.type_name!,
      };

      if (attributes.length > 0) {
        itemWithType.attributes = {};
        for (const attr of attributes) {
          itemWithType.attributes[attr.attribute_key] = attr.attribute_value || "";
        }
      }

      return itemWithType;
    }),
  );

  ctx.response.body = result;
});

// Search media items
mediaRouter.get("/search", async (ctx) => {
  const db = await getDb();
  const query = ctx.request.url.searchParams.get("q") || "";
  const typeFilter = ctx.request.url.searchParams.get("type");
  const statusFilter = ctx.request.url.searchParams.get("status");

  if (!query || query.trim().length === 0) {
    const baseItemsQuery = db
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
      .innerJoin(mediaTypes, eq(mediaItems.type_id, mediaTypes.id));

    // Build where conditions
    const whereConditions: ReturnType<typeof eq>[] = [];

    // Apply type filter
    if (typeFilter && typeFilter !== "all" && !isNaN(parseInt(typeFilter))) {
      whereConditions.push(eq(mediaItems.type_id, parseInt(typeFilter)));
    }

    // Apply status filter
    if (
      statusFilter && statusFilter !== "all" &&
      ["available", "borrowed", "lost"].includes(statusFilter)
    ) {
      whereConditions.push(
        eq(mediaItems.status, statusFilter as "available" | "borrowed" | "lost"),
      );
    }

    const items = await (whereConditions.length > 0
      ? baseItemsQuery.where(and(...whereConditions)).orderBy(desc(mediaItems.created_at))
      : baseItemsQuery.orderBy(desc(mediaItems.created_at)));

    const result = await Promise.all(
      items.map(async (item) => {
        const attributes = await db
          .select()
          .from(mediaAttributes)
          .where(eq(mediaAttributes.media_id, item.id!));

        const itemWithType: MediaItemWithType = {
          id: item.id!,
          type_id: item.type_id!,
          title: item.title!,
          status: item.status as "available" | "borrowed" | "lost",
          borrowed_by: item.borrowed_by || undefined,
          borrowed_date: item.borrowed_date
            ? item.borrowed_date.toISOString().split("T")[0]
            : undefined,
          notes: item.notes || undefined,
          cover_image: item.cover_image || undefined,
          created_at: item.created_at ? item.created_at.toISOString() : undefined,
          updated_at: item.updated_at ? item.updated_at.toISOString() : undefined,
          type_name: item.type_name!,
        };

        if (attributes.length > 0) {
          itemWithType.attributes = {};
          for (const attr of attributes) {
            itemWithType.attributes[attr.attribute_key] = attr.attribute_value || "";
          }
        }

        return itemWithType;
      }),
    );

    ctx.response.body = result;
    return;
  }

  const searchTerm = `%${query.trim()}%`;

  const baseSearchQuery = db
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
    .innerJoin(mediaTypes, eq(mediaItems.type_id, mediaTypes.id));

  const searchConditions = [
    like(mediaItems.title, searchTerm),
    like(mediaItems.notes, searchTerm),
    like(mediaItems.borrowed_by, searchTerm),
    like(mediaTypes.name, searchTerm),
  ];

  // Build where conditions
  const searchCondition = or(...searchConditions);
  const whereConditions: ReturnType<typeof eq>[] = [];

  // Add type filter
  if (typeFilter && typeFilter !== "all" && !isNaN(parseInt(typeFilter))) {
    whereConditions.push(eq(mediaItems.type_id, parseInt(typeFilter)));
  }

  // Add status filter
  if (
    statusFilter && statusFilter !== "all" &&
    ["available", "borrowed", "lost"].includes(statusFilter)
  ) {
    whereConditions.push(eq(mediaItems.status, statusFilter as "available" | "borrowed" | "lost"));
  }

  // Apply all conditions - combine search condition with type/status filters using AND
  const items = await (whereConditions.length > 0
    ? baseSearchQuery.where(and(searchCondition, ...whereConditions)).orderBy(
      desc(mediaItems.created_at),
    )
    : baseSearchQuery.where(searchCondition).orderBy(desc(mediaItems.created_at)));

  const result = await Promise.all(
    items.map(async (item) => {
      const attributes = await db
        .select()
        .from(mediaAttributes)
        .where(eq(mediaAttributes.media_id, item.id!));

      const itemWithType: MediaItemWithType = {
        id: item.id!,
        type_id: item.type_id!,
        title: item.title!,
        status: item.status as "available" | "borrowed" | "lost",
        borrowed_by: item.borrowed_by || undefined,
        borrowed_date: item.borrowed_date
          ? item.borrowed_date.toISOString().split("T")[0]
          : undefined,
        notes: item.notes || undefined,
        cover_image: item.cover_image || undefined,
        created_at: item.created_at ? item.created_at.toISOString() : undefined,
        updated_at: item.updated_at ? item.updated_at.toISOString() : undefined,
        type_name: item.type_name!,
      };

      if (attributes.length > 0) {
        itemWithType.attributes = {};
        for (const attr of attributes) {
          itemWithType.attributes[attr.attribute_key] = attr.attribute_value || "";
        }
      }

      return itemWithType;
    }),
  );

  // Search attributes - but we'll filter by status when fetching the actual items
  const attributeMatches = await db
    .select({
      media_id: mediaAttributes.media_id,
    })
    .from(mediaAttributes)
    .where(
      or(
        like(mediaAttributes.attribute_key, searchTerm),
        like(mediaAttributes.attribute_value, searchTerm),
      ),
    );

  const attributeMediaIds = Array.from(
    new Set(attributeMatches.map((a) =>
      a.media_id
    )),
  );

  if (attributeMediaIds.length > 0) {
    const existingIds = new Set(result.map((r) => r.id));
    const idsToFetch = attributeMediaIds.filter((id) => !existingIds.has(id));

    if (idsToFetch.length > 0) {
      const baseAdditionalQuery = db
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
        .innerJoin(mediaTypes, eq(mediaItems.type_id, mediaTypes.id));

      // Build where conditions for additional items
      const additionalWhereConditions: ReturnType<typeof eq>[] = [
        sql`${mediaItems.id} IN (${sql.join(idsToFetch.map((id) => sql`${id}`), sql`, `)})`,
      ];

      // Add type filter
      if (typeFilter && typeFilter !== "all" && !isNaN(parseInt(typeFilter))) {
        additionalWhereConditions.push(eq(mediaItems.type_id, parseInt(typeFilter)));
      }

      // Add status filter
      if (
        statusFilter && statusFilter !== "all" &&
        ["available", "borrowed", "lost"].includes(statusFilter)
      ) {
        additionalWhereConditions.push(
          eq(mediaItems.status, statusFilter as "available" | "borrowed" | "lost"),
        );
      }

      const additionalItems = await (additionalWhereConditions.length > 1
        ? baseAdditionalQuery.where(and(...additionalWhereConditions)).orderBy(
          desc(mediaItems.created_at),
        )
        : baseAdditionalQuery.where(additionalWhereConditions[0]).orderBy(
          desc(mediaItems.created_at),
        ));

      for (const item of additionalItems) {
        const attributes = await db
          .select()
          .from(mediaAttributes)
          .where(eq(mediaAttributes.media_id, item.id!));

        const itemWithType: MediaItemWithType = {
          id: item.id!,
          type_id: item.type_id!,
          title: item.title!,
          status: item.status as "available" | "borrowed" | "lost",
          borrowed_by: item.borrowed_by || undefined,
          borrowed_date: item.borrowed_date
            ? item.borrowed_date.toISOString().split("T")[0]
            : undefined,
          notes: item.notes || undefined,
          cover_image: item.cover_image || undefined,
          created_at: item.created_at ? item.created_at.toISOString() : undefined,
          updated_at: item.updated_at ? item.updated_at.toISOString() : undefined,
          type_name: item.type_name!,
        };

        if (attributes.length > 0) {
          itemWithType.attributes = {};
          for (const attr of attributes) {
            itemWithType.attributes[attr.attribute_key] = attr.attribute_value || "";
          }
        }

        result.push(itemWithType);
      }
    }
  }

  ctx.response.body = result;
});

// Get single media item
mediaRouter.get("/:id", async (ctx) => {
  const db = await getDb();
  const id = parseInt(ctx.params.id);

  const rows = await db
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
    .where(eq(mediaItems.id, id))
    .limit(1);

  if (rows.length === 0) {
    ctx.response.status = 404;
    ctx.response.body = { error: "Media item not found" };
    return;
  }

  const row = rows[0];

  // Get custom attributes
  const attributes = await db
    .select()
    .from(mediaAttributes)
    .where(eq(mediaAttributes.media_id, id));

  const item: MediaItemWithType = {
    id: row.id!,
    type_id: row.type_id!,
    title: row.title!,
    status: row.status as "available" | "borrowed" | "lost",
    borrowed_by: row.borrowed_by || undefined,
    borrowed_date: row.borrowed_date ? row.borrowed_date.toISOString().split("T")[0] : undefined,
    notes: row.notes || undefined,
    cover_image: row.cover_image || undefined,
    created_at: row.created_at ? row.created_at.toISOString() : undefined,
    updated_at: row.updated_at ? row.updated_at.toISOString() : undefined,
    type_name: row.type_name!,
  };

  if (attributes.length > 0) {
    item.attributes = {};
    for (const attr of attributes) {
      item.attributes[attr.attribute_key] = attr.attribute_value || "";
    }
  }

  ctx.response.body = item;
});

// Create media item
mediaRouter.post("/", async (ctx) => {
  const db = await getDb();
  const body = await ctx.request.body.json() as MediaItem;

  if (!body.title || !body.type_id) {
    ctx.response.status = 400;
    ctx.response.body = { error: "Title and type_id are required" };
    return;
  }

  const [result] = await db.insert(mediaItems).values({
    type_id: body.type_id,
    title: body.title,
    status: body.status || "available",
    borrowed_by: body.borrowed_by || null,
    borrowed_date: body.borrowed_date ? new Date(body.borrowed_date) : null,
    notes: body.notes || null,
    cover_image: body.cover_image || null,
  });

  const id = result.insertId;

  // Save custom attributes
  if (body.attributes) {
    for (const [key, value] of Object.entries(body.attributes)) {
      await db.insert(mediaAttributes).values({
        media_id: id,
        attribute_key: key,
        attribute_value: value,
      });
    }
  }

  ctx.response.status = 201;
  ctx.response.body = { id, ...body };
});

// Update media item
mediaRouter.put("/:id", async (ctx) => {
  const db = await getDb();
  const id = parseInt(ctx.params.id);
  const body = await ctx.request.body.json() as MediaItem;

  const existing = await db
    .select({ id: mediaItems.id, type_id: mediaItems.type_id })
    .from(mediaItems)
    .where(eq(mediaItems.id, id))
    .limit(1);

  if (existing.length === 0) {
    ctx.response.status = 404;
    ctx.response.body = { error: "Media item not found" };
    return;
  }

  const oldTypeId = existing[0].type_id;
  const newTypeId = body.type_id;
  const typeChanged = oldTypeId !== newTypeId;

  await db
    .update(mediaItems)
    .set({
      type_id: body.type_id,
      title: body.title,
      status: body.status || "available",
      borrowed_by: body.borrowed_by || null,
      borrowed_date: body.borrowed_date ? new Date(body.borrowed_date) : null,
      notes: body.notes || null,
      cover_image: body.cover_image !== undefined ? body.cover_image : undefined,
    })
    .where(eq(mediaItems.id, id));

  // If type changed, delete all old attributes and only keep valid ones for new type
  if (typeChanged) {
    // Get valid field keys for the new type
    const newTypeFields = await db
      .select({ field_key: mediaTypeFields.field_key })
      .from(mediaTypeFields)
      .where(eq(mediaTypeFields.type_id, newTypeId));
    const validFieldKeys = new Set(newTypeFields.map((f) => f.field_key));

    // Delete all existing attributes
    await db.delete(mediaAttributes).where(eq(mediaAttributes.media_id, id));

    // Only insert attributes that are valid for the new type
    if (body.attributes) {
      for (const [key, value] of Object.entries(body.attributes)) {
        if (validFieldKeys.has(key)) {
          await db.insert(mediaAttributes).values({
            media_id: id,
            attribute_key: key,
            attribute_value: value,
          });
        }
      }
    }
  } else if (body.attributes !== undefined) {
    // Type didn't change, update attributes normally
    await db.delete(mediaAttributes).where(eq(mediaAttributes.media_id, id));

    for (const [key, value] of Object.entries(body.attributes)) {
      await db.insert(mediaAttributes).values({
        media_id: id,
        attribute_key: key,
        attribute_value: value,
      });
    }
  }

  ctx.response.body = { id, ...body };
});

// Delete media item
mediaRouter.delete("/:id", async (ctx) => {
  const db = await getDb();
  const id = parseInt(ctx.params.id);

  const existing = await db
    .select({ id: mediaItems.id })
    .from(mediaItems)
    .where(eq(mediaItems.id, id))
    .limit(1);

  if (existing.length === 0) {
    ctx.response.status = 404;
    ctx.response.body = { error: "Media item not found" };
    return;
  }

  await db.delete(mediaItems).where(eq(mediaItems.id, id));

  ctx.response.status = 204;
});

// Get all media types
mediaRouter.get("/types/list", async (ctx) => {
  try {
    const db = await getDb();
    const types = await db
      .select()
      .from(mediaTypes)
      .orderBy(mediaTypes.name);

    ctx.response.body = types.map((row) => ({
      id: row.id,
      name: row.name,
      created_at: row.created_at ? row.created_at.toISOString() : undefined,
    }));
  } catch (error) {
    console.error("Error fetching media types:", error);
    ctx.response.status = 500;
    ctx.response.body = {
      error: "Failed to fetch media types",
      details: error instanceof Error ? error.message : String(error),
    };
  }
});
