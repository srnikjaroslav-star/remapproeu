'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { getAllClients, getAnalytics, getDailyRevenue, getAllServices } from '@/lib/supabase/queries';
import { createClient } from '@/lib/supabase/client';
import { Database } from '@/types/database';
import Sidebar from '@/components/Sidebar';
import AdminDashboard from '@/components/AdminDashboard';
import Footer from '@/components/Footer';
import { toast } from 'sonner';

type Client = Database['public']['Tables']['clients']['Row'];

const STORAGE_KEY = 'admin_active_client_id';
const ALLOWED_EMAIL = 'info@remappro.eu';

export default function AdminPage() {
  const [clients, setClients] = useState<Client[]>([]);
  const [activeClientId, setActiveClientId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
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

  // Load clients and restore saved selection (only after auth check)
  useEffect(() => {
    if (isAuthenticated) {
      loadClients();
    }
  }, [isAuthenticated]);

  // Restore saved client from localStorage after clients are loaded
  useEffect(() => {
    if (clients.length > 0 && !activeClientId) {
      // Check localStorage first
      const savedClientId = localStorage.getItem(STORAGE_KEY);
      
      if (savedClientId) {
        // Verify the saved client still exists in the list
        const savedClient = clients.find(c => c.id === savedClientId);
        if (savedClient) {
          setActiveClientId(savedClientId);
          return;
        } else {
          // Saved client no longer exists, remove from storage
          localStorage.removeItem(STORAGE_KEY);
        }
      }
      
      // Fallback to first client if no saved selection or saved client doesn't exist
      setActiveClientId(clients[0].id);
    }
  }, [clients, activeClientId]);

  // Persist activeClientId to localStorage whenever it changes
  useEffect(() => {
    if (activeClientId) {
      localStorage.setItem(STORAGE_KEY, activeClientId);
    }
  }, [activeClientId]);

  const loadClients = async () => {
    try {
      const data = await getAllClients();
      setClients(data);
      // Don't set activeClientId here - let the useEffect handle it with localStorage check
    } catch (error) {
      console.error('Error loading clients:', error);
      toast.error('Failed to load clients');
    } finally {
      setLoading(false);
    }
  };

  const handleClientChange = (clientId: string) => {
    setActiveClientId(clientId);
    // localStorage is updated via useEffect above
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
        <div className="text-[#00d2ff]">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#050505] flex">
      <Sidebar
        clients={clients}
        activeClientId={activeClientId || undefined}
        onClientChange={handleClientChange}
        onClientsUpdated={loadClients}
      />
      <div className="flex-1 ml-64 flex flex-col min-h-0">
        <main className="flex-1 p-4 md:p-6 min-h-0 overflow-hidden">
          {activeClientId ? (
            <AdminDashboard clientId={activeClientId} />
          ) : (
            <div className="text-center text-gray-400 py-12">
              No client selected
            </div>
          )}
        </main>
        <Footer />
      </div>
    </div>
  );
}
