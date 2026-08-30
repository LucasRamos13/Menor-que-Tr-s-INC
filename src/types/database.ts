/**
 * Hand-written mirror of the Supabase schema (see supabase/migrations).
 * If you regenerate this with `supabase gen types typescript`, keep the
 * shape compatible with how src/lib/supabase/client.ts + server.ts type
 * the client (Database["public"]["Tables"][...]).
 *
 * Every table entry needs `Relationships: []` (even though we don't use
 * PostgREST's FK-embedding features here) because @supabase/postgrest-js's
 * internal generics require a table to structurally match `GenericTable`
 * (`Row` + `Insert` + `Update` + `Relationships`) — without it, every
 * .insert()/.update()/.select() call silently degrades to `never`.
 */

export type Visibility = "shared" | "personal";
export type AccountType = "checking" | "savings" | "wallet" | "credit_card" | "investment" | "other";
export type TransactionType = "income" | "expense" | "transfer";
export type CategoryKind = "income" | "expense" | "both";
export type RecurrenceFrequency = "daily" | "weekly" | "monthly" | "yearly";
export type TaskStatus = "todo" | "in_progress" | "done";
export type TaskPriority = "low" | "normal" | "high" | "urgent";
export type SyncStatus = "synced" | "pending" | "conflict" | "error" | "deleted";

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          email: string;
          full_name: string | null;
          avatar_url: string | null;
          google_id: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: Partial<Database["public"]["Tables"]["profiles"]["Row"]> & { id: string; email: string };
        Update: Partial<Database["public"]["Tables"]["profiles"]["Row"]>;
        Relationships: [];
      };
      couples: {
        Row: { id: string; name: string; created_at: string; updated_at: string };
        Insert: Partial<Database["public"]["Tables"]["couples"]["Row"]>;
        Update: Partial<Database["public"]["Tables"]["couples"]["Row"]>;
        Relationships: [];
      };
      couple_members: {
        Row: {
          id: string;
          couple_id: string;
          user_id: string;
          role: "owner" | "member";
          joined_at: string;
        };
        Insert: Partial<Database["public"]["Tables"]["couple_members"]["Row"]> & {
          couple_id: string;
          user_id: string;
        };
        Update: Partial<Database["public"]["Tables"]["couple_members"]["Row"]>;
        Relationships: [
          {
            foreignKeyName: "couple_members_user_id_fkey";
            columns: ["user_id"];
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      couple_invites: {
        Row: {
          id: string;
          couple_id: string;
          code: string;
          created_by: string;
          created_at: string;
          expires_at: string;
          used_at: string | null;
          used_by: string | null;
        };
        Insert: Partial<Database["public"]["Tables"]["couple_invites"]["Row"]> & {
          couple_id: string;
          code: string;
          created_by: string;
        };
        Update: Partial<Database["public"]["Tables"]["couple_invites"]["Row"]>;
        Relationships: [];
      };
      accounts: {
        Row: {
          id: string;
          couple_id: string;
          name: string;
          type: AccountType;
          institution: string | null;
          initial_balance_cents: number;
          is_active: boolean;
          visibility: Visibility;
          owner_id: string | null;
          created_by: string;
          updated_by: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: Partial<Database["public"]["Tables"]["accounts"]["Row"]> & {
          couple_id: string;
          name: string;
          type: AccountType;
          created_by: string;
        };
        Update: Partial<Database["public"]["Tables"]["accounts"]["Row"]>;
        Relationships: [];
      };
      categories: {
        Row: {
          id: string;
          couple_id: string;
          name: string;
          icon: string | null;
          color: string | null;
          kind: CategoryKind;
          is_default: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: Partial<Database["public"]["Tables"]["categories"]["Row"]> & {
          couple_id: string;
          name: string;
        };
        Update: Partial<Database["public"]["Tables"]["categories"]["Row"]>;
        Relationships: [];
      };
      recurring_transactions: {
        Row: {
          id: string;
          couple_id: string;
          account_id: string;
          type: "income" | "expense";
          amount_cents: number;
          description: string;
          category_id: string | null;
          responsible_id: string | null;
          frequency: RecurrenceFrequency;
          interval_count: number;
          day_of_month: number | null;
          start_date: string;
          end_date: string | null;
          last_generated_date: string | null;
          is_active: boolean;
          created_by: string;
          created_at: string;
          updated_at: string;
        };
        Insert: Partial<Database["public"]["Tables"]["recurring_transactions"]["Row"]> & {
          couple_id: string;
          account_id: string;
          type: "income" | "expense";
          amount_cents: number;
          description: string;
          frequency: RecurrenceFrequency;
          start_date: string;
          created_by: string;
        };
        Update: Partial<Database["public"]["Tables"]["recurring_transactions"]["Row"]>;
        Relationships: [];
      };
      installments: {
        Row: {
          id: string;
          couple_id: string;
          account_id: string;
          description: string;
          total_amount_cents: number;
          installment_count: number;
          first_due_date: string;
          category_id: string | null;
          responsible_id: string | null;
          created_by: string;
          created_at: string;
          updated_at: string;
        };
        Insert: Partial<Database["public"]["Tables"]["installments"]["Row"]> & {
          couple_id: string;
          account_id: string;
          description: string;
          total_amount_cents: number;
          installment_count: number;
          first_due_date: string;
          created_by: string;
        };
        Update: Partial<Database["public"]["Tables"]["installments"]["Row"]>;
        Relationships: [];
      };
      transactions: {
        Row: {
          id: string;
          couple_id: string;
          account_id: string;
          transfer_account_id: string | null;
          type: TransactionType;
          amount_cents: number;
          description: string;
          category_id: string | null;
          responsible_id: string | null;
          date: string;
          is_paid: boolean;
          notes: string | null;
          recurring_transaction_id: string | null;
          installment_id: string | null;
          installment_number: number | null;
          installment_total: number | null;
          created_by: string;
          updated_by: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: Partial<Database["public"]["Tables"]["transactions"]["Row"]> & {
          couple_id: string;
          account_id: string;
          type: TransactionType;
          amount_cents: number;
          description: string;
          date: string;
          created_by: string;
        };
        Update: Partial<Database["public"]["Tables"]["transactions"]["Row"]>;
        Relationships: [];
      };
      budgets: {
        Row: {
          id: string;
          couple_id: string;
          category_id: string;
          year: number;
          month: number;
          limit_cents: number;
          created_at: string;
          updated_at: string;
        };
        Insert: Partial<Database["public"]["Tables"]["budgets"]["Row"]> & {
          couple_id: string;
          category_id: string;
          year: number;
          month: number;
          limit_cents: number;
        };
        Update: Partial<Database["public"]["Tables"]["budgets"]["Row"]>;
        Relationships: [];
      };
      financial_goals: {
        Row: {
          id: string;
          couple_id: string;
          name: string;
          description: string | null;
          icon: string | null;
          target_amount_cents: number;
          current_amount_cents: number;
          target_date: string | null;
          category: string | null;
          visibility: Visibility;
          owner_id: string | null;
          is_completed: boolean;
          created_by: string;
          created_at: string;
          updated_at: string;
        };
        Insert: Partial<Database["public"]["Tables"]["financial_goals"]["Row"]> & {
          couple_id: string;
          name: string;
          target_amount_cents: number;
          created_by: string;
        };
        Update: Partial<Database["public"]["Tables"]["financial_goals"]["Row"]>;
        Relationships: [];
      };
      goal_contributions: {
        Row: {
          id: string;
          goal_id: string;
          amount_cents: number;
          date: string;
          note: string | null;
          contributed_by: string | null;
          created_at: string;
        };
        Insert: Partial<Database["public"]["Tables"]["goal_contributions"]["Row"]> & {
          goal_id: string;
          amount_cents: number;
        };
        Update: Partial<Database["public"]["Tables"]["goal_contributions"]["Row"]>;
        Relationships: [];
      };
      task_lists: {
        Row: {
          id: string;
          couple_id: string;
          name: string;
          icon: string | null;
          color: string | null;
          position: number;
          created_at: string;
          updated_at: string;
        };
        Insert: Partial<Database["public"]["Tables"]["task_lists"]["Row"]> & {
          couple_id: string;
          name: string;
        };
        Update: Partial<Database["public"]["Tables"]["task_lists"]["Row"]>;
        Relationships: [];
      };
      tasks: {
        Row: {
          id: string;
          couple_id: string;
          list_id: string | null;
          title: string;
          description: string | null;
          status: TaskStatus;
          priority: TaskPriority;
          assignee_id: string | null;
          due_date: string | null;
          category: string | null;
          recurrence_rule: { frequency: RecurrenceFrequency; interval: number; end_date?: string } | null;
          position: number;
          created_by: string;
          completed_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: Partial<Database["public"]["Tables"]["tasks"]["Row"]> & {
          couple_id: string;
          title: string;
          created_by: string;
        };
        Update: Partial<Database["public"]["Tables"]["tasks"]["Row"]>;
        Relationships: [];
      };
      events: {
        Row: {
          id: string;
          couple_id: string;
          title: string;
          description: string | null;
          location: string | null;
          start_at: string;
          end_at: string;
          all_day: boolean;
          category: string | null;
          recurrence_rule: string | null;
          visibility: Visibility;
          owner_id: string | null;
          created_by: string;
          created_at: string;
          updated_at: string;
        };
        Insert: Partial<Database["public"]["Tables"]["events"]["Row"]> & {
          couple_id: string;
          title: string;
          start_at: string;
          end_at: string;
          created_by: string;
        };
        Update: Partial<Database["public"]["Tables"]["events"]["Row"]>;
        Relationships: [];
      };
      event_participants: {
        Row: { id: string; event_id: string; user_id: string; created_at: string };
        Insert: Partial<Database["public"]["Tables"]["event_participants"]["Row"]> & {
          event_id: string;
          user_id: string;
        };
        Update: Partial<Database["public"]["Tables"]["event_participants"]["Row"]>;
        Relationships: [];
      };
      important_dates: {
        Row: {
          id: string;
          couple_id: string;
          title: string;
          emoji: string | null;
          date: string;
          is_recurring_yearly: boolean;
          category: string | null;
          notes: string | null;
          created_by: string;
          created_at: string;
          updated_at: string;
        };
        Insert: Partial<Database["public"]["Tables"]["important_dates"]["Row"]> & {
          couple_id: string;
          title: string;
          date: string;
          created_by: string;
        };
        Update: Partial<Database["public"]["Tables"]["important_dates"]["Row"]>;
        Relationships: [];
      };
      google_calendar_connections: {
        Row: {
          id: string;
          user_id: string;
          couple_id: string;
          google_account_email: string;
          access_token: string;
          refresh_token: string;
          token_expires_at: string;
          scope: string;
          sync_enabled: boolean;
          last_synced_at: string | null;
          last_sync_status: "ok" | "error" | null;
          last_sync_error: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: Partial<Database["public"]["Tables"]["google_calendar_connections"]["Row"]> & {
          user_id: string;
          couple_id: string;
          google_account_email: string;
          access_token: string;
          refresh_token: string;
          token_expires_at: string;
          scope: string;
        };
        Update: Partial<Database["public"]["Tables"]["google_calendar_connections"]["Row"]>;
        Relationships: [];
      };
      google_calendar_selections: {
        Row: {
          id: string;
          connection_id: string;
          google_calendar_id: string;
          calendar_summary: string;
          is_syncing: boolean;
          sync_token: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: Partial<Database["public"]["Tables"]["google_calendar_selections"]["Row"]> & {
          connection_id: string;
          google_calendar_id: string;
          calendar_summary: string;
        };
        Update: Partial<Database["public"]["Tables"]["google_calendar_selections"]["Row"]>;
        Relationships: [];
      };
      calendar_sync_events: {
        Row: {
          id: string;
          couple_id: string;
          connection_id: string;
          internal_event_id: string | null;
          google_calendar_id: string;
          google_event_id: string;
          etag: string | null;
          google_updated_at: string | null;
          internal_updated_at: string | null;
          sync_status: SyncStatus;
          last_synced_at: string | null;
          last_error: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: Partial<Database["public"]["Tables"]["calendar_sync_events"]["Row"]> & {
          couple_id: string;
          connection_id: string;
          google_calendar_id: string;
          google_event_id: string;
        };
        Update: Partial<Database["public"]["Tables"]["calendar_sync_events"]["Row"]>;
        Relationships: [
          {
            foreignKeyName: "calendar_sync_events_internal_event_id_fkey";
            columns: ["internal_event_id"];
            referencedRelation: "events";
            referencedColumns: ["id"];
          },
        ];
      };
    };
    Views: Record<string, never>;
    Functions: {
      create_my_couple: { Args: { p_name?: string }; Returns: string };
      redeem_couple_invite: { Args: { p_code: string }; Returns: string };
      get_my_couple_id: { Args: Record<string, never>; Returns: string };
      is_couple_member: { Args: { p_couple_id: string }; Returns: boolean };
      get_couple_balance: { Args: { p_couple_id: string }; Returns: number };
      get_couple_month_summary: { Args: { p_couple_id: string; p_month_start: string }; Returns: { income_cents: number; expense_cents: number }[] };
    };
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
}

export type Tables<T extends keyof Database["public"]["Tables"]> = Database["public"]["Tables"][T]["Row"];
export type TablesInsert<T extends keyof Database["public"]["Tables"]> = Database["public"]["Tables"][T]["Insert"];
export type TablesUpdate<T extends keyof Database["public"]["Tables"]> = Database["public"]["Tables"][T]["Update"];
