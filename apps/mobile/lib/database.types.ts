export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  __InternalSupabase: {
    PostgrestVersion: '14.1'
  }
  public: {
    Tables: {
      families: {
        Row: {
          created_at: string
          id: string
          name: string
          owner_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          owner_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          owner_id?: string
          updated_at?: string
        }
        Relationships: []
      }
      family_invitations: {
        Row: {
          created_at: string
          email: string
          expires_at: string
          family_id: string
          id: string
          invited_by: string
          status: string
          token: string
        }
        Insert: {
          created_at?: string
          email: string
          expires_at: string
          family_id: string
          id?: string
          invited_by: string
          status?: string
          token: string
        }
        Update: {
          created_at?: string
          email?: string
          expires_at?: string
          family_id?: string
          id?: string
          invited_by?: string
          status?: string
          token?: string
        }
        Relationships: [
          {
            foreignKeyName: 'family_invitations_family_id_fkey'
            columns: ['family_id']
            isOneToOne: false
            referencedRelation: 'families'
            referencedColumns: ['id']
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
            foreignKeyName: 'family_members_family_id_fkey'
            columns: ['family_id']
            isOneToOne: false
            referencedRelation: 'families'
            referencedColumns: ['id']
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
            foreignKeyName: 'moment_photos_moment_id_fkey'
            columns: ['moment_id']
            isOneToOne: false
            referencedRelation: 'moments'
            referencedColumns: ['id']
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
            foreignKeyName: 'moments_wine_id_fkey'
            columns: ['wine_id']
            isOneToOne: false
            referencedRelation: 'wines'
            referencedColumns: ['id']
          },
        ]
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
    Views: Record<string, never>
    Functions: {
      show_limit: { Args: never; Returns: number }
      show_trgm: { Args: { '': string }; Returns: string[] }
    }
    Enums: Record<string, never>
    CompositeTypes: Record<string, never>
  }
}
