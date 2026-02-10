export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      clients: {
        Row: {
          id: string
          name: string
          slug: string
          created_at: string
        }
        Insert: {
          id?: string
          name: string
          slug: string
          created_at?: string
        }
        Update: {
          id?: string
          name?: string
          slug?: string
          created_at?: string
        }
      }
      services: {
        Row: {
          id: string
          name: string
          category: string
          price: number
          created_at: string
        }
        Insert: {
          id?: string
          name: string
          category: string
          price: number
          created_at?: string
        }
        Update: {
          id?: string
          name?: string
          category?: string
          price?: number
          created_at?: string
        }
      }
      work_logs: {
        Row: {
          id: string
          client_id: string
          car_info: string
          service_items: Json
          total_price: number
          month_key: string
          created_at: string
        }
        Insert: {
          id?: string
          client_id: string
          car_info: string
          service_items?: Json
          total_price: number
          month_key?: string
          created_at?: string
        }
        Update: {
          id?: string
          client_id?: string
          car_info?: string
          service_items?: Json
          total_price?: number
          month_key?: string
          created_at?: string
        }
      }
    }
  }
}
