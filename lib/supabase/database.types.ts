export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: { id: string; email: string; approved: boolean; created_at: string };
        Insert: { id: string; email: string; approved?: boolean; created_at?: string };
        Update: { email?: string; approved?: boolean };
        Relationships: [];
      };
      prescription_templates: {
        Row: {
          id: string;
          user_id: string;
          disease: string;
          prescription_type: "standard" | "compounded";
          medications: Json;
          compounding_text: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          disease: string;
          prescription_type: "standard" | "compounded";
          medications?: Json;
          compounding_text?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          disease?: string;
          prescription_type?: "standard" | "compounded";
          medications?: Json;
          compounding_text?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: {
      approve_app_user: { Args: { target_user_id: string }; Returns: undefined };
      revoke_app_user: { Args: { target_user_id: string }; Returns: undefined };
    };
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
};
