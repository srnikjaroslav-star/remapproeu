import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://kivqvwdfujsnuwfxjtcz.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtpdnF2d2RmdWpzbnV3ZnhqdGN6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjcwMjQ1OTMsImV4cCI6MjA4MjYwMDU5M30.-iDvC0T6lozYv5d4xrHrHeS9PSGOfqwajZapMB7hqjQ';

export interface Order {
  id: string;
  order_number: string | null;
  customer_name: string;
  customer_email: string;
  car_brand: string;
  car_model: string;
  fuel_type: string;
  year: number;
  ecu_type: string;
  service_type: string[];
  total_price: number;
  status: string;
  file_url: string | null;
  result_file_url: string | null;
  legal_consent: boolean;
  created_at: string;
  updated_at: string;
}

export interface OrderInsert {
  customer_name: string;
  customer_email: string;
  car_brand: string;
  car_model: string;
  fuel_type: string;
  year: number;
  ecu_type: string;
  service_type: string[];
  total_price: number;
  status?: string;
  file_url?: string | null;
  result_file_url?: string | null;
  legal_consent: boolean;
}

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
