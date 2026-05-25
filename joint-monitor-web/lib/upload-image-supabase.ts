import { getSupabaseBrowserClient } from "@/lib/supabase-client";

/** Phải khớp tên bucket trên Supabase Dashboard. */
export const TMJ_IMAGE_BUCKET = "TMJ-joint-images";

function base64ToBlob(base64Image: string): Blob {
  if (!base64Image.startsWith("data:")) {
    throw new Error("Ảnh phải ở dạng data URL base64");
  }
  const [header, data] = base64Image.split(",");
  const mime = header.match(/:(.*?);/)?.[1] ?? "image/jpeg";
  const bytes = atob(data);
  const buffer = new Uint8Array(bytes.length);
  for (let i = 0; i < bytes.length; i++) buffer[i] = bytes.charCodeAt(i);
  return new Blob([buffer], { type: mime });
}

/**
 * Upload một ảnh snapshot lên Supabase Storage (bucket public).
 * @returns Public URL dùng cho <img src> và lưu Prisma.
 */
export async function uploadImageToSupabase(
  base64Image: string,
  fileName: string,
  folderPrefix = "sessions"
): Promise<string> {
  const supabase = getSupabaseBrowserClient();
  const blob = base64ToBlob(base64Image);
  const safeName = fileName.replace(/[^a-zA-Z0-9._-]/g, "_");
  const storagePath = `${folderPrefix}/${Date.now()}-${safeName}`;

  const { data, error } = await supabase.storage
    .from(TMJ_IMAGE_BUCKET)
    .upload(storagePath, blob, {
      contentType: blob.type || "image/jpeg",
      cacheControl: "3600",
      upsert: false,
    });

  console.log("[TMJ Storage] upload result:", {
    bucket: TMJ_IMAGE_BUCKET,
    path: storagePath,
    data,
    error,
  });

  if (error) {
    throw new Error(`Upload Supabase thất bại (${safeName}): ${error.message}`);
  }

  const { data: publicData } = supabase.storage
    .from(TMJ_IMAGE_BUCKET)
    .getPublicUrl(data.path);

  return publicData.publicUrl;
}

/** Upload tuần tự 3 góc chụp TMJ; trả về URL hoặc null nếu không có ảnh. */
export async function uploadTmjSessionImages(
  patientId: string,
  images: { front: string | null; left: string | null; right: string | null }
): Promise<{ imageFront: string | null; imageLeft: string | null; imageRight: string | null }> {
  const prefix = `${patientId}`;
  const result = {
    imageFront: null as string | null,
    imageLeft: null as string | null,
    imageRight: null as string | null,
  };

  if (images.front) {
    result.imageFront = await uploadImageToSupabase(images.front, "front.jpg", prefix);
  }
  if (images.left) {
    result.imageLeft = await uploadImageToSupabase(images.left, "left.jpg", prefix);
  }
  if (images.right) {
    result.imageRight = await uploadImageToSupabase(images.right, "right.jpg", prefix);
  }

  return result;
}
