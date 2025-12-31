export interface MediaType {
  id: number;
  name: string;
  created_at: string;
}

export interface MediaItem {
  id?: number;
  type_id: number;
  title: string;
  status: "available" | "borrowed" | "lost";
  borrowed_by?: string;
  borrowed_date?: string;
  notes?: string;
  cover_image?: string;
  created_at?: string;
  updated_at?: string;
  attributes?: Record<string, string>;
}

export interface MediaItemWithType extends MediaItem {
  type_name: string;
}
