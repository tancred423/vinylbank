import axios from "axios";
import type { MediaItem, MediaItemWithType, MediaType } from "../types/media";

const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_URL || (import.meta.env.PROD ? "/api" : "/api"),
  headers: {
    "Content-Type": "application/json",
  },
});

export const api = {
  async getMediaItems(
    typeId?: number | string,
    status?: "all" | "available" | "borrowed" | "lost"
  ): Promise<MediaItemWithType[]> {
    const params: { type?: number | string; status?: string } = {};
    if (typeId) {
      params.type = typeId;
    }
    if (status && status !== "all") {
      params.status = status;
    }
    const response = await apiClient.get<MediaItemWithType[]>("/media", { params });
    return response.data;
  },

  async searchMediaItems(
    query: string,
    typeId?: number | string,
    status?: "all" | "available" | "borrowed" | "lost"
  ): Promise<MediaItemWithType[]> {
    const params: { q: string; type?: number | string; status?: string } = { q: query };
    if (typeId) {
      params.type = typeId;
    }
    if (status && status !== "all") {
      params.status = status;
    }
    const response = await apiClient.get<MediaItemWithType[]>("/media/search", { params });
    return response.data;
  },

  async getMediaItem(id: number): Promise<MediaItemWithType> {
    const response = await apiClient.get<MediaItemWithType>(`/media/${id}`);
    return response.data;
  },

  async createMediaItem(item: MediaItem): Promise<MediaItem> {
    const response = await apiClient.post<MediaItem>("/media", item);
    return response.data;
  },

  async updateMediaItem(id: number, item: MediaItem): Promise<MediaItem> {
    const response = await apiClient.put<MediaItem>(`/media/${id}`, item);
    return response.data;
  },

  async deleteMediaItem(id: number): Promise<void> {
    await apiClient.delete(`/media/${id}`);
  },

  async getMediaTypes(): Promise<MediaType[]> {
    const response = await apiClient.get<MediaType[]>("/media/types/list");
    return response.data;
  },
};

// Upload API
export const uploadApi = {
  async uploadCoverImage(itemId: number, file: File): Promise<{ url: string; filename: string }> {
    const formData = new FormData();
    formData.append("file", file);

    const backendURL = import.meta.env.VITE_BACKEND_URL || "http://localhost:8000";
    const response = await fetch(`${backendURL}/api/upload/image/${itemId}`, {
      method: "POST",
      body: formData,
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || "Upload failed");
    }

    return response.json();
  },

  async uploadAttributeImage(
    itemId: number,
    fieldKey: string,
    file: File
  ): Promise<{ url: string; filename: string }> {
    const formData = new FormData();
    formData.append("file", file);

    const backendURL = import.meta.env.VITE_BACKEND_URL || "http://localhost:8000";
    const response = await fetch(`${backendURL}/api/upload/attribute/${itemId}/${fieldKey}`, {
      method: "POST",
      body: formData,
    });

    if (!response.ok) {
      const errorText = await response.text();
      try {
        const error = JSON.parse(errorText);
        throw new Error(error.error || "Upload failed");
      } catch {
        throw new Error(errorText || "Upload failed");
      }
    }

    return response.json();
  },

  getImageUrl(filename: string): string {
    const baseURL = import.meta.env.VITE_API_URL || (import.meta.env.PROD ? "/api" : "/api");
    return `${baseURL}/upload/images/${filename}`;
  },
};

// Config API
export interface MediaTypeField {
  id?: number;
  type_id: number;
  field_key: string;
  field_label: string;
  field_type:
    | "text"
    | "number"
    | "date"
    | "select"
    | "textarea"
    | "boolean"
    | "checkbox"
    | "radio"
    | "image"
    | "rating"
    | "keyvalue";
  required: boolean;
  options?: string;
  display_order: number;
  created_at?: string;
}

export interface MediaTypeConfig {
  id: number;
  name: string;
  created_at: string;
  fields: MediaTypeField[];
}

export const configApi = {
  async getTypeConfigs(): Promise<MediaTypeConfig[]> {
    const response = await apiClient.get<MediaTypeConfig[]>("/config/types");
    return response.data;
  },

  async createType(name: string): Promise<{ id: number; name: string }> {
    const response = await apiClient.post("/config/types", { name });
    return response.data;
  },

  async updateType(id: number, name: string): Promise<{ id: number; name: string }> {
    const response = await apiClient.put(`/config/types/${id}`, { name });
    return response.data;
  },

  async deleteType(id: number): Promise<void> {
    await apiClient.delete(`/config/types/${id}`);
  },

  async addField(
    typeId: number,
    field: Omit<MediaTypeField, "id" | "type_id" | "created_at">
  ): Promise<MediaTypeField> {
    const response = await apiClient.post(`/config/types/${typeId}/fields`, field);
    return response.data;
  },

  async updateField(id: number, field: Partial<MediaTypeField>): Promise<MediaTypeField> {
    const response = await apiClient.put(`/config/fields/${id}`, field);
    return response.data;
  },

  async deleteField(id: number): Promise<void> {
    await apiClient.delete(`/config/fields/${id}`);
  },
};
