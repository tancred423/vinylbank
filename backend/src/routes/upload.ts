import { Router } from "oak";
import { getDb } from "../db/database.ts";
import { mediaAttributes, mediaItems } from "../db/schema.ts";
import { and, eq } from "drizzle-orm";

export const uploadRouter = new Router({ prefix: "/api/upload" });

// Upload image for media item
uploadRouter.post("/image/:itemId", async (ctx) => {
  const db = await getDb();
  const itemId = parseInt(ctx.params.itemId);

  // Check if item exists
  const existing = await db
    .select({ id: mediaItems.id })
    .from(mediaItems)
    .where(eq(mediaItems.id, itemId))
    .limit(1);

  if (existing.length === 0) {
    ctx.response.status = 404;
    ctx.response.body = { error: "Media item not found" };
    return;
  }

  let formData: FormData;
  try {
    const body = ctx.request.body;
    const value = await body.formData();
    formData = value;
  } catch (_error) {
    ctx.response.status = 400;
    ctx.response.body = { error: "Expected multipart/form-data" };
    return;
  }

  const file = formData.get("file") as File | null;

  if (!file) {
    ctx.response.status = 400;
    ctx.response.body = { error: "No file provided" };
    return;
  }

  // Validate file type
  if (!file.type.startsWith("image/")) {
    ctx.response.status = 400;
    ctx.response.body = { error: "File must be an image" };
    return;
  }

  // Validate file size (max 10MB)
  const maxSize = 10 * 1024 * 1024;
  if (file.size > maxSize) {
    ctx.response.status = 400;
    ctx.response.body = { error: "File size must be less than 10MB" };
    return;
  }

  // Generate unique filename
  const ext = file.name.split(".").pop() || "jpg";
  const filename = `${itemId}_${Date.now()}.${ext}`;
  const uploadDir = "/app/uploads";
  const filepath = `${uploadDir}/${filename}`;

  // Ensure upload directory exists
  try {
    await Deno.mkdir(uploadDir, { recursive: true });
  } catch (_e) {
    // Directory might already exist
  }

  // Save file
  const fileData = await file.arrayBuffer();
  await Deno.writeFile(filepath, new Uint8Array(fileData));

  // Update database with image path
  const imageUrl = `/api/upload/images/${filename}`;
  await db
    .update(mediaItems)
    .set({ cover_image: imageUrl })
    .where(eq(mediaItems.id, itemId));

  ctx.response.body = { url: imageUrl, filename };
});

// Upload image for custom attribute
uploadRouter.post("/attribute/:itemId/:fieldKey", async (ctx) => {
  const db = await getDb();
  const itemId = parseInt(ctx.params.itemId);
  const fieldKey = ctx.params.fieldKey;

  // Check if item exists
  const existing = await db
    .select({ id: mediaItems.id })
    .from(mediaItems)
    .where(eq(mediaItems.id, itemId))
    .limit(1);

  if (existing.length === 0) {
    ctx.response.status = 404;
    ctx.response.body = { error: "Media item not found" };
    return;
  }

  let formData: FormData;
  try {
    const body = ctx.request.body;
    const value = await body.formData();
    formData = value;
  } catch (_error) {
    ctx.response.status = 400;
    ctx.response.body = { error: "Expected multipart/form-data" };
    return;
  }

  const file = formData.get("file") as File | null;

  if (!file) {
    ctx.response.status = 400;
    ctx.response.body = { error: "No file provided" };
    return;
  }

  // Validate file type
  if (!file.type.startsWith("image/")) {
    ctx.response.status = 400;
    ctx.response.body = { error: "File must be an image" };
    return;
  }

  // Validate file size (max 10MB)
  const maxSize = 10 * 1024 * 1024;
  if (file.size > maxSize) {
    ctx.response.status = 400;
    ctx.response.body = { error: "File size must be less than 10MB" };
    return;
  }

  // Generate unique filename
  const ext = file.name.split(".").pop() || "jpg";
  const filename = `${itemId}_${fieldKey}_${Date.now()}.${ext}`;
  const uploadDir = "/app/uploads";
  const filepath = `${uploadDir}/${filename}`;

  // Ensure upload directory exists
  try {
    await Deno.mkdir(uploadDir, { recursive: true });
  } catch (_e) {
    // Directory might already exist
  }

  // Save file
  const fileData = await file.arrayBuffer();
  await Deno.writeFile(filepath, new Uint8Array(fileData));

  // Update attribute with image URL
  const imageUrl = `/api/upload/images/${filename}`;

  // Check if attribute exists
  const attr = await db
    .select()
    .from(mediaAttributes)
    .where(and(
      eq(mediaAttributes.media_id, itemId),
      eq(mediaAttributes.attribute_key, fieldKey),
    ))
    .limit(1);

  if (attr.length > 0) {
    await db
      .update(mediaAttributes)
      .set({ attribute_value: imageUrl })
      .where(and(
        eq(mediaAttributes.media_id, itemId),
        eq(mediaAttributes.attribute_key, fieldKey),
      ));
  } else {
    await db.insert(mediaAttributes).values({
      media_id: itemId,
      attribute_key: fieldKey,
      attribute_value: imageUrl,
    });
  }

  ctx.response.body = { url: imageUrl, filename };
});

// Serve uploaded images
uploadRouter.get("/images/:filename", async (ctx) => {
  const filename = ctx.params.filename;
  const filepath = `/app/uploads/${filename}`;

  try {
    const file = await Deno.readFile(filepath);

    // Determine content type from file extension
    const ext = filename.split(".").pop()?.toLowerCase();
    const contentTypeMap: Record<string, string> = {
      "jpg": "image/jpeg",
      "jpeg": "image/jpeg",
      "png": "image/png",
      "gif": "image/gif",
      "webp": "image/webp",
    };
    const contentType = contentTypeMap[ext || ""] || "application/octet-stream";

    ctx.response.headers.set("Content-Type", contentType);
    ctx.response.headers.set("Cache-Control", "public, max-age=31536000"); // Cache for 1 year
    ctx.response.body = file;
  } catch (error) {
    console.error("Failed to serve image:", filename, error);
    ctx.response.status = 404;
    ctx.response.body = { error: "Image not found" };
  }
});
