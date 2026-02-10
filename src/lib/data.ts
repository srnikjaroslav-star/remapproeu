import { Service, WorkLog, Client, Analytics } from '@/types';

// In-memory data store (can be migrated to database)
let services: Service[] = [
  { id: '1', name: 'Oil Change', category: 'Maintenance', price_eur: 45, description: 'Standard oil change service' },
  { id: '2', name: 'Brake Pad Replacement', category: 'Maintenance', price_eur: 120, description: 'Front or rear brake pads' },
  { id: '3', name: 'Tire Rotation', category: 'Maintenance', price_eur: 30, description: 'Rotate all four tires' },
  { id: '4', name: 'Battery Replacement', category: 'Electrical', price_eur: 150, description: 'Car battery replacement' },
  { id: '5', name: 'AC Recharge', category: 'Climate', price_eur: 80, description: 'Air conditioning system recharge' },
  { id: '6', name: 'Transmission Fluid', category: 'Maintenance', price_eur: 100, description: 'Transmission fluid change' },
  { id: '7', name: 'Engine Diagnostic', category: 'Diagnostic', price_eur: 60, description: 'Full engine diagnostic scan' },
  { id: '8', name: 'Wheel Alignment', category: 'Maintenance', price_eur: 90, description: 'Four-wheel alignment' },
  { id: '9', name: 'Spark Plug Replacement', category: 'Maintenance', price_eur: 85, description: 'Replace spark plugs' },
  { id: '10', name: 'Headlight Bulb', category: 'Electrical', price_eur: 40, description: 'Headlight bulb replacement' },
];

let workLogs: WorkLog[] = [];
let clients: Client[] = [
  { slug: 'jan-cery', name: 'Jan Cery', created_at: new Date().toISOString() },
  { slug: 'jindrich-cerman', name: 'Jindrich Cerman', created_at: new Date().toISOString() },
];

// Get current month key (YYYY-MM)
export function getCurrentMonthKey(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
}

// Get all services
export function getServices(): Service[] {
  return services;
}

// Get services by category
export function getServicesByCategory(): Record<string, Service[]> {
  return services.reduce((acc, service) => {
    if (!acc[service.category]) {
      acc[service.category] = [];
    }
    acc[service.category].push(service);
    return acc;
  }, {} as Record<string, Service[]>);
}

// Get work logs for a specific slug (Row Level Security)
export function getWorkLogsBySlug(slug: string, monthKey?: string): WorkLog[] {
  const currentMonth = monthKey || getCurrentMonthKey();
  return workLogs.filter(log => log.slug === slug && log.month_key === currentMonth);
}

// Get all work logs for a slug (for archive view)
export function getAllWorkLogsBySlug(slug: string): WorkLog[] {
  return workLogs.filter(log => log.slug === slug);
}

// Create work log
export function createWorkLog(log: Omit<WorkLog, 'id' | 'created_at' | 'timestamp'>): WorkLog {
  const newLog: WorkLog = {
    ...log,
    id: `log-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    created_at: new Date().toISOString(),
    timestamp: new Date().toISOString(),
  };
  workLogs.push(newLog);
  return newLog;
}

// Get client by slug
export function getClientBySlug(slug: string): Client | undefined {
  return clients.find(c => c.slug === slug);
}

// Verify slug exists (security check)
export function verifySlug(slug: string): boolean {
  return clients.some(c => c.slug === slug);
}

// Get analytics for a slug
export function getAnalytics(slug: string): Analytics {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todayStr = today.toISOString();
  
  const currentMonth = getCurrentMonthKey();
  const currentMonthLogs = workLogs.filter(
    log => log.slug === slug && log.month_key === currentMonth
  );
  
  // Today's earnings
  const todayLogs = currentMonthLogs.filter(log => {
    const logDate = new Date(log.created_at);
    logDate.setHours(0, 0, 0, 0);
    return logDate.toISOString() === todayStr;
  });
  
  const todayEarnings = todayLogs.reduce((sum, log) => {
    const price = log.price_override ?? services.find(s => s.id === log.service_id)?.price_eur ?? 0;
    return sum + price;
  }, 0);
  
  // Monthly projected (based on current month progress)
  const daysInMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate();
  const currentDay = today.getDate();
  const monthlyEarnings = currentMonthLogs.reduce((sum, log) => {
    const price = log.price_override ?? services.find(s => s.id === log.service_id)?.price_eur ?? 0;
    return sum + price;
  }, 0);
  const monthlyProjected = (monthlyEarnings / currentDay) * daysInMonth;
  
  // Top service
  const serviceCounts: Record<string, { count: number; revenue: number; name: string }> = {};
  currentMonthLogs.forEach(log => {
    const service = services.find(s => s.id === log.service_id);
    if (service) {
      if (!serviceCounts[log.service_id]) {
        serviceCounts[log.service_id] = { count: 0, revenue: 0, name: service.name };
      }
      serviceCounts[log.service_id].count++;
      const price = log.price_override ?? service.price_eur;
      serviceCounts[log.service_id].revenue += price;
    }
  });
  
  const topServiceEntry = Object.values(serviceCounts).sort((a, b) => b.revenue - a.revenue)[0];
  const topService = topServiceEntry ? {
    name: topServiceEntry.name,
    count: topServiceEntry.count,
    revenue: topServiceEntry.revenue,
  } : null;
  
  return {
    todayEarnings,
    monthlyProjected: Math.round(monthlyProjected),
    topService,
  };
}

// Search work logs
export function searchWorkLogs(slug: string, query: string, monthKey?: string): WorkLog[] {
  const logs = getWorkLogsBySlug(slug, monthKey);
  const lowerQuery = query.toLowerCase();
  return logs.filter(log => 
    log.car_model.toLowerCase().includes(lowerQuery) ||
    (log.vin && log.vin.toLowerCase().includes(lowerQuery))
  );
}
