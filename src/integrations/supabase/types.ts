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
      addon_library_groups: {
        Row: {
          created_at: string
          id: string
          is_required: boolean
          max_selections: number | null
          name: string
          position: number
          selection_type: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_required?: boolean
          max_selections?: number | null
          name: string
          position?: number
          selection_type?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          is_required?: boolean
          max_selections?: number | null
          name?: string
          position?: number
          selection_type?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      addon_library_options: {
        Row: {
          created_at: string
          default_quantity: number
          id: string
          is_available: boolean
          library_group_id: string
          name: string
          position: number
          price: number
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          default_quantity?: number
          id?: string
          is_available?: boolean
          library_group_id: string
          name: string
          position?: number
          price?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          default_quantity?: number
          id?: string
          is_available?: boolean
          library_group_id?: string
          name?: string
          position?: number
          price?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "addon_library_options_library_group_id_fkey"
            columns: ["library_group_id"]
            isOneToOne: false
            referencedRelation: "addon_library_groups"
            referencedColumns: ["id"]
          },
        ]
      }
      auth_otp_codes: {
        Row: {
          attempts: number
          code: string
          code_hash: string | null
          created_at: string
          expires_at: string
          id: string
          ip_address: string | null
          phone: string
          used_at: string | null
        }
        Insert: {
          attempts?: number
          code: string
          code_hash?: string | null
          created_at?: string
          expires_at: string
          id?: string
          ip_address?: string | null
          phone: string
          used_at?: string | null
        }
        Update: {
          attempts?: number
          code?: string
          code_hash?: string | null
          created_at?: string
          expires_at?: string
          id?: string
          ip_address?: string | null
          phone?: string
          used_at?: string | null
        }
        Relationships: []
      }
      categories: {
        Row: {
          created_at: string
          icon: string
          id: string
          menu_id: string
          name: string
          position: number
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          icon?: string
          id?: string
          menu_id: string
          name: string
          position?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          icon?: string
          id?: string
          menu_id?: string
          name?: string
          position?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "categories_menu_id_fkey"
            columns: ["menu_id"]
            isOneToOne: false
            referencedRelation: "menus"
            referencedColumns: ["id"]
          },
        ]
      }
      inventory_items: {
        Row: {
          block_sale_when_empty: boolean
          cost_per_unit: number | null
          created_at: string
          current_quantity: number
          id: string
          kind: string
          min_quantity: number
          name: string
          unit: string
          updated_at: string
          user_id: string
        }
        Insert: {
          block_sale_when_empty?: boolean
          cost_per_unit?: number | null
          created_at?: string
          current_quantity?: number
          id?: string
          kind?: string
          min_quantity?: number
          name: string
          unit?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          block_sale_when_empty?: boolean
          cost_per_unit?: number | null
          created_at?: string
          current_quantity?: number
          id?: string
          kind?: string
          min_quantity?: number
          name?: string
          unit?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      inventory_movements: {
        Row: {
          created_at: string
          id: string
          item_id: string
          movement_type: string
          order_id: string | null
          quantity: number
          reason: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          item_id: string
          movement_type: string
          order_id?: string | null
          quantity: number
          reason?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          item_id?: string
          movement_type?: string
          order_id?: string | null
          quantity?: number
          reason?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "inventory_movements_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "inventory_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_movements_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      menu_settings: {
        Row: {
          accept_delivery: boolean
          accept_dine_in: boolean
          accept_pickup: boolean
          accept_scheduled: boolean
          address: string | null
          auto_print: boolean
          business_hours: Json
          created_at: string
          delivery_fee: number
          delivery_time: string | null
          display_name: string | null
          id: string
          is_open: boolean
          layout_style: string
          logo_url: string | null
          menu_id: string
          opening_hours: string | null
          phone: string | null
          primary_color: string | null
          print_split_by_category: boolean
          scheduling_max_days: number
          scheduling_min_minutes: number
          updated_at: string
          user_id: string
          whatsapp_number: string | null
        }
        Insert: {
          accept_delivery?: boolean
          accept_dine_in?: boolean
          accept_pickup?: boolean
          accept_scheduled?: boolean
          address?: string | null
          auto_print?: boolean
          business_hours?: Json
          created_at?: string
          delivery_fee?: number
          delivery_time?: string | null
          display_name?: string | null
          id?: string
          is_open?: boolean
          layout_style?: string
          logo_url?: string | null
          menu_id: string
          opening_hours?: string | null
          phone?: string | null
          primary_color?: string | null
          print_split_by_category?: boolean
          scheduling_max_days?: number
          scheduling_min_minutes?: number
          updated_at?: string
          user_id: string
          whatsapp_number?: string | null
        }
        Update: {
          accept_delivery?: boolean
          accept_dine_in?: boolean
          accept_pickup?: boolean
          accept_scheduled?: boolean
          address?: string | null
          auto_print?: boolean
          business_hours?: Json
          created_at?: string
          delivery_fee?: number
          delivery_time?: string | null
          display_name?: string | null
          id?: string
          is_open?: boolean
          layout_style?: string
          logo_url?: string | null
          menu_id?: string
          opening_hours?: string | null
          phone?: string | null
          primary_color?: string | null
          print_split_by_category?: boolean
          scheduling_max_days?: number
          scheduling_min_minutes?: number
          updated_at?: string
          user_id?: string
          whatsapp_number?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "menu_settings_menu_id_fkey"
            columns: ["menu_id"]
            isOneToOne: true
            referencedRelation: "menus"
            referencedColumns: ["id"]
          },
        ]
      }
      menus: {
        Row: {
          cover_url: string | null
          created_at: string
          id: string
          is_active: boolean
          name: string
          slug: string
          updated_at: string
          user_id: string
        }
        Insert: {
          cover_url?: string | null
          created_at?: string
          id?: string
          is_active?: boolean
          name: string
          slug?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          cover_url?: string | null
          created_at?: string
          id?: string
          is_active?: boolean
          name?: string
          slug?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      order_items: {
        Row: {
          addons: Json | null
          category_name: string | null
          created_at: string
          id: string
          notes: string | null
          order_id: string
          product_id: string | null
          product_name: string
          quantity: number
          subtotal: number
          unit_price: number
        }
        Insert: {
          addons?: Json | null
          category_name?: string | null
          created_at?: string
          id?: string
          notes?: string | null
          order_id: string
          product_id?: string | null
          product_name: string
          quantity?: number
          subtotal?: number
          unit_price?: number
        }
        Update: {
          addons?: Json | null
          category_name?: string | null
          created_at?: string
          id?: string
          notes?: string | null
          order_id?: string
          product_id?: string | null
          product_name?: string
          quantity?: number
          subtotal?: number
          unit_price?: number
        }
        Relationships: [
          {
            foreignKeyName: "order_items_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      orders: {
        Row: {
          created_at: string
          customer_address: string | null
          customer_name: string
          customer_phone: string | null
          id: string
          is_manual: boolean
          is_open_tab: boolean
          is_scheduled: boolean
          menu_id: string
          notes: string | null
          order_type: string
          printed_at: string | null
          scheduled_for: string | null
          source: string
          status: string
          table_number: string | null
          total_amount: number
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          customer_address?: string | null
          customer_name: string
          customer_phone?: string | null
          id?: string
          is_manual?: boolean
          is_open_tab?: boolean
          is_scheduled?: boolean
          menu_id: string
          notes?: string | null
          order_type?: string
          printed_at?: string | null
          scheduled_for?: string | null
          source?: string
          status?: string
          table_number?: string | null
          total_amount?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          customer_address?: string | null
          customer_name?: string
          customer_phone?: string | null
          id?: string
          is_manual?: boolean
          is_open_tab?: boolean
          is_scheduled?: boolean
          menu_id?: string
          notes?: string | null
          order_type?: string
          printed_at?: string | null
          scheduled_for?: string | null
          source?: string
          status?: string
          table_number?: string | null
          total_amount?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "orders_menu_id_fkey"
            columns: ["menu_id"]
            isOneToOne: false
            referencedRelation: "menus"
            referencedColumns: ["id"]
          },
        ]
      }
      product_addon_groups: {
        Row: {
          created_at: string
          id: string
          is_required: boolean
          library_group_id: string | null
          max_selections: number | null
          name: string
          position: number
          product_id: string
          selection_type: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_required?: boolean
          library_group_id?: string | null
          max_selections?: number | null
          name: string
          position?: number
          product_id: string
          selection_type?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          is_required?: boolean
          library_group_id?: string | null
          max_selections?: number | null
          name?: string
          position?: number
          product_id?: string
          selection_type?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "product_addon_groups_library_group_id_fkey"
            columns: ["library_group_id"]
            isOneToOne: false
            referencedRelation: "addon_library_groups"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_addon_groups_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      product_addons: {
        Row: {
          created_at: string
          default_quantity: number
          group_id: string
          id: string
          is_available: boolean
          name: string
          position: number
          price: number
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          default_quantity?: number
          group_id: string
          id?: string
          is_available?: boolean
          name: string
          position?: number
          price?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          default_quantity?: number
          group_id?: string
          id?: string
          is_available?: boolean
          name?: string
          position?: number
          price?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "product_addons_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "product_addon_groups"
            referencedColumns: ["id"]
          },
        ]
      }
      product_recipes: {
        Row: {
          created_at: string
          id: string
          inventory_item_id: string
          product_id: string
          quantity_per_unit: number
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          inventory_item_id: string
          product_id: string
          quantity_per_unit?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          inventory_item_id?: string
          product_id?: string
          quantity_per_unit?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "product_recipes_inventory_item_id_fkey"
            columns: ["inventory_item_id"]
            isOneToOne: false
            referencedRelation: "inventory_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_recipes_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      products: {
        Row: {
          category: string | null
          category_id: string | null
          created_at: string
          description: string | null
          id: string
          image_url: string | null
          is_available: boolean
          menu_id: string
          name: string
          position: number
          price: number
          updated_at: string
          user_id: string
        }
        Insert: {
          category?: string | null
          category_id?: string | null
          created_at?: string
          description?: string | null
          id?: string
          image_url?: string | null
          is_available?: boolean
          menu_id: string
          name: string
          position?: number
          price?: number
          price_from_enabled?: boolean
          price_from_value?: number | null
          updated_at?: string
          user_id: string
        }
        Update: {
          category?: string | null
          category_id?: string | null
          created_at?: string
          description?: string | null
          id?: string
          image_url?: string | null
          is_available?: boolean
          menu_id?: string
          name?: string
          position?: number
          price?: number
          price_from_enabled?: boolean
          price_from_value?: number | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "products_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "products_menu_id_fkey"
            columns: ["menu_id"]
            isOneToOne: false
            referencedRelation: "menus"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string
          current_plan: string | null
          full_name: string | null
          id: string
          plan_active: boolean
          plan_expires_at: string | null
          plan_type: string | null
          restaurant_name: string
          signup_ip: string | null
          trial_ends_at: string | null
          trial_started_at: string | null
          updated_at: string
          whatsapp_addon_active: boolean
          whatsapp_addon_expires_at: string | null
          whatsapp_number: string | null
        }
        Insert: {
          created_at?: string
          current_plan?: string | null
          full_name?: string | null
          id: string
          plan_active?: boolean
          plan_expires_at?: string | null
          plan_type?: string | null
          restaurant_name: string
          signup_ip?: string | null
          trial_ends_at?: string | null
          trial_started_at?: string | null
          updated_at?: string
          whatsapp_addon_active?: boolean
          whatsapp_addon_expires_at?: string | null
          whatsapp_number?: string | null
        }
        Update: {
          created_at?: string
          current_plan?: string | null
          full_name?: string | null
          id?: string
          plan_active?: boolean
          plan_expires_at?: string | null
          plan_type?: string | null
          restaurant_name?: string
          signup_ip?: string | null
          trial_ends_at?: string | null
          trial_started_at?: string | null
          updated_at?: string
          whatsapp_addon_active?: boolean
          whatsapp_addon_expires_at?: string | null
          whatsapp_number?: string | null
        }
        Relationships: []
      }
      signup_ips: {
        Row: {
          created_at: string
          fingerprint: string | null
          id: string
          ip_address: string
          user_agent: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          fingerprint?: string | null
          id?: string
          ip_address: string
          user_agent?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          fingerprint?: string | null
          id?: string
          ip_address?: string
          user_agent?: string | null
          user_id?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      zapi_messages: {
        Row: {
          content: string | null
          created_at: string
          direction: string
          error: string | null
          from_number: string | null
          id: string
          message_type: string
          meta: Json | null
          order_id: string | null
          status: string
          to_number: string | null
          user_id: string
          wa_message_id: string | null
        }
        Insert: {
          content?: string | null
          created_at?: string
          direction: string
          error?: string | null
          from_number?: string | null
          id?: string
          message_type?: string
          meta?: Json | null
          order_id?: string | null
          status?: string
          to_number?: string | null
          user_id: string
          wa_message_id?: string | null
        }
        Update: {
          content?: string | null
          created_at?: string
          direction?: string
          error?: string | null
          from_number?: string | null
          id?: string
          message_type?: string
          meta?: Json | null
          order_id?: string | null
          status?: string
          to_number?: string | null
          user_id?: string
          wa_message_id?: string | null
        }
        Relationships: []
      }
      zapi_settings: {
        Row: {
          ai_cooldown_seconds: number
          ai_enabled: boolean
          ai_min_delay_seconds: number
          ai_system_prompt: string | null
          connection_status: string
          created_at: string
          id: string
          instance_id: string | null
          instance_name: string | null
          instance_token: string | null
          is_connected: boolean
          last_qr: string | null
          last_qr_at: string | null
          last_status_at: string | null
          notify_cancelled_enabled: boolean
          notify_cancelled_text: string
          notify_confirmed_enabled: boolean
          notify_confirmed_text: string
          notify_delivered_enabled: boolean
          notify_delivered_text: string
          notify_out_for_delivery_enabled: boolean
          notify_out_for_delivery_text: string
          notify_preparing_enabled: boolean
          notify_preparing_text: string
          notify_ready_enabled: boolean
          notify_ready_text: string
          phone_number: string | null
          profile_name: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          ai_cooldown_seconds?: number
          ai_enabled?: boolean
          ai_min_delay_seconds?: number
          ai_system_prompt?: string | null
          connection_status?: string
          created_at?: string
          id?: string
          instance_id?: string | null
          instance_name?: string | null
          instance_token?: string | null
          is_connected?: boolean
          last_qr?: string | null
          last_qr_at?: string | null
          last_status_at?: string | null
          notify_cancelled_enabled?: boolean
          notify_cancelled_text?: string
          notify_confirmed_enabled?: boolean
          notify_confirmed_text?: string
          notify_delivered_enabled?: boolean
          notify_delivered_text?: string
          notify_out_for_delivery_enabled?: boolean
          notify_out_for_delivery_text?: string
          notify_preparing_enabled?: boolean
          notify_preparing_text?: string
          notify_ready_enabled?: boolean
          notify_ready_text?: string
          phone_number?: string | null
          profile_name?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          ai_cooldown_seconds?: number
          ai_enabled?: boolean
          ai_min_delay_seconds?: number
          ai_system_prompt?: string | null
          connection_status?: string
          created_at?: string
          id?: string
          instance_id?: string | null
          instance_name?: string | null
          instance_token?: string | null
          is_connected?: boolean
          last_qr?: string | null
          last_qr_at?: string | null
          last_status_at?: string | null
          notify_cancelled_enabled?: boolean
          notify_cancelled_text?: string
          notify_confirmed_enabled?: boolean
          notify_confirmed_text?: string
          notify_delivered_enabled?: boolean
          notify_delivered_text?: string
          notify_out_for_delivery_enabled?: boolean
          notify_out_for_delivery_text?: string
          notify_preparing_enabled?: boolean
          notify_preparing_text?: string
          notify_ready_enabled?: boolean
          notify_ready_text?: string
          phone_number?: string | null
          profile_name?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      can_create_public_order_item: {
        Args: { _order_id: string; _product_id: string }
        Returns: boolean
      }
      create_public_menu_order: {
        Args: {
          _customer_address: string
          _customer_name: string
          _customer_phone: string
          _is_scheduled: boolean
          _items: Json
          _menu_id: string
          _notes: string
          _order_type: string
          _scheduled_for: string
          _total_amount: number
          _user_id: string
        }
        Returns: string
      }
      has_active_access: { Args: { _user_id: string }; Returns: boolean }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_ip_blocked: { Args: { _ip: string }; Returns: boolean }
    }
    Enums: {
      app_role: "admin" | "user"
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
      app_role: ["admin", "user"],
    },
  },
} as const
