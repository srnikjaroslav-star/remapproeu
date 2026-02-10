'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { getAllServices, createService, updateService, deleteService } from '@/lib/supabase/queries';
import { createClient } from '@/lib/supabase/client';
import { Database } from '@/types/database';
import Sidebar from '@/components/Sidebar';
import Footer from '@/components/Footer';
import { getAllClients } from '@/lib/supabase/queries';
import { toast } from 'sonner';
import { Plus, Edit2, Trash2, X, Save } from 'lucide-react';

import { CustomSelect } from '@/components/ui/CustomSelect';
type Service = Database['public']['Tables']['services']['Row'];
type Client = Database['public']['Tables']['clients']['Row'];

const ALLOWED_EMAIL = 'info@remappro.eu';

export default function SettingsPage() {
  const [clients, setClients] = useState<Client[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [servicesByCategory, setServicesByCategory] = useState<Record<string, Service[]>>({});
  const [loading, setLoading] = useState(true);
  const [editingService, setEditingService] = useState<Service | null>(null);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);
  const router = useRouter();
  const supabase = createClient();

  // Check authentication first
  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    try {
      const { data: { session }, error } = await supabase.auth.getSession();
      
      if (error || !session) {
        router.push('/login');
        return;
      }

      // Verify email matches allowed email
      if (session.user.email !== ALLOWED_EMAIL) {
        await supabase.auth.signOut();
        router.push('/login');
        return;
      }

      setIsAuthenticated(true);
      setIsCheckingAuth(false);
    } catch (error) {
      console.error('Auth check error:', error);
      router.push('/login');
    }
  };

  // Listen for auth state changes
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_OUT' || !session) {
        router.push('/login');
      } else if (session && session.user.email !== ALLOWED_EMAIL) {
        supabase.auth.signOut();
        router.push('/login');
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (isAuthenticated) {
      loadData();
    }
  }, [isAuthenticated]);

  const loadData = async () => {
    try {
      // Force fresh fetch by adding cache-busting timestamp
      const timestamp = Date.now();
      const [clientsData, servicesData] = await Promise.all([
        getAllClients(),
        getAllServices(),
      ]);
      setClients(clientsData);
      setServices(servicesData);
      
      // Group by category
      const grouped = servicesData.reduce((acc, service) => {
        if (!acc[service.category]) {
          acc[service.category] = [];
        }
        acc[service.category].push(service);
        return acc;
      }, {} as Record<string, Service[]>);
      setServicesByCategory(grouped);
      
      // Force router refresh to invalidate cache
      router.refresh();
    } catch (error) {
      console.error('Error loading data:', error);
      toast.error('Nepodarilo sa načítať dáta');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (serviceId: string) => {
    if (deleteConfirm !== serviceId) {
      setDeleteConfirm(serviceId);
      return;
    }

    try {
      await deleteService(serviceId);
      toast.success('Služba bola vymazaná');
      setDeleteConfirm(null);
      loadData();
      router.refresh();
    } catch (error) {
      console.error('Error deleting service:', error);
      toast.error('Nepodarilo sa vymazať službu');
    }
  };

  if (isCheckingAuth) {
    return (
      <div className="min-h-screen bg-[#050505] flex items-center justify-center">
        <div className="text-[#00d2ff] animate-pulse">Kontrola prístupu...</div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return null; // Will redirect to login
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-[#050505] flex items-center justify-center">
        <div className="text-[#00d2ff]">Načítavam...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#050505] flex">
      <Sidebar
        clients={clients}
        onClientsUpdated={loadData}
      />
      <div className="flex-1 ml-64 flex flex-col">
        <main className="flex-1 p-4 md:p-6">
          <div className="max-w-7xl mx-auto space-y-4">
            <div className="flex justify-between items-center">
              <h1 className="text-2xl md:text-3xl font-bold neon-glow-text text-[#00d2ff]">
                Správa služieb
              </h1>
              <button
                onClick={() => setIsAddModalOpen(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-[#00d2ff]/20 hover:bg-[#00d2ff]/30 border border-[#00d2ff]/50 rounded-lg text-[#00d2ff] text-sm font-medium transition-all neon-glow min-h-[36px]"
              >
                <Plus size={14} />
                <span>Pridať službu</span>
              </button>
            </div>

            <div className="space-y-4">
              {Object.entries(servicesByCategory).map(([category, categoryServices]) => (
                <div key={category} className="glass rounded-xl p-4 border border-[#00d2ff]/20 neon-glow">
                  <h2 className="text-sm font-semibold text-[#00d2ff] mb-2">{category}</h2>
                  <div className="space-y-1">
                    {categoryServices.map((service) => (
                      <ServiceRow
                        key={service.id}
                        service={service}
                        onEdit={setEditingService}
                        onDelete={handleDelete}
                        deleteConfirm={deleteConfirm}
                        onUpdate={loadData}
                      />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </main>
        <Footer />
      </div>

      {/* Add Service Modal */}
      {isAddModalOpen && (
        <AddServiceModal
          onClose={() => setIsAddModalOpen(false)}
          onAdded={loadData}
        />
      )}

      {/* Edit Service Modal */}
      {editingService && (
        <EditServiceModal
          service={editingService}
          onClose={() => setEditingService(null)}
          onUpdated={loadData}
        />
      )}
    </div>
  );
}

function ServiceRow({
  service,
  onEdit,
  onDelete,
  deleteConfirm,
  onUpdate,
}: {
  service: Service;
  onEdit: (service: Service) => void;
  onDelete: (id: string) => void;
  deleteConfirm: string | null;
  onUpdate: () => void;
}) {
  return (
    <div className="flex items-center justify-between p-2 bg-white/5 rounded-lg border border-white/10 hover:bg-white/10 hover:border-[#00d2ff]/20 transition-colors">
      <div className="flex items-center gap-3 flex-1 min-w-0">
        <div className="text-white text-sm font-medium truncate">{service.name}</div>
        <div className="text-[#00d2ff] text-xs font-semibold neon-glow-text whitespace-nowrap">
          €{Number(service.price).toFixed(2)}
        </div>
      </div>
      <div className="flex items-center gap-1.5 flex-shrink-0">
        <button
          onClick={() => onEdit(service)}
          className="p-1.5 hover:bg-[#00d2ff]/20 rounded-lg text-[#00d2ff] transition-colors"
          aria-label="Upraviť"
        >
          <Edit2 size={14} />
        </button>
        <button
          onClick={() => onDelete(service.id)}
          className={`p-1.5 rounded-lg transition-colors ${
            deleteConfirm === service.id
              ? 'bg-red-500/20 text-red-400'
              : 'hover:bg-red-500/20 text-gray-400 hover:text-red-400'
          }`}
          aria-label="Vymazať"
        >
          {deleteConfirm === service.id ? (
            <span className="text-[10px] px-1">✓</span>
          ) : (
            <Trash2 size={14} />
          )}
        </button>
      </div>
    </div>
  );
}

function AddServiceModal({
  onClose,
  onAdded,
}: {
  onClose: () => void;
  onAdded: () => void;
}) {
  const [name, setName] = useState('');
  const [price, setPrice] = useState('');
  const [category, setCategory] = useState('Performance');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const categories = ['Performance', 'Emission Control', 'Engine Functions', 'Security'];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!name.trim()) {
      toast.error('Prosím zadajte názov služby');
      return;
    }

    if (!price || parseFloat(price) <= 0) {
      toast.error('Prosím zadajte platnú cenu');
      return;
    }

    setIsSubmitting(true);

    try {
      await createService({
        name: name.trim(),
        price: parseFloat(price),
        category,
      });

      toast.success('Služba bola pridaná');
      setName('');
      setPrice('');
      setCategory('Performance');
      onClose();
      onAdded();
    } catch (error) {
      console.error('Error creating service:', error);
      toast.error('Nepodarilo sa pridať službu');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
      <div className="glass rounded-2xl p-6 md:p-8 max-w-md w-full border border-white/20">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold text-white">Pridať službu</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white transition-colors p-2 -mr-2"
          >
            <X size={24} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4" autoComplete="off">
          <div>
            <label htmlFor="name" className="block text-sm font-medium text-gray-300 mb-2">
              Názov služby <span className="text-red-400">*</span>
            </label>
            <input
              id="name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Napríklad: Diesel STG1"
              required
              autoComplete="off"
              className="w-full px-4 py-3 bg-black/40 backdrop-blur-md border border-[#00d2ff]/50 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-[#00d2ff] focus:ring-2 focus:ring-[#00d2ff]/50 shadow-[0_0_15px_rgba(0,210,255,0.3)] hover:border-[#00d2ff] transition-all"
            />
          </div>

          <CustomSelect
label="Kategória"
  options={categories}
  value={category}
  onChange={setCategory}
/>

          <div>
            <label htmlFor="price" className="block text-sm font-medium text-gray-300 mb-2">
              Cena (€) <span className="text-red-400">*</span>
            </label>
            <input
              id="price"
              type="number"
              step="0.01"
              min="0"
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              placeholder="35.00"
              required
              autoComplete="off"
              className="w-full px-4 py-3 bg-black/40 backdrop-blur-md border border-[#00d2ff]/50 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-[#00d2ff] focus:ring-2 focus:ring-[#00d2ff]/50 shadow-[0_0_15px_rgba(0,210,255,0.3)] hover:border-[#00d2ff] transition-all"
            />
          </div>

          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-6 py-3 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg text-white font-medium transition-all min-h-[48px]"
            >
              Zrušiť
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex-1 px-6 py-3 bg-[#00d2ff]/20 hover:bg-[#00d2ff]/30 border border-[#00d2ff]/50 rounded-lg text-[#00d2ff] font-medium transition-all neon-glow disabled:opacity-50 disabled:cursor-not-allowed min-h-[48px]"
            >
              {isSubmitting ? 'Pridávam...' : 'Pridať službu'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function EditServiceModal({
  service,
  onClose,
  onUpdated,
}: {
  service: Service;
  onClose: () => void;
  onUpdated: () => void;
}) {
  const [name, setName] = useState(service.name);
  const [price, setPrice] = useState(service.price.toString());
  const [category, setCategory] = useState(service.category);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const categories = ['Performance', 'Emission Control', 'Engine Functions', 'Security'];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!name.trim()) {
      toast.error('Prosím zadajte názov služby');
      return;
    }

    if (!price || parseFloat(price) <= 0) {
      toast.error('Prosím zadajte platnú cenu');
      return;
    }

    setIsSubmitting(true);

    try {
      await updateService(service.id, {
        name: name.trim(),
        price: parseFloat(price),
        category,
      });

      toast.success('Služba bola aktualizovaná');
      onClose();
      onUpdated();
    } catch (error) {
      console.error('Error updating service:', error);
      toast.error('Nepodarilo sa aktualizovať službu');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
      <div className="glass rounded-2xl p-6 md:p-8 max-w-md w-full border border-white/20">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold text-white">Upraviť službu</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white transition-colors p-2 -mr-2"
          >
            <X size={24} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4" autoComplete="off">
          <div>
            <label htmlFor="edit-name" className="block text-sm font-medium text-gray-300 mb-2">
              Názov služby <span className="text-red-400">*</span>
            </label>
            <input
              id="edit-name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              autoComplete="off"
              className="w-full px-4 py-3 bg-black/40 backdrop-blur-md border border-[#00d2ff]/50 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-[#00d2ff] focus:ring-2 focus:ring-[#00d2ff]/50 shadow-[0_0_15px_rgba(0,210,255,0.3)] hover:border-[#00d2ff] transition-all"
            />
          </div>

          <CustomSelect
  label="Kategória"
  options={categories}
  value={category}
  onChange={setCategory}
/>

          <div>
            <label htmlFor="edit-price" className="block text-sm font-medium text-gray-300 mb-2">
              Cena (€) <span className="text-red-400">*</span>
            </label>
            <input
              id="edit-price"
              type="number"
              step="0.01"
              min="0"
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              required
              autoComplete="off"
              className="w-full px-4 py-3 bg-black/40 backdrop-blur-md border border-[#00d2ff]/50 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-[#00d2ff] focus:ring-2 focus:ring-[#00d2ff]/50 shadow-[0_0_15px_rgba(0,210,255,0.3)] hover:border-[#00d2ff] transition-all"
            />
          </div>

          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-6 py-3 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg text-white font-medium transition-all min-h-[48px]"
            >
              Zrušiť
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex-1 px-6 py-3 bg-[#00d2ff]/20 hover:bg-[#00d2ff]/30 border border-[#00d2ff]/50 rounded-lg text-[#00d2ff] font-medium transition-all neon-glow disabled:opacity-50 disabled:cursor-not-allowed min-h-[48px]"
            >
              {isSubmitting ? 'Ukladám...' : 'Uložiť zmeny'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
