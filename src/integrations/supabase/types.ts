export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      captions: {
        Row: {
          created_at: string
          end_ms: number
          id: string
          idx: number
          project_id: string
          speaker: string | null
          start_ms: number
          text: string
        }
        Insert: {
          created_at?: string
          end_ms: number
          id?: string
          idx: number
          project_id: string
          speaker?: string | null
          start_ms: number
          text?: string
        }
        Update: {
          created_at?: string
          end_ms?: number
          id?: string
          idx?: number
          project_id?: string
          speaker?: string | null
          start_ms?: number
          text?: string
        }
        Relationships: [
          {
            foreignKeyName: "captions_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      contact_messages: {
        Row: {
          created_at: string
          email: string
          id: string
          message: string
          name: string
          subject: string | null
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          message: string
          name: string
          subject?: string | null
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          message?: string
          name?: string
          subject?: string | null
        }
        Relationships: []
      }
      payment_requests: {
        Row: {
          admin_note: string | null
          amount_inr: number
          created_at: string
          id: string
          plan_id: string
          screenshot_path: string | null
          status: string
          updated_at: string
          upi_ref: string | null
          user_id: string
        }
        Insert: {
          admin_note?: string | null
          amount_inr: number
          created_at?: string
          id?: string
          plan_id: string
          screenshot_path?: string | null
          status?: string
          updated_at?: string
          upi_ref?: string | null
          user_id: string
        }
        Update: {
          admin_note?: string | null
          amount_inr?: number
          created_at?: string
          id?: string
          plan_id?: string
          screenshot_path?: string | null
          status?: string
          updated_at?: string
          upi_ref?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "payment_requests_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "plans"
            referencedColumns: ["id"]
          },
        ]
      }
      payment_settings: {
        Row: {
          id: string
          note: string | null
          qr_url: string | null
          updated_at: string
          upi_id: string
          upi_name: string
        }
        Insert: {
          id?: string
          note?: string | null
          qr_url?: string | null
          updated_at?: string
          upi_id?: string
          upi_name?: string
        }
        Update: {
          id?: string
          note?: string | null
          qr_url?: string | null
          updated_at?: string
          upi_id?: string
          upi_name?: string
        }
        Relationships: []
      }
      plans: {
        Row: {
          created_at: string
          features: string[] | null
          id: string
          is_popular: boolean | null
          minutes_included: number
          name: string
          price_inr: number
          slug: string
          sort_order: number | null
        }
        Insert: {
          created_at?: string
          features?: string[] | null
          id?: string
          is_popular?: boolean | null
          minutes_included?: number
          name: string
          price_inr?: number
          slug: string
          sort_order?: number | null
        }
        Update: {
          created_at?: string
          features?: string[] | null
          id?: string
          is_popular?: boolean | null
          minutes_included?: number
          name?: string
          price_inr?: number
          slug?: string
          sort_order?: number | null
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          display_name: string | null
          id: string
          is_banned: boolean
          phone: string | null
          status_text: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          display_name?: string | null
          id?: string
          is_banned?: boolean
          phone?: string | null
          status_text?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          display_name?: string | null
          id?: string
          is_banned?: boolean
          phone?: string | null
          status_text?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      projects: {
        Row: {
          created_at: string
          duration_sec: number | null
          error_message: string | null
          id: string
          language: string | null
          status: string
          thumbnail_url: string | null
          title: string
          transcript_text: string | null
          updated_at: string
          user_id: string
          video_path: string | null
          video_url: string | null
        }
        Insert: {
          created_at?: string
          duration_sec?: number | null
          error_message?: string | null
          id?: string
          language?: string | null
          status?: string
          thumbnail_url?: string | null
          title?: string
          transcript_text?: string | null
          updated_at?: string
          user_id: string
          video_path?: string | null
          video_url?: string | null
        }
        Update: {
          created_at?: string
          duration_sec?: number | null
          error_message?: string | null
          id?: string
          language?: string | null
          status?: string
          thumbnail_url?: string | null
          title?: string
          transcript_text?: string | null
          updated_at?: string
          user_id?: string
          video_path?: string | null
          video_url?: string | null
        }
        Relationships: []
      }
      subscriptions: {
        Row: {
          created_at: string
          expires_at: string | null
          id: string
          plan_id: string
          status: string
          user_id: string
        }
        Insert: {
          created_at?: string
          expires_at?: string | null
          id?: string
          plan_id: string
          status?: string
          user_id: string
        }
        Update: {
          created_at?: string
          expires_at?: string | null
          id?: string
          plan_id?: string
          status?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "subscriptions_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "plans"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          id: string
          is_super: boolean
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          id?: string
          is_super?: boolean
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          id?: string
          is_super?: boolean
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      yt_metadata: {
        Row: {
          created_at: string
          description: string | null
          hashtags: string[] | null
          id: string
          keywords: string[] | null
          project_id: string
          tags: string[] | null
          title: string | null
          tone: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          hashtags?: string[] | null
          id?: string
          keywords?: string[] | null
          project_id: string
          tags?: string[] | null
          title?: string | null
          tone?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          hashtags?: string[] | null
          id?: string
          keywords?: string[] | null
          project_id?: string
          tags?: string[] | null
          title?: string | null
          tone?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "yt_metadata_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: true
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      admin_list_users: {
        Args: never
        Returns: {
          created_at: string
          display_name: string
          email: string
          phone: string
          project_count: number
          user_id: string
        }[]
      }
      approve_payment_request: { Args: { _id: string }; Returns: undefined }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      user_has_active_plan: { Args: { _user_id: string }; Returns: boolean }
    }
    Enums: {
      app_role: "admin" | "moderator" | "user" | "delivery"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_role: ["admin", "moderator", "user", "delivery"],
    },
  },
} as const
