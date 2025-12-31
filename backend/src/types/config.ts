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
    | "image"
    | "rating"
    | "keyvalue";
  required: boolean;
  options?: string; // JSON string for select options
  display_order: number;
  created_at?: string;
}

export interface MediaTypeConfig {
  id: number;
  name: string;
  created_at?: string;
  fields: MediaTypeField[];
}
