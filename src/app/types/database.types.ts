export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: '14.4';
  };
  public: {
    Tables: {
      AUDIT_LOG: {
        Row: {
          audit_log_id: number;
          created_at: string;
          created_by: number | null;
          deleted_at: string | null;
          is_deleted: boolean;
          new_values: string | null;
          old_values: string | null;
          operation_type: string;
          table_name: string;
          updated_at: string | null;
          updated_by: number | null;
          user_session_id: number;
        };
        Insert: {
          audit_log_id?: number;
          created_at: string;
          created_by?: number | null;
          deleted_at?: string | null;
          is_deleted?: boolean;
          new_values?: string | null;
          old_values?: string | null;
          operation_type: string;
          table_name: string;
          updated_at?: string | null;
          updated_by?: number | null;
          user_session_id: number;
        };
        Update: {
          audit_log_id?: number;
          created_at?: string;
          created_by?: number | null;
          deleted_at?: string | null;
          is_deleted?: boolean;
          new_values?: string | null;
          old_values?: string | null;
          operation_type?: string;
          table_name?: string;
          updated_at?: string | null;
          updated_by?: number | null;
          user_session_id?: number;
        };
        Relationships: [
          {
            foreignKeyName: 'AUDIT_LOG_user_session_id_fkey';
            columns: ['user_session_id'];
            isOneToOne: false;
            referencedRelation: 'USER_SESSION';
            referencedColumns: ['user_session_id'];
          },
        ];
      };
      CATALOG: {
        Row: {
          catalog_id: number;
          created_at: string;
          created_by: number | null;
          deleted_at: string | null;
          description: string;
          is_deleted: boolean;
          neumonic: string;
          table_id: number;
          table_name: string;
          updated_at: string | null;
          updated_by: number | null;
          value: string;
        };
        Insert: {
          catalog_id?: number;
          created_at: string;
          created_by?: number | null;
          deleted_at?: string | null;
          description: string;
          is_deleted?: boolean;
          neumonic: string;
          table_id: number;
          table_name: string;
          updated_at?: string | null;
          updated_by?: number | null;
          value: string;
        };
        Update: {
          catalog_id?: number;
          created_at?: string;
          created_by?: number | null;
          deleted_at?: string | null;
          description?: string;
          is_deleted?: boolean;
          neumonic?: string;
          table_id?: number;
          table_name?: string;
          updated_at?: string | null;
          updated_by?: number | null;
          value?: string;
        };
        Relationships: [];
      };
      INVITATION: {
        Row: {
          created_at: string;
          created_by: number | null;
          deleted_at: string | null;
          expiration_date: string | null;
          invitation_id: number;
          is_deleted: boolean;
          send_date: string | null;
          status: string | null;
          token: string | null;
          updated_at: string | null;
          updated_by: number | null;
          user_league_id: number;
        };
        Insert: {
          created_at: string;
          created_by?: number | null;
          deleted_at?: string | null;
          expiration_date?: string | null;
          invitation_id?: number;
          is_deleted?: boolean;
          send_date?: string | null;
          status?: string | null;
          token?: string | null;
          updated_at?: string | null;
          updated_by?: number | null;
          user_league_id: number;
        };
        Update: {
          created_at?: string;
          created_by?: number | null;
          deleted_at?: string | null;
          expiration_date?: string | null;
          invitation_id?: number;
          is_deleted?: boolean;
          send_date?: string | null;
          status?: string | null;
          token?: string | null;
          updated_at?: string | null;
          updated_by?: number | null;
          user_league_id?: number;
        };
        Relationships: [
          {
            foreignKeyName: 'INVITATION_user_league_id_fkey';
            columns: ['user_league_id'];
            isOneToOne: false;
            referencedRelation: 'USER_LEAGUE';
            referencedColumns: ['user_league_id'];
          },
        ];
      };
      LEAGUE: {
        Row: {
          catalog_id: number;
          created_at: string;
          created_by: number | null;
          deleted_at: string | null;
          invitation_code: string | null;
          is_deleted: boolean;
          league_id: number;
          name: string;
          status: string | null;
          updated_at: string | null;
          updated_by: number | null;
          user_id: number;
          world_league_id: number;
        };
        Insert: {
          catalog_id: number;
          created_at: string;
          created_by?: number | null;
          deleted_at?: string | null;
          invitation_code?: string | null;
          is_deleted?: boolean;
          league_id?: number;
          name: string;
          status?: string | null;
          updated_at?: string | null;
          updated_by?: number | null;
          user_id: number;
          world_league_id: number;
        };
        Update: {
          catalog_id?: number;
          created_at?: string;
          created_by?: number | null;
          deleted_at?: string | null;
          invitation_code?: string | null;
          is_deleted?: boolean;
          league_id?: number;
          name?: string;
          status?: string | null;
          updated_at?: string | null;
          updated_by?: number | null;
          user_id?: number;
          world_league_id?: number;
        };
        Relationships: [
          {
            foreignKeyName: 'LEAGUE_catalog_id_fkey';
            columns: ['catalog_id'];
            isOneToOne: false;
            referencedRelation: 'CATALOG';
            referencedColumns: ['catalog_id'];
          },
          {
            foreignKeyName: 'LEAGUE_user_id_fkey';
            columns: ['user_id'];
            isOneToOne: false;
            referencedRelation: 'USER';
            referencedColumns: ['user_id'];
          },
          {
            foreignKeyName: 'LEAGUE_world_league_id_fkey';
            columns: ['world_league_id'];
            isOneToOne: false;
            referencedRelation: 'WORLD_LEAGUE';
            referencedColumns: ['world_league_id'];
          },
        ];
      };
      LEAGUE_REWARD: {
        Row: {
          created_at: string;
          created_by: number | null;
          deleted_at: string | null;
          global_prize_1pct: number | null;
          is_deleted: boolean;
          league_id: number;
          league_reward_id: number;
          mundial_id: number;
          platform_fee_5pct: number | null;
          total_collected_amount: number | null;
          updated_at: string | null;
          updated_by: number | null;
        };
        Insert: {
          created_at: string;
          created_by?: number | null;
          deleted_at?: string | null;
          global_prize_1pct?: number | null;
          is_deleted?: boolean;
          league_id: number;
          league_reward_id?: number;
          mundial_id: number;
          platform_fee_5pct?: number | null;
          total_collected_amount?: number | null;
          updated_at?: string | null;
          updated_by?: number | null;
        };
        Update: {
          created_at?: string;
          created_by?: number | null;
          deleted_at?: string | null;
          global_prize_1pct?: number | null;
          is_deleted?: boolean;
          league_id?: number;
          league_reward_id?: number;
          mundial_id?: number;
          platform_fee_5pct?: number | null;
          total_collected_amount?: number | null;
          updated_at?: string | null;
          updated_by?: number | null;
        };
        Relationships: [
          {
            foreignKeyName: 'LEAGUE_REWARD_league_id_fkey';
            columns: ['league_id'];
            isOneToOne: false;
            referencedRelation: 'LEAGUE';
            referencedColumns: ['league_id'];
          },
        ];
      };
      MATCH: {
        Row: {
          created_at: string;
          created_by: number | null;
          deleted_at: string | null;
          first_team_id: number;
          first_team_total: number;
          is_deleted: boolean;
          league_id: number;
          match_id: number;
          second_team_id: number;
          second_team_total: number;
          stadium_id: number;
          start_time: string;
          updated_at: string | null;
          updated_by: number | null;
        };
        Insert: {
          created_at: string;
          created_by?: number | null;
          deleted_at?: string | null;
          first_team_id: number;
          first_team_total: number;
          is_deleted?: boolean;
          league_id: number;
          match_id?: number;
          second_team_id: number;
          second_team_total: number;
          stadium_id: number;
          start_time: string;
          updated_at?: string | null;
          updated_by?: number | null;
        };
        Update: {
          created_at?: string;
          created_by?: number | null;
          deleted_at?: string | null;
          first_team_id?: number;
          first_team_total?: number;
          is_deleted?: boolean;
          league_id?: number;
          match_id?: number;
          second_team_id?: number;
          second_team_total?: number;
          stadium_id?: number;
          start_time?: string;
          updated_at?: string | null;
          updated_by?: number | null;
        };
        Relationships: [
          {
            foreignKeyName: 'MATCH_first_team_id_fkey';
            columns: ['first_team_id'];
            isOneToOne: false;
            referencedRelation: 'TEAM';
            referencedColumns: ['team_id'];
          },
          {
            foreignKeyName: 'MATCH_league_id_fkey';
            columns: ['league_id'];
            isOneToOne: false;
            referencedRelation: 'LEAGUE';
            referencedColumns: ['league_id'];
          },
          {
            foreignKeyName: 'MATCH_second_team_id_fkey';
            columns: ['second_team_id'];
            isOneToOne: false;
            referencedRelation: 'TEAM';
            referencedColumns: ['team_id'];
          },
          {
            foreignKeyName: 'MATCH_stadium_id_fkey';
            columns: ['stadium_id'];
            isOneToOne: false;
            referencedRelation: 'STADIUM';
            referencedColumns: ['stadium_id'];
          },
        ];
      };
      MATCH_PERIOD: {
        Row: {
          catalog_id: number;
          created_at: string;
          created_by: number | null;
          deleted_at: string | null;
          first_team_score: number | null;
          is_deleted: boolean;
          match_id: number;
          period_id: number;
          second_team_score: number | null;
          updated_at: string | null;
          updated_by: number | null;
        };
        Insert: {
          catalog_id: number;
          created_at: string;
          created_by?: number | null;
          deleted_at?: string | null;
          first_team_score?: number | null;
          is_deleted?: boolean;
          match_id: number;
          period_id?: number;
          second_team_score?: number | null;
          updated_at?: string | null;
          updated_by?: number | null;
        };
        Update: {
          catalog_id?: number;
          created_at?: string;
          created_by?: number | null;
          deleted_at?: string | null;
          first_team_score?: number | null;
          is_deleted?: boolean;
          match_id?: number;
          period_id?: number;
          second_team_score?: number | null;
          updated_at?: string | null;
          updated_by?: number | null;
        };
        Relationships: [
          {
            foreignKeyName: 'MATCH_PERIOD_catalog_id_fkey';
            columns: ['catalog_id'];
            isOneToOne: false;
            referencedRelation: 'CATALOG';
            referencedColumns: ['catalog_id'];
          },
          {
            foreignKeyName: 'MATCH_PERIOD_match_id_fkey';
            columns: ['match_id'];
            isOneToOne: false;
            referencedRelation: 'MATCH';
            referencedColumns: ['match_id'];
          },
        ];
      };
      PERMISSION: {
        Row: {
          created_at: string;
          created_by: number | null;
          deleted_at: string | null;
          description: string | null;
          is_deleted: boolean;
          name: string;
          permission_id: number;
          updated_at: string | null;
          updated_by: number | null;
        };
        Insert: {
          created_at: string;
          created_by?: number | null;
          deleted_at?: string | null;
          description?: string | null;
          is_deleted?: boolean;
          name: string;
          permission_id?: number;
          updated_at?: string | null;
          updated_by?: number | null;
        };
        Update: {
          created_at?: string;
          created_by?: number | null;
          deleted_at?: string | null;
          description?: string | null;
          is_deleted?: boolean;
          name?: string;
          permission_id?: number;
          updated_at?: string | null;
          updated_by?: number | null;
        };
        Relationships: [];
      };
      PREDICTION: {
        Row: {
          created_at: string;
          created_by: number | null;
          deleted_at: string | null;
          first_team_score: number;
          is_deleted: boolean;
          match_id: number;
          prediction_id: number;
          second_team_score: number;
          turn: number;
          updated_at: string | null;
          updated_by: number | null;
          user_league_id: number;
        };
        Insert: {
          created_at: string;
          created_by?: number | null;
          deleted_at?: string | null;
          first_team_score?: number;
          is_deleted?: boolean;
          match_id: number;
          prediction_id?: number;
          second_team_score?: number;
          turn?: number;
          updated_at?: string | null;
          updated_by?: number | null;
          user_league_id: number;
        };
        Update: {
          created_at?: string;
          created_by?: number | null;
          deleted_at?: string | null;
          first_team_score?: number;
          is_deleted?: boolean;
          match_id?: number;
          prediction_id?: number;
          second_team_score?: number;
          turn?: number;
          updated_at?: string | null;
          updated_by?: number | null;
          user_league_id?: number;
        };
        Relationships: [
          {
            foreignKeyName: 'PREDICTION_match_id_fkey';
            columns: ['match_id'];
            isOneToOne: false;
            referencedRelation: 'MATCH';
            referencedColumns: ['match_id'];
          },
          {
            foreignKeyName: 'PREDICTION_user_league_id_fkey';
            columns: ['user_league_id'];
            isOneToOne: false;
            referencedRelation: 'USER_LEAGUE';
            referencedColumns: ['user_league_id'];
          },
        ];
      };
      ROLE: {
        Row: {
          created_at: string;
          created_by: number | null;
          deleted_at: string | null;
          description: string | null;
          is_deleted: boolean;
          name: string;
          role_id: number;
          updated_at: string | null;
          updated_by: number | null;
        };
        Insert: {
          created_at: string;
          created_by?: number | null;
          deleted_at?: string | null;
          description?: string | null;
          is_deleted?: boolean;
          name: string;
          role_id?: number;
          updated_at?: string | null;
          updated_by?: number | null;
        };
        Update: {
          created_at?: string;
          created_by?: number | null;
          deleted_at?: string | null;
          description?: string | null;
          is_deleted?: boolean;
          name?: string;
          role_id?: number;
          updated_at?: string | null;
          updated_by?: number | null;
        };
        Relationships: [];
      };
      ROLE_PERMISSION: {
        Row: {
          created_at: string;
          created_by: number | null;
          deleted_at: string | null;
          is_deleted: boolean;
          permission_id: number;
          role_id: number;
          role_permission_id: number;
          updated_at: string | null;
          updated_by: number | null;
        };
        Insert: {
          created_at: string;
          created_by?: number | null;
          deleted_at?: string | null;
          is_deleted?: boolean;
          permission_id: number;
          role_id: number;
          role_permission_id?: number;
          updated_at?: string | null;
          updated_by?: number | null;
        };
        Update: {
          created_at?: string;
          created_by?: number | null;
          deleted_at?: string | null;
          is_deleted?: boolean;
          permission_id?: number;
          role_id?: number;
          role_permission_id?: number;
          updated_at?: string | null;
          updated_by?: number | null;
        };
        Relationships: [
          {
            foreignKeyName: 'ROLE_PERMISSION_permission_id_fkey';
            columns: ['permission_id'];
            isOneToOne: false;
            referencedRelation: 'PERMISSION';
            referencedColumns: ['permission_id'];
          },
          {
            foreignKeyName: 'ROLE_PERMISSION_role_id_fkey';
            columns: ['role_id'];
            isOneToOne: false;
            referencedRelation: 'ROLE';
            referencedColumns: ['role_id'];
          },
        ];
      };
      RULES_LEAGUE: {
        Row: {
          created_at: string;
          created_by: number | null;
          deleted_at: string | null;
          description: string;
          dimension: string;
          is_deleted: boolean;
          league_id: number;
          rules_league_id: number;
          updated_at: string | null;
          updated_by: number | null;
          value: string;
        };
        Insert: {
          created_at: string;
          created_by?: number | null;
          deleted_at?: string | null;
          description: string;
          dimension: string;
          is_deleted?: boolean;
          league_id: number;
          rules_league_id?: number;
          updated_at?: string | null;
          updated_by?: number | null;
          value: string;
        };
        Update: {
          created_at?: string;
          created_by?: number | null;
          deleted_at?: string | null;
          description?: string;
          dimension?: string;
          is_deleted?: boolean;
          league_id?: number;
          rules_league_id?: number;
          updated_at?: string | null;
          updated_by?: number | null;
          value?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'RULES_LEAGUE_league_id_fkey';
            columns: ['league_id'];
            isOneToOne: false;
            referencedRelation: 'LEAGUE';
            referencedColumns: ['league_id'];
          },
        ];
      };
      STADIUM: {
        Row: {
          catalog_id: number;
          created_at: string;
          created_by: number | null;
          deleted_at: string | null;
          is_deleted: boolean;
          stadium_id: number;
          updated_at: string | null;
          updated_by: number | null;
          name: string | null;
        };
        Insert: {
          catalog_id: number;
          created_at: string;
          created_by?: number | null;
          deleted_at?: string | null;
          is_deleted?: boolean;
          stadium_id?: number;
          updated_at?: string | null;
          updated_by?: number | null;
        };
        Update: {
          catalog_id?: number;
          created_at?: string;
          created_by?: number | null;
          deleted_at?: string | null;
          is_deleted?: boolean;
          stadium_id?: number;
          updated_at?: string | null;
          updated_by?: number | null;
        };
        Relationships: [
          {
            foreignKeyName: 'STADIUM_catalog_id_fkey';
            columns: ['catalog_id'];
            isOneToOne: false;
            referencedRelation: 'CATALOG';
            referencedColumns: ['catalog_id'];
          },
        ];
      };
      TEAM: {
        Row: {
          catalog_id: number;
          created_at: string;
          created_by: number | null;
          deleted_at: string | null;
          is_deleted: boolean;
          name: string;
          team_id: number;
          updated_at: string | null;
          updated_by: number | null;
        };
        Insert: {
          catalog_id: number;
          created_at: string;
          created_by?: number | null;
          deleted_at?: string | null;
          is_deleted?: boolean;
          name: string;
          team_id?: number;
          updated_at?: string | null;
          updated_by?: number | null;
        };
        Update: {
          catalog_id?: number;
          created_at?: string;
          created_by?: number | null;
          deleted_at?: string | null;
          is_deleted?: boolean;
          name?: string;
          team_id?: number;
          updated_at?: string | null;
          updated_by?: number | null;
        };
        Relationships: [
          {
            foreignKeyName: 'TEAM_catalog_id_fkey';
            columns: ['catalog_id'];
            isOneToOne: false;
            referencedRelation: 'CATALOG';
            referencedColumns: ['catalog_id'];
          },
        ];
      };
      TRANSACTION: {
        Row: {
          amount: number;
          catalog_id: number;
          created_at: string;
          created_by: number | null;
          deleted_at: string | null;
          description: string | null;
          is_deleted: boolean;
          transaction_date: string | null;
          transaction_id: number;
          updated_at: string | null;
          updated_by: number | null;
          wallet_id: number;
        };
        Insert: {
          amount: number;
          catalog_id: number;
          created_at: string;
          created_by?: number | null;
          deleted_at?: string | null;
          description?: string | null;
          is_deleted?: boolean;
          transaction_date?: string | null;
          transaction_id?: number;
          updated_at?: string | null;
          updated_by?: number | null;
          wallet_id: number;
        };
        Update: {
          amount?: number;
          catalog_id?: number;
          created_at?: string;
          created_by?: number | null;
          deleted_at?: string | null;
          description?: string | null;
          is_deleted?: boolean;
          transaction_date?: string | null;
          transaction_id?: number;
          updated_at?: string | null;
          updated_by?: number | null;
          wallet_id?: number;
        };
        Relationships: [
          {
            foreignKeyName: 'TRANSACTION_catalog_id_fkey';
            columns: ['catalog_id'];
            isOneToOne: false;
            referencedRelation: 'CATALOG';
            referencedColumns: ['catalog_id'];
          },
          {
            foreignKeyName: 'TRANSACTION_wallet_id_fkey';
            columns: ['wallet_id'];
            isOneToOne: false;
            referencedRelation: 'WALLET';
            referencedColumns: ['wallet_id'];
          },
        ];
      };
      USER: {
        Row: {
          created_at: string;
          created_by: number | null;
          deleted_at: string | null;
          email: string;
          is_deleted: boolean;
          login: string | null;
          name: string;
          password_hash: string;
          registration_date: string;
          status: string;
          updated_at: string | null;
          updated_by: number | null;
          user_id: number;
          uuid: string;
        };
        Insert: {
          created_at: string;
          created_by?: number | null;
          deleted_at?: string | null;
          email: string;
          is_deleted?: boolean;
          login?: string | null;
          name: string;
          password_hash: string;
          registration_date: string;
          status: string;
          updated_at?: string | null;
          updated_by?: number | null;
          user_id?: number;
        };
        Update: {
          created_at?: string;
          created_by?: number | null;
          deleted_at?: string | null;
          email?: string;
          is_deleted?: boolean;
          login?: string | null;
          name?: string;
          password_hash?: string;
          registration_date?: string;
          status?: string;
          updated_at?: string | null;
          updated_by?: number | null;
          user_id?: number;
        };
        Relationships: [
          {
            foreignKeyName: 'USER_user_id_fkey';
            columns: ['user_id'];
            isOneToOne: true;
            referencedRelation: 'WALLET';
            referencedColumns: ['user_id'];
          },
        ];
      };
      USER_LEAGUE: {
        Row: {
          accumulated_points: number;
          created_at: string;
          created_by: number | null;
          deleted_at: string | null;
          is_deleted: boolean;
          league_id: number;
          updated_at: string | null;
          updated_by: number | null;
          user_id: number;
          user_league_id: number;
        };
        Insert: {
          accumulated_points: number;
          created_at: string;
          created_by?: number | null;
          deleted_at?: string | null;
          is_deleted?: boolean;
          league_id: number;
          updated_at?: string | null;
          updated_by?: number | null;
          user_id: number;
          user_league_id?: number;
        };
        Update: {
          accumulated_points?: number;
          created_at?: string;
          created_by?: number | null;
          deleted_at?: string | null;
          is_deleted?: boolean;
          league_id?: number;
          updated_at?: string | null;
          updated_by?: number | null;
          user_id?: number;
          user_league_id?: number;
        };
        Relationships: [
          {
            foreignKeyName: 'USER_LEAGUE_league_id_fkey';
            columns: ['league_id'];
            isOneToOne: false;
            referencedRelation: 'LEAGUE';
            referencedColumns: ['league_id'];
          },
          {
            foreignKeyName: 'USER_LEAGUE_user_id_fkey';
            columns: ['user_id'];
            isOneToOne: false;
            referencedRelation: 'USER';
            referencedColumns: ['user_id'];
          },
        ];
      };
      USER_LEAGUE_REWARD: {
        Row: {
          amount: number | null;
          created_at: string;
          created_by: number | null;
          deleted_at: string | null;
          is_deleted: boolean;
          league_user_reward_id: number;
          payment_date: string | null;
          status: string | null;
          updated_at: string | null;
          updated_by: number | null;
          user_league_id: number | null;
        };
        Insert: {
          amount?: number | null;
          created_at: string;
          created_by?: number | null;
          deleted_at?: string | null;
          is_deleted?: boolean;
          league_user_reward_id?: number;
          payment_date?: string | null;
          status?: string | null;
          updated_at?: string | null;
          updated_by?: number | null;
          user_league_id?: number | null;
        };
        Update: {
          amount?: number | null;
          created_at?: string;
          created_by?: number | null;
          deleted_at?: string | null;
          is_deleted?: boolean;
          league_user_reward_id?: number;
          payment_date?: string | null;
          status?: string | null;
          updated_at?: string | null;
          updated_by?: number | null;
          user_league_id?: number | null;
        };
        Relationships: [
          {
            foreignKeyName: 'USER_LEAGUE_REWARD_user_league_id_fkey';
            columns: ['user_league_id'];
            isOneToOne: true;
            referencedRelation: 'USER_LEAGUE';
            referencedColumns: ['user_league_id'];
          },
        ];
      };
      USER_ROLE: {
        Row: {
          created_at: string;
          created_by: number | null;
          deleted_at: string | null;
          is_deleted: boolean;
          role_id: number;
          updated_at: string | null;
          updated_by: number | null;
          user_id: number;
          user_role_id: number;
        };
        Insert: {
          created_at: string;
          created_by?: number | null;
          deleted_at?: string | null;
          is_deleted?: boolean;
          role_id: number;
          updated_at?: string | null;
          updated_by?: number | null;
          user_id: number;
          user_role_id?: number;
        };
        Update: {
          created_at?: string;
          created_by?: number | null;
          deleted_at?: string | null;
          is_deleted?: boolean;
          role_id?: number;
          updated_at?: string | null;
          updated_by?: number | null;
          user_id?: number;
          user_role_id?: number;
        };
        Relationships: [
          {
            foreignKeyName: 'USER_ROLE_role_id_fkey';
            columns: ['role_id'];
            isOneToOne: false;
            referencedRelation: 'ROLE';
            referencedColumns: ['role_id'];
          },
          {
            foreignKeyName: 'USER_ROLE_user_id_fkey';
            columns: ['user_id'];
            isOneToOne: false;
            referencedRelation: 'USER';
            referencedColumns: ['user_id'];
          },
        ];
      };
      USER_SESSION: {
        Row: {
          created_at: string;
          created_by: number | null;
          deleted_at: string | null;
          ip_address: string;
          is_deleted: boolean;
          login: string;
          session_id: string;
          sign_in: string | null;
          sign_out: string | null;
          updated_at: string | null;
          updated_by: number | null;
          user_agent: string | null;
          user_id: number;
          user_session_id: number;
        };
        Insert: {
          created_at: string;
          created_by?: number | null;
          deleted_at?: string | null;
          ip_address: string;
          is_deleted?: boolean;
          login: string;
          session_id: string;
          sign_in?: string | null;
          sign_out?: string | null;
          updated_at?: string | null;
          updated_by?: number | null;
          user_agent?: string | null;
          user_id: number;
          user_session_id?: number;
        };
        Update: {
          created_at?: string;
          created_by?: number | null;
          deleted_at?: string | null;
          ip_address?: string;
          is_deleted?: boolean;
          login?: string;
          session_id?: string;
          sign_in?: string | null;
          sign_out?: string | null;
          updated_at?: string | null;
          updated_by?: number | null;
          user_agent?: string | null;
          user_id?: number;
          user_session_id?: number;
        };
        Relationships: [
          {
            foreignKeyName: 'USER_SESSION_user_id_fkey';
            columns: ['user_id'];
            isOneToOne: false;
            referencedRelation: 'USER';
            referencedColumns: ['user_id'];
          },
        ];
      };
      WALLET: {
        Row: {
          balance: number;
          created_at: string;
          created_by: number | null;
          deleted_at: string | null;
          is_deleted: boolean;
          status: string | null;
          updated_at: string | null;
          updated_by: number | null;
          user_id: number;
          wallet_id: number;
        };
        Insert: {
          balance: number;
          created_at: string;
          created_by?: number | null;
          deleted_at?: string | null;
          is_deleted?: boolean;
          status?: string | null;
          updated_at?: string | null;
          updated_by?: number | null;
          user_id: number;
          wallet_id?: number;
        };
        Update: {
          balance?: number;
          created_at?: string;
          created_by?: number | null;
          deleted_at?: string | null;
          is_deleted?: boolean;
          status?: string | null;
          updated_at?: string | null;
          updated_by?: number | null;
          user_id?: number;
          wallet_id?: number;
        };
        Relationships: [];
      };
      WORLD_LEAGUE: {
        Row: {
          created_at: string;
          created_by: number | null;
          deleted_at: string | null;
          is_deleted: boolean;
          name: string | null;
          updated_at: string | null;
          updated_by: number | null;
          world_league_id: number;
        };
        Insert: {
          created_at: string;
          created_by?: number | null;
          deleted_at?: string | null;
          is_deleted?: boolean;
          name?: string | null;
          updated_at?: string | null;
          updated_by?: number | null;
          world_league_id?: number;
        };
        Update: {
          created_at?: string;
          created_by?: number | null;
          deleted_at?: string | null;
          is_deleted?: boolean;
          name?: string | null;
          updated_at?: string | null;
          updated_by?: number | null;
          world_league_id?: number;
        };
        Relationships: [];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      [_ in never]: never;
    };
    Enums: {
      [_ in never]: never;
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};

type DatabaseWithoutInternals = Omit<Database, '__InternalSupabase'>;

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, 'public'>];

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema['Tables'] & DefaultSchema['Views'])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Views'])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Views'])[TableName] extends {
      Row: infer R;
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema['Tables'] & DefaultSchema['Views'])
    ? (DefaultSchema['Tables'] & DefaultSchema['Views'])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R;
      }
      ? R
      : never
    : never;

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema['Tables']
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables']
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'][TableName] extends {
      Insert: infer I;
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema['Tables']
    ? DefaultSchema['Tables'][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I;
      }
      ? I
      : never
    : never;

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema['Tables']
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables']
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'][TableName] extends {
      Update: infer U;
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema['Tables']
    ? DefaultSchema['Tables'][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U;
      }
      ? U
      : never
    : never;

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema['Enums']
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions['schema']]['Enums']
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions['schema']]['Enums'][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema['Enums']
    ? DefaultSchema['Enums'][DefaultSchemaEnumNameOrOptions]
    : never;

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema['CompositeTypes']
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions['schema']]['CompositeTypes']
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions['schema']]['CompositeTypes'][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema['CompositeTypes']
    ? DefaultSchema['CompositeTypes'][PublicCompositeTypeNameOrOptions]
    : never;

export const Constants = {
  public: {
    Enums: {},
  },
} as const;
