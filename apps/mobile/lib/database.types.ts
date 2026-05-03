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
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      families: {
        Row: {
          created_at: string
          description: string | null
          id: string
          name: string
          owner_id: string
          photo_url: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          name: string
          owner_id: string
          photo_url?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          name?: string
          owner_id?: string
          photo_url?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      family_invitations: {
        Row: {
          created_at: string
          email: string | null
          expires_at: string
          family_id: string
          id: string
          invited_by: string
          invited_user_id: string | null
          status: string
          token: string
        }
        Insert: {
          created_at?: string
          email?: string | null
          expires_at: string
          family_id: string
          id?: string
          invited_by: string
          invited_user_id?: string | null
          status?: string
          token: string
        }
        Update: {
          created_at?: string
          email?: string | null
          expires_at?: string
          family_id?: string
          id?: string
          invited_by?: string
          invited_user_id?: string | null
          status?: string
          token?: string
        }
        Relationships: [
          {
            foreignKeyName: "family_invitations_family_id_fkey"
            columns: ["family_id"]
            isOneToOne: false
            referencedRelation: "families"
            referencedColumns: ["id"]
          },
        ]
      }
      family_members: {
        Row: {
          family_id: string
          id: string
          joined_at: string
          role: string
          user_id: string
        }
        Insert: {
          family_id: string
          id?: string
          joined_at?: string
          role: string
          user_id: string
        }
        Update: {
          family_id?: string
          id?: string
          joined_at?: string
          role?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "family_members_family_id_fkey"
            columns: ["family_id"]
            isOneToOne: false
            referencedRelation: "families"
            referencedColumns: ["id"]
          },
        ]
      }
      moment_photos: {
        Row: {
          created_at: string
          id: string
          is_cover: boolean
          moment_id: string
          position: number
          url: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_cover?: boolean
          moment_id: string
          position: number
          url: string
        }
        Update: {
          created_at?: string
          id?: string
          is_cover?: boolean
          moment_id?: string
          position?: number
          url?: string
        }
        Relationships: [
          {
            foreignKeyName: "moment_photos_moment_id_fkey"
            columns: ["moment_id"]
            isOneToOne: false
            referencedRelation: "moments"
            referencedColumns: ["id"]
          },
        ]
      }
      moments: {
        Row: {
          cover_photo_url: string | null
          created_at: string
          description: string | null
          happened_at: string
          id: string
          latitude: number
          location_name: string
          longitude: number
          rating: number | null
          title: string
          updated_at: string
          user_id: string
          wine_id: string | null
        }
        Insert: {
          cover_photo_url?: string | null
          created_at?: string
          description?: string | null
          happened_at: string
          id?: string
          latitude: number
          location_name: string
          longitude: number
          rating?: number | null
          title: string
          updated_at?: string
          user_id: string
          wine_id?: string | null
        }
        Update: {
          cover_photo_url?: string | null
          created_at?: string
          description?: string | null
          happened_at?: string
          id?: string
          latitude?: number
          location_name?: string
          longitude?: number
          rating?: number | null
          title?: string
          updated_at?: string
          user_id?: string
          wine_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "moments_wine_id_fkey"
            columns: ["wine_id"]
            isOneToOne: false
            referencedRelation: "wines"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          bio: string | null
          created_at: string
          display_name: string
          id: string
          language: string
          notifications_enabled: boolean
          pro_active: boolean
          pro_environment: string | null
          pro_event_at: string | null
          pro_expires_at: string | null
          pro_in_billing_retry: boolean
          pro_in_grace_period: boolean
          pro_original_transaction_id: string | null
          pro_period_type: string | null
          pro_product_id: string | null
          pro_store: string | null
          pro_will_renew: boolean
          updated_at: string
          username: string
        }
        Insert: {
          avatar_url?: string | null
          bio?: string | null
          created_at?: string
          display_name?: string
          id: string
          language?: string
          notifications_enabled?: boolean
          pro_active?: boolean
          pro_environment?: string | null
          pro_event_at?: string | null
          pro_expires_at?: string | null
          pro_in_billing_retry?: boolean
          pro_in_grace_period?: boolean
          pro_original_transaction_id?: string | null
          pro_period_type?: string | null
          pro_product_id?: string | null
          pro_store?: string | null
          pro_will_renew?: boolean
          updated_at?: string
          username: string
        }
        Update: {
          avatar_url?: string | null
          bio?: string | null
          created_at?: string
          display_name?: string
          id?: string
          language?: string
          notifications_enabled?: boolean
          pro_active?: boolean
          pro_environment?: string | null
          pro_event_at?: string | null
          pro_expires_at?: string | null
          pro_in_billing_retry?: boolean
          pro_in_grace_period?: boolean
          pro_original_transaction_id?: string | null
          pro_period_type?: string | null
          pro_product_id?: string | null
          pro_store?: string | null
          pro_will_renew?: boolean
          updated_at?: string
          username?: string
        }
        Relationships: []
      }
      wines: {
        Row: {
          country: string | null
          created_at: string
          created_by: string
          id: string
          label_photo_url: string | null
          name: string
          producer: string | null
          region: string | null
          type: string | null
          vintage: number | null
        }
        Insert: {
          country?: string | null
          created_at?: string
          created_by: string
          id?: string
          label_photo_url?: string | null
          name: string
          producer?: string | null
          region?: string | null
          type?: string | null
          vintage?: number | null
        }
        Update: {
          country?: string | null
          created_at?: string
          created_by?: string
          id?: string
          label_photo_url?: string | null
          name?: string
          producer?: string | null
          region?: string | null
          type?: string | null
          vintage?: number | null
        }
        Relationships: []
      }
    }
    Views: {
      user_entitlement: {
        Row: {
          is_pro: boolean | null
          pro_event_at: string | null
          pro_expires_at: string | null
          pro_in_billing_retry: boolean | null
          pro_in_grace_period: boolean | null
          pro_period_type: string | null
          pro_product_id: string | null
          pro_store: string | null
          pro_will_renew: boolean | null
          user_id: string | null
        }
        Insert: {
          is_pro?: never
          pro_event_at?: string | null
          pro_expires_at?: string | null
          pro_in_billing_retry?: boolean | null
          pro_in_grace_period?: boolean | null
          pro_period_type?: string | null
          pro_product_id?: string | null
          pro_store?: string | null
          pro_will_renew?: boolean | null
          user_id?: string | null
        }
        Update: {
          is_pro?: never
          pro_event_at?: string | null
          pro_expires_at?: string | null
          pro_in_billing_retry?: boolean | null
          pro_in_grace_period?: boolean | null
          pro_period_type?: string | null
          pro_product_id?: string | null
          pro_store?: string | null
          pro_will_renew?: boolean | null
          user_id?: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      apply_revenuecat_event: {
        Args: {
          p_active: boolean
          p_billing_retry: boolean
          p_environment: string
          p_event_at: string
          p_expires_at: string
          p_grace: boolean
          p_original_tx_id: string
          p_period_type: string
          p_product_id: string
          p_store: string
          p_user_id: string
          p_will_renew: boolean
        }
        Returns: undefined
      }
      claim_username: { Args: { desired: string }; Returns: string }
      find_user_id_by_email: { Args: { lookup_email: string }; Returns: string }
      set_username: { Args: { new_username: string }; Returns: string }
      transfer_revenuecat_entitlement: {
        Args: {
          p_event_at: string
          p_from_user_id: string
          p_to_user_id: string
        }
        Returns: undefined
      }
    }
    Enums: {
      [_ in never]: never
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
    Enums: {},
  },
} as const
