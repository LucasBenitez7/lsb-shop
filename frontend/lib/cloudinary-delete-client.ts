/**
 * Best-effort delete of an uploaded asset (abandoned session uploads).
 * Failures are logged only; callers should not block UX on this.
 */
export async function deleteCloudinaryAsset(publicId: string): Promise<void> {
  const trimmed = publicId.trim();
  if (!trimmed) return;

  try {
    const res = await fetch("/api/cloudinary/delete", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ publicId: trimmed }),
      credentials: "same-origin",
    });
    if (!res.ok) {
      const text = await res.text().catch(() => "");
      console.warn("[cloudinary] delete failed", res.status, text);
    }
  } catch (e) {
    console.warn("[cloudinary] delete request error", e);
  }
}
