export interface Service {
  id: string;
  name: string;
  category: string;
  price_eur: number;
  description?: string;
}

export interface WorkLog {
  id: string;
  slug: string; // client workspace identifier
  service_id: string;
  car_model: string;
  vin?: string;
  price_override?: number; // if provided, overrides service price_eur
  month_key: string; // format: "YYYY-MM" for auto-reset and archive
  created_at: string;
  timestamp: string;
}

export interface Client {
  slug: string;
  name: string;
  created_at: string;
}

export interface Analytics {
  todayEarnings: number;
  monthlyProjected: number;
  topService: {
    name: string;
    count: number;
    revenue: number;
  } | null;
}
