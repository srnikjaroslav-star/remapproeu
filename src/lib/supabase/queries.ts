import { createClient } from './client';
import { Database } from '@/types/database';

type Client = Database['public']['Tables']['clients']['Row'];
type Service = Database['public']['Tables']['services']['Row'];
type WorkLog = Database['public']['Tables']['work_logs']['Row'] & {
  clients?: Client;
};

export type ServiceItem = {
  service_id: string;
  service_name: string;
  price: number;
};

export function getCurrentMonthKey(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
}

// Clients
export async function getAllClients() {
  const supabase = createClient();
  // Force fresh fetch - no cache
  const { data, error } = await supabase
    .from('clients')
    .select('*')
    .order('name');
  
  if (error) throw error;
  return data as Client[];
}

export async function getClientBySlug(slug: string) {
  const supabase = createClient();
  const { data, error } = await supabase
    .from('clients')
    .select('*')
    .eq('slug', slug)
    .single();
  
  if (error) throw error;
  return data as Client;
}

export async function getClientById(id: string) {
  const supabase = createClient();
  const { data, error } = await supabase
    .from('clients')
    .select('*')
    .eq('id', id)
    .single();
  
  if (error) throw error;
  return data as Client;
}

export async function createClientRecord(data: { name: string; slug: string }) {
  const supabase = createClient();
  const { data: client, error } = await supabase
    .from('clients')
    .insert(data)
    .select()
    .single();
  
  if (error) throw error;
  return client as Client;
}

export async function updateClient(id: string, data: { name?: string; slug?: string }) {
  const supabase = createClient();
  const { data: client, error } = await supabase
    .from('clients')
    .update(data)
    .eq('id', id)
    .select()
    .single();
  
  if (error) throw error;
  return client as Client;
}

export async function deleteClient(id: string) {
  const supabase = createClient();
  const { error } = await supabase
    .from('clients')
    .delete()
    .eq('id', id);
  
  if (error) throw error;
}

// Services
export async function getAllServices() {
  const supabase = createClient();
  // Force fresh fetch - no cache
  const { data, error } = await supabase
    .from('services')
    .select('*')
    .order('category, name');
  
  if (error) throw error;
  return data as Service[];
}

export async function getServicesByCategory() {
  const services = await getAllServices();
  return services.reduce((acc, service) => {
    if (!acc[service.category]) {
      acc[service.category] = [];
    }
    acc[service.category].push(service);
    return acc;
  }, {} as Record<string, Service[]>);
}

export async function createService(data: { name: string; price: number; category: string }) {
  const supabase = createClient();
  const { data: service, error } = await supabase
    .from('services')
    .insert(data)
    .select()
    .single();
  
  if (error) throw error;
  return service as Service;
}

export async function updateService(id: string, data: { name?: string; price?: number; category?: string }) {
  const supabase = createClient();
  const { data: service, error } = await supabase
    .from('services')
    .update(data)
    .eq('id', id)
    .select()
    .single();
  
  if (error) throw error;
  return service as Service;
}

export async function deleteService(id: string) {
  const supabase = createClient();
  const { error } = await supabase
    .from('services')
    .delete()
    .eq('id', id);
  
  if (error) throw error;
}

// Work Logs
export async function getWorkLogsByClient(
  clientId: string,
  monthKey?: string
) {
  const supabase = createClient();
  let query = supabase
    .from('work_logs')
    .select(`
      *,
      clients (*)
    `)
    .eq('client_id', clientId)
    .order('created_at', { ascending: false });

  if (monthKey) {
    query = query.eq('month_key', monthKey);
  }

  const { data, error } = await query;

  if (error) throw error;
  return data as WorkLog[];
}

export async function getAllWorkLogsByClient(clientId: string) {
  const supabase = createClient();
  const { data, error } = await supabase
    .from('work_logs')
    .select(`
      *,
      clients (*)
    `)
    .eq('client_id', clientId)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data as WorkLog[];
}

export async function createWorkLog(log: {
  client_id: string;
  car_info: string;
  service_items: ServiceItem[];
  total_price: number;
  month_key?: string;
}) {
  const supabase = createClient();
  const { data, error } = await supabase
    .from('work_logs')
    .insert({
      ...log,
      month_key: log.month_key || getCurrentMonthKey(),
    })
    .select(`
      *,
      clients (*)
    `)
    .single();

  if (error) throw error;
  return data as WorkLog;
}

export async function deleteWorkLog(logId: string) {
  const supabase = createClient();
  const { error } = await supabase
    .from('work_logs')
    .delete()
    .eq('id', logId);

  if (error) throw error;
}

// Helper function to parse service_items from JSONB
function parseServiceItems(serviceItems: any): ServiceItem[] {
  if (Array.isArray(serviceItems)) {
    return serviceItems as ServiceItem[];
  }
  return [];
}

// Analytics
export async function getAnalytics(clientId: string, monthKey?: string) {
  const currentMonth = monthKey || getCurrentMonthKey();
  const logs = await getWorkLogsByClient(clientId, currentMonth);
  
  // Get all services to map service_id to category
  const allServices = await getAllServices();
  const serviceCategoryMap = new Map<string, string>();
  allServices.forEach(service => {
    serviceCategoryMap.set(service.id, service.category);
  });

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todayStr = today.toISOString().split('T')[0];

  const todayLogs = logs.filter(log => {
    const logDate = new Date(log.created_at).toISOString().split('T')[0];
    return logDate === todayStr;
  });

  const todayEarnings = todayLogs.reduce((sum, log) => sum + Number(log.total_price), 0);

  const daysInMonth = new Date(
    today.getFullYear(),
    today.getMonth() + 1,
    0
  ).getDate();
  const currentDay = today.getDate();
  
  // Precise Revenue: Sum up the price of all services from all work logs
  // Calculate by summing all individual service prices from service_items
  let monthlyEarnings = 0;
  logs.forEach(log => {
    const items = parseServiceItems(log.service_items);
    if (items.length > 0) {
      // Sum all service prices from service_items
      const logTotal = items.reduce((sum, item) => sum + Number(item.price), 0);
      monthlyEarnings += logTotal;
    } else {
      // Fallback to total_price if service_items is empty
      monthlyEarnings += Number(log.total_price);
    }
  });
  
  const monthlyProjected = (monthlyEarnings / currentDay) * daysInMonth;

  // Unique Car Count: Count unique vehicles based on car_info string
  // Normalize by trimming whitespace and converting to lowercase for accurate counting
  const uniqueCars = new Set(
    logs
      .map(log => log.car_info?.trim().toLowerCase() || '')
      .filter(car => car.length > 0)
  );
  const carCount = uniqueCars.size;

  // Smart Top Service: Identify the most frequent service category
  const categoryCounts: Record<string, number> = {};
  
  logs.forEach(log => {
    const items = parseServiceItems(log.service_items);
    items.forEach(item => {
      const category = serviceCategoryMap.get(item.service_id);
      if (category) {
        categoryCounts[category] = (categoryCounts[category] || 0) + 1;
      }
    });
  });

  // Find the most frequent category
  const topCategoryEntry = Object.entries(categoryCounts)
    .sort((a, b) => b[1] - a[1])[0];

  return {
    todayEarnings: todayEarnings ?? 0,
    monthlyProjected: Math.round(monthlyProjected) || 0,
    monthlyTotal: monthlyEarnings ?? 0,
    carCount: carCount ?? 0,
    topService: topCategoryEntry ? {
      name: topCategoryEntry[0], // Category name
      count: topCategoryEntry[1], // Frequency count
      revenue: 0, // Not used for category-based top service
    } : null,
  };
}

// Daily revenue for chart
export async function getDailyRevenue(clientId: string, monthKey?: string) {
  const currentMonth = monthKey || getCurrentMonthKey();
  const logs = await getWorkLogsByClient(clientId, currentMonth);

  const dailyData: Record<string, number> = {};

  logs.forEach(log => {
    const date = new Date(log.created_at).toISOString().split('T')[0];
    dailyData[date] = (dailyData[date] || 0) + Number(log.total_price);
  });

  const [year, month] = currentMonth.split('-');
  const daysInMonth = new Date(
    parseInt(year),
    parseInt(month),
    0
  ).getDate();

  const chartData = Array.from({ length: daysInMonth }, (_, i) => {
    const day = i + 1;
    const date = `${currentMonth}-${String(day).padStart(2, '0')}`;
    return {
      date: `${day}`,
      revenue: dailyData[date] || 0,
    };
  });

  return chartData;
}
