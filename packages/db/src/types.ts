export interface Database {
  public: {
    Tables: {
      organizations: {
        Row: {
          id: string;
          name: string;
          billing_email: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          billing_email?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          billing_email?: string | null;
          created_at?: string;
        };
      };
      restaurants: {
        Row: {
          id: string;
          organization_id: string;
          name: string;
          address: string | null;
          phone: string | null;
          timezone: string;
          settings: any;
          created_at: string;
        };
        Insert: {
          id?: string;
          organization_id: string;
          name: string;
          address?: string | null;
          phone?: string | null;
          timezone?: string;
          settings?: any;
          created_at?: string;
        };
        Update: {
          id?: string;
          organization_id?: string;
          name?: string;
          address?: string | null;
          phone?: string | null;
          timezone?: string;
          settings?: any;
          created_at?: string;
        };
      };
      users: {
        Row: {
          id: string;
          restaurant_id: string;
          name: string;
          email: string;
          password_hash: string;
          role: string;
          pin: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          restaurant_id: string;
          name: string;
          email: string;
          password_hash: string;
          role: string;
          pin?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          restaurant_id?: string;
          name?: string;
          email?: string;
          password_hash?: string;
          role?: string;
          pin?: string | null;
          created_at?: string;
        };
      };
    };
    Views: {
      [key: string]: any;
    };
    Functions: {
      [key: string]: any;
    };
    Enums: {
      [key: string]: any;
    };
  };
}
