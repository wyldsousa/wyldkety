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
      bank_accounts: {
        Row: {
          account_type: string
          balance: number
          bank_name: string
          color: string | null
          created_at: string
          created_by_user_id: string | null
          group_id: string | null
          icon: string | null
          id: string
          image_url: string | null
          is_investment: boolean | null
          name: string
          updated_at: string
          user_id: string
        }
        Insert: {
          account_type?: string
          balance?: number
          bank_name: string
          color?: string | null
          created_at?: string
          created_by_user_id?: string | null
          group_id?: string | null
          icon?: string | null
          id?: string
          image_url?: string | null
          is_investment?: boolean | null
          name: string
          updated_at?: string
          user_id: string
        }
        Update: {
          account_type?: string
          balance?: number
          bank_name?: string
          color?: string | null
          created_at?: string
          created_by_user_id?: string | null
          group_id?: string | null
          icon?: string | null
          id?: string
          image_url?: string | null
          is_investment?: boolean | null
          name?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "bank_accounts_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "financial_groups"
            referencedColumns: ["id"]
          },
        ]
      }
      categories: {
        Row: {
          color: string | null
          created_at: string
          group_id: string | null
          icon: string | null
          id: string
          is_default: boolean | null
          name: string
          type: string
          updated_at: string
          user_id: string
        }
        Insert: {
          color?: string | null
          created_at?: string
          group_id?: string | null
          icon?: string | null
          id?: string
          is_default?: boolean | null
          name: string
          type: string
          updated_at?: string
          user_id: string
        }
        Update: {
          color?: string | null
          created_at?: string
          group_id?: string | null
          icon?: string | null
          id?: string
          is_default?: boolean | null
          name?: string
          type?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "categories_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "financial_groups"
            referencedColumns: ["id"]
          },
        ]
      }
      credit_card_invoices: {
        Row: {
          card_id: string
          created_at: string
          group_id: string | null
          id: string
          minimum_amount: number
          month: number
          paid_amount: number | null
          paid_at: string | null
          payment_account_id: string | null
          status: string
          total_amount: number
          updated_at: string
          user_id: string
          year: number
        }
        Insert: {
          card_id: string
          created_at?: string
          group_id?: string | null
          id?: string
          minimum_amount?: number
          month: number
          paid_amount?: number | null
          paid_at?: string | null
          payment_account_id?: string | null
          status?: string
          total_amount?: number
          updated_at?: string
          user_id: string
          year: number
        }
        Update: {
          card_id?: string
          created_at?: string
          group_id?: string | null
          id?: string
          minimum_amount?: number
          month?: number
          paid_amount?: number | null
          paid_at?: string | null
          payment_account_id?: string | null
          status?: string
          total_amount?: number
          updated_at?: string
          user_id?: string
          year?: number
        }
        Relationships: [
          {
            foreignKeyName: "credit_card_invoices_card_id_fkey"
            columns: ["card_id"]
            isOneToOne: false
            referencedRelation: "credit_cards"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "credit_card_invoices_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "financial_groups"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "credit_card_invoices_payment_account_id_fkey"
            columns: ["payment_account_id"]
            isOneToOne: false
            referencedRelation: "bank_accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      credit_card_transactions: {
        Row: {
          amount: number
          card_id: string
          category: string
          created_at: string
          created_by_user_id: string | null
          date: string
          description: string | null
          group_id: string | null
          id: string
          installment_number: number | null
          invoice_id: string
          parent_transaction_id: string | null
          total_installments: number | null
          updated_at: string
          user_id: string
        }
        Insert: {
          amount: number
          card_id: string
          category: string
          created_at?: string
          created_by_user_id?: string | null
          date?: string
          description?: string | null
          group_id?: string | null
          id?: string
          installment_number?: number | null
          invoice_id: string
          parent_transaction_id?: string | null
          total_installments?: number | null
          updated_at?: string
          user_id: string
        }
        Update: {
          amount?: number
          card_id?: string
          category?: string
          created_at?: string
          created_by_user_id?: string | null
          date?: string
          description?: string | null
          group_id?: string | null
          id?: string
          installment_number?: number | null
          invoice_id?: string
          parent_transaction_id?: string | null
          total_installments?: number | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "credit_card_transactions_card_id_fkey"
            columns: ["card_id"]
            isOneToOne: false
            referencedRelation: "credit_cards"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "credit_card_transactions_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "financial_groups"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "credit_card_transactions_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "credit_card_invoices"
            referencedColumns: ["id"]
          },
        ]
      }
      credit_cards: {
        Row: {
          bank_name: string
          closing_day: number
          color: string | null
          created_at: string
          created_by_user_id: string | null
          credit_limit: number
          due_day: number
          group_id: string | null
          id: string
          image_url: string | null
          interest_rate: number | null
          name: string
          updated_at: string
          user_id: string
        }
        Insert: {
          bank_name: string
          closing_day?: number
          color?: string | null
          created_at?: string
          created_by_user_id?: string | null
          credit_limit?: number
          due_day?: number
          group_id?: string | null
          id?: string
          image_url?: string | null
          interest_rate?: number | null
          name: string
          updated_at?: string
          user_id: string
        }
        Update: {
          bank_name?: string
          closing_day?: number
          color?: string | null
          created_at?: string
          created_by_user_id?: string | null
          credit_limit?: number
          due_day?: number
          group_id?: string | null
          id?: string
          image_url?: string | null
          interest_rate?: number | null
          name?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "credit_cards_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "financial_groups"
            referencedColumns: ["id"]
          },
        ]
      }
      email_verifications: {
        Row: {
          created_at: string | null
          email: string
          expires_at: string
          id: string
          user_id: string
          verification_code: string
          verified_at: string | null
        }
        Insert: {
          created_at?: string | null
          email: string
          expires_at?: string
          id?: string
          user_id: string
          verification_code: string
          verified_at?: string | null
        }
        Update: {
          created_at?: string | null
          email?: string
          expires_at?: string
          id?: string
          user_id?: string
          verification_code?: string
          verified_at?: string | null
        }
        Relationships: []
      }
      financial_groups: {
        Row: {
          created_at: string
          created_by: string
          description: string | null
          id: string
          name: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by: string
          description?: string | null
          id?: string
          name: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string
          description?: string | null
          id?: string
          name?: string
          updated_at?: string
        }
        Relationships: []
      }
      group_invites: {
        Row: {
          can_manage_accounts: boolean
          can_manage_cards: boolean
          can_manage_categories: boolean
          can_manage_reminders: boolean
          can_manage_transactions: boolean
          can_view_reports: boolean
          created_at: string
          expires_at: string
          group_id: string
          id: string
          invited_by: string
          invited_email: string
          role: Database["public"]["Enums"]["group_role"]
          status: string
        }
        Insert: {
          can_manage_accounts?: boolean
          can_manage_cards?: boolean
          can_manage_categories?: boolean
          can_manage_reminders?: boolean
          can_manage_transactions?: boolean
          can_view_reports?: boolean
          created_at?: string
          expires_at?: string
          group_id: string
          id?: string
          invited_by: string
          invited_email: string
          role?: Database["public"]["Enums"]["group_role"]
          status?: string
        }
        Update: {
          can_manage_accounts?: boolean
          can_manage_cards?: boolean
          can_manage_categories?: boolean
          can_manage_reminders?: boolean
          can_manage_transactions?: boolean
          can_view_reports?: boolean
          created_at?: string
          expires_at?: string
          group_id?: string
          id?: string
          invited_by?: string
          invited_email?: string
          role?: Database["public"]["Enums"]["group_role"]
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "group_invites_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "financial_groups"
            referencedColumns: ["id"]
          },
        ]
      }
      group_members: {
        Row: {
          can_manage_accounts: boolean
          can_manage_cards: boolean
          can_manage_categories: boolean
          can_manage_reminders: boolean
          can_manage_transactions: boolean
          can_view_reports: boolean
          group_id: string
          id: string
          joined_at: string
          role: Database["public"]["Enums"]["group_role"]
          updated_at: string
          user_id: string
        }
        Insert: {
          can_manage_accounts?: boolean
          can_manage_cards?: boolean
          can_manage_categories?: boolean
          can_manage_reminders?: boolean
          can_manage_transactions?: boolean
          can_view_reports?: boolean
          group_id: string
          id?: string
          joined_at?: string
          role?: Database["public"]["Enums"]["group_role"]
          updated_at?: string
          user_id: string
        }
        Update: {
          can_manage_accounts?: boolean
          can_manage_cards?: boolean
          can_manage_categories?: boolean
          can_manage_reminders?: boolean
          can_manage_transactions?: boolean
          can_view_reports?: boolean
          group_id?: string
          id?: string
          joined_at?: string
          role?: Database["public"]["Enums"]["group_role"]
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "group_members_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "financial_groups"
            referencedColumns: ["id"]
          },
        ]
      }
      monthly_reports: {
        Row: {
          balance: number
          generated_at: string
          group_id: string | null
          id: string
          month: number
          report_data: Json | null
          total_expenses: number
          total_income: number
          user_id: string
          year: number
        }
        Insert: {
          balance?: number
          generated_at?: string
          group_id?: string | null
          id?: string
          month: number
          report_data?: Json | null
          total_expenses?: number
          total_income?: number
          user_id: string
          year: number
        }
        Update: {
          balance?: number
          generated_at?: string
          group_id?: string | null
          id?: string
          month?: number
          report_data?: Json | null
          total_expenses?: number
          total_income?: number
          user_id?: string
          year?: number
        }
        Relationships: [
          {
            foreignKeyName: "monthly_reports_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "financial_groups"
            referencedColumns: ["id"]
          },
        ]
      }
      phone_verifications: {
        Row: {
          created_at: string | null
          expires_at: string
          id: string
          phone: string
          user_id: string
          verification_code: string
          verified_at: string | null
        }
        Insert: {
          created_at?: string | null
          expires_at?: string
          id?: string
          phone: string
          user_id: string
          verification_code: string
          verified_at?: string | null
        }
        Update: {
          created_at?: string | null
          expires_at?: string
          id?: string
          phone?: string
          user_id?: string
          verification_code?: string
          verified_at?: string | null
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          email_verification_sent_at: string | null
          email_verification_token: string | null
          email_verified: boolean
          full_name: string | null
          id: string
          phone: string | null
          phone_verification_code: string | null
          phone_verified: boolean
          updated_at: string
          user_id: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          email_verification_sent_at?: string | null
          email_verification_token?: string | null
          email_verified?: boolean
          full_name?: string | null
          id?: string
          phone?: string | null
          phone_verification_code?: string | null
          phone_verified?: boolean
          updated_at?: string
          user_id: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          email_verification_sent_at?: string | null
          email_verification_token?: string | null
          email_verified?: boolean
          full_name?: string | null
          id?: string
          phone?: string | null
          phone_verification_code?: string | null
          phone_verified?: boolean
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      reminders: {
        Row: {
          amount: number | null
          completed_at: string | null
          created_at: string
          created_by_user_id: string | null
          description: string | null
          due_date: string | null
          group_id: string | null
          id: string
          is_completed: boolean
          is_recurring: boolean | null
          parent_reminder_id: string | null
          recurrence_day: number | null
          recurrence_type: string | null
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          amount?: number | null
          completed_at?: string | null
          created_at?: string
          created_by_user_id?: string | null
          description?: string | null
          due_date?: string | null
          group_id?: string | null
          id?: string
          is_completed?: boolean
          is_recurring?: boolean | null
          parent_reminder_id?: string | null
          recurrence_day?: number | null
          recurrence_type?: string | null
          title: string
          updated_at?: string
          user_id: string
        }
        Update: {
          amount?: number | null
          completed_at?: string | null
          created_at?: string
          created_by_user_id?: string | null
          description?: string | null
          due_date?: string | null
          group_id?: string | null
          id?: string
          is_completed?: boolean
          is_recurring?: boolean | null
          parent_reminder_id?: string | null
          recurrence_day?: number | null
          recurrence_type?: string | null
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "reminders_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "financial_groups"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reminders_parent_reminder_id_fkey"
            columns: ["parent_reminder_id"]
            isOneToOne: false
            referencedRelation: "reminders"
            referencedColumns: ["id"]
          },
        ]
      }
      transactions: {
        Row: {
          account_id: string
          amount: number
          category: string
          created_at: string
          created_by_user_id: string | null
          date: string
          description: string | null
          group_id: string | null
          id: string
          transfer_to_account_id: string | null
          type: string
          updated_at: string
          user_id: string
        }
        Insert: {
          account_id: string
          amount: number
          category: string
          created_at?: string
          created_by_user_id?: string | null
          date?: string
          description?: string | null
          group_id?: string | null
          id?: string
          transfer_to_account_id?: string | null
          type: string
          updated_at?: string
          user_id: string
        }
        Update: {
          account_id?: string
          amount?: number
          category?: string
          created_at?: string
          created_by_user_id?: string | null
          date?: string
          description?: string | null
          group_id?: string | null
          id?: string
          transfer_to_account_id?: string | null
          type?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "transactions_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "bank_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transactions_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "financial_groups"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transactions_transfer_to_account_id_fkey"
            columns: ["transfer_to_account_id"]
            isOneToOne: false
            referencedRelation: "bank_accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      user_progress: {
        Row: {
          created_at: string
          id: string
          last_activity_date: string | null
          level: number
          streak_days: number
          transactions_count: number
          updated_at: string
          user_id: string
          xp: number
        }
        Insert: {
          created_at?: string
          id?: string
          last_activity_date?: string | null
          level?: number
          streak_days?: number
          transactions_count?: number
          updated_at?: string
          user_id: string
          xp?: number
        }
        Update: {
          created_at?: string
          id?: string
          last_activity_date?: string | null
          level?: number
          streak_days?: number
          transactions_count?: number
          updated_at?: string
          user_id?: string
          xp?: number
        }
        Relationships: []
      }
      user_subscriptions: {
        Row: {
          ad_access_expires_at: string | null
          created_at: string | null
          id: string
          is_premium: boolean | null
          premium_expires_at: string | null
          premium_started_at: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          ad_access_expires_at?: string | null
          created_at?: string | null
          id?: string
          is_premium?: boolean | null
          premium_expires_at?: string | null
          premium_started_at?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          ad_access_expires_at?: string | null
          created_at?: string | null
          id?: string
          is_premium?: boolean | null
          premium_expires_at?: string | null
          premium_started_at?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      delete_financial_group: { Args: { _group_id: string }; Returns: boolean }
      get_auth_email: { Args: never; Returns: string }
      has_group_permission: {
        Args: { _group_id: string; _permission: string; _user_id: string }
        Returns: boolean
      }
      is_group_admin: {
        Args: { _group_id: string; _user_id: string }
        Returns: boolean
      }
      is_group_member: {
        Args: { _group_id: string; _user_id: string }
        Returns: boolean
      }
      update_financial_group: {
        Args: { _description?: string; _group_id: string; _name: string }
        Returns: {
          created_at: string
          created_by: string
          description: string | null
          id: string
          name: string
          updated_at: string
        }
        SetofOptions: {
          from: "*"
          to: "financial_groups"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      users_share_group: {
        Args: { _target_user_id: string; _viewer_id: string }
        Returns: boolean
      }
    }
    Enums: {
      group_role: "admin" | "member"
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
      group_role: ["admin", "member"],
    },
  },
} as const
