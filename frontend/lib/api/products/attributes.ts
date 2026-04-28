"use server";

import { serverFetchJson, serverMutationJson } from "@/lib/api/server-django";

import type { PaginatedResponse } from "@/lib/api/client";
import type { PresetColor, PresetSize } from "@/lib/products/types";

// ─── DRF shapes ──────────────────────────────────────────────────────────────

interface DrfPresetSize {
  id: number;
  name: string;
  type: "clothing" | "shoe";
}

interface DrfPresetColor {
  id: number;
  name: string;
  hex: string;
}

// ─── Reads ────────────────────────────────────────────────────────────────────

export async function getPresetSizes(): Promise<PresetSize[]> {
  try {
    const res = await serverFetchJson<PaginatedResponse<DrfPresetSize>>(
      "/api/v1/products/preset-sizes/?page_size=500",
    );
    return res.results.map((s) => ({ id: String(s.id), name: s.name, type: s.type }));
  } catch {
    return [];
  }
}

export async function getPresetColors(): Promise<PresetColor[]> {
  try {
    const res = await serverFetchJson<PaginatedResponse<DrfPresetColor>>(
      "/api/v1/products/preset-colors/?page_size=500",
    );
    return res.results.map((c) => ({
      id: String(c.id),
      name: c.name,
      hex: c.hex,
    }));
  } catch {
    return [];
  }
}

// ─── Creates ──────────────────────────────────────────────────────────────────

export async function createPresetSize(
  name: string,
  type: "clothing" | "shoe",
): Promise<{ success?: boolean; size?: PresetSize; error?: string }> {
  try {
    const res = await serverMutationJson<DrfPresetSize>(
      "/api/v1/products/preset-sizes/",
      "POST",
      { name, type },
    );
    return { success: true, size: { id: String(res.id), name: res.name, type: res.type } };
  } catch (e) {
    return {
      error: e instanceof Error ? e.message : "Error al crear la talla.",
    };
  }
}

export async function createPresetColor(
  name: string,
  hex: string,
): Promise<{ success?: boolean; color?: PresetColor; error?: string }> {
  try {
    const res = await serverMutationJson<DrfPresetColor>(
      "/api/v1/products/preset-colors/",
      "POST",
      { name, hex },
    );
    return {
      success: true,
      color: { id: String(res.id), name: res.name, hex: res.hex },
    };
  } catch (e) {
    return {
      error: e instanceof Error ? e.message : "Error al crear el color.",
    };
  }
}

// ─── Update ───────────────────────────────────────────────────────────────────

export async function updatePresetColor(
  id: string,
  hex: string,
): Promise<{ success?: boolean; color?: PresetColor; error?: string }> {
  try {
    const res = await serverMutationJson<DrfPresetColor>(
      `/api/v1/products/preset-colors/${encodeURIComponent(id)}/`,
      "PATCH",
      { hex },
    );
    return {
      success: true,
      color: { id: String(res.id), name: res.name, hex: res.hex },
    };
  } catch (e) {
    return {
      error: e instanceof Error ? e.message : "Error al actualizar el color.",
    };
  }
}

// ─── Deletes ──────────────────────────────────────────────────────────────────

export async function deletePresetSize(
  id: string,
  _name: string,
): Promise<{ error?: string }> {
  void _name;
  try {
    await serverMutationJson(
      `/api/v1/products/preset-sizes/${encodeURIComponent(id)}/`,
      "DELETE",
    );
    return {};
  } catch (e) {
    return {
      error:
        e instanceof Error
          ? e.message
          : "Error al eliminar la talla. Puede que esté en uso.",
    };
  }
}

export async function deletePresetColor(
  id: string,
  _name: string,
): Promise<{ error?: string }> {
  void _name;
  try {
    await serverMutationJson(
      `/api/v1/products/preset-colors/${encodeURIComponent(id)}/`,
      "DELETE",
    );
    return {};
  } catch (e) {
    return {
      error:
        e instanceof Error
          ? e.message
          : "Error al eliminar el color. Puede que esté en uso.",
    };
  }
}
