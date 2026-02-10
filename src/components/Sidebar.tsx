'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { Settings, LayoutDashboard, Users, Plus, Edit2, Trash2, X, LogOut } from 'lucide-react';
import { Database } from '@/types/database';
import { createClient } from '@/lib/supabase/client';
import AddClientModal from './AddClientModal';
import ShareLinkButton from './ShareLinkButton';
import { updateClient, deleteClient } from '@/lib/supabase/queries';
import { toast } from 'sonner';

type Client = Database['public']['Tables']['clients']['Row'];

interface SidebarProps {
  clients: Client[];
  activeClientId?: string;
  onClientChange?: (clientId: string) => void;
  onClientsUpdated?: () => void;
}

export default function Sidebar({ clients, activeClientId, onClientChange, onClientsUpdated }: SidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const supabase = createClient();
  const isAdmin = pathname.startsWith('/admin');
  const isClientPortal = pathname.startsWith('/portal');
  const [isAddClientModalOpen, setIsAddClientModalOpen] = useState(false);
  const [editingClient, setEditingClient] = useState<Client | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  if (isClientPortal) {
    return null; // Hide sidebar in client portal
  }

  const handleEditClient = (client: Client, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingClient(client);
  };

  const handleDeleteClient = async (clientId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    
    if (deleteConfirm !== clientId) {
      setDeleteConfirm(clientId);
      return;
    }

    try {
      await deleteClient(clientId);
      toast.success('Klient bol vymazaný');
      setDeleteConfirm(null);
      
      // If deleted client was active, switch to first available
      if (activeClientId === clientId && clients.length > 1) {
        const remainingClients = clients.filter(c => c.id !== clientId);
        if (remainingClients.length > 0) {
          onClientChange?.(remainingClients[0].id);
        }
      }
      
      onClientsUpdated?.();
    } catch (error) {
      console.error('Error deleting client:', error);
      toast.error('Nepodarilo sa vymazať klienta');
      setDeleteConfirm(null);
    }
  };

  return (
    <aside className="fixed left-0 top-0 h-screen w-64 glass border-r border-white/10 flex flex-col z-40">
      {/* Logo */}
      <div className="p-6 border-b border-white/10">
        <Link href="/admin" className="block">
          <h1 className="text-2xl font-bold neon-glow-text text-[#00d2ff]">
            REMAPPRO
          </h1>
        </Link>
      </div>

      {/* Client Switcher */}
      {isAdmin && (
        <div className="p-4 border-b border-white/10">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2 text-sm text-gray-400">
              <Users size={16} />
              <span>Klienti</span>
            </div>
            <button
              onClick={() => setIsAddClientModalOpen(true)}
              className="p-1.5 hover:bg-white/10 rounded-lg text-[#00d2ff] transition-colors"
              aria-label="Pridať klienta"
            >
              <Plus size={18} />
            </button>
          </div>
          <div className="space-y-1">
            {clients.map((client) => (
              <div
                key={client.id}
                className={`group flex items-center gap-2 rounded-lg text-sm transition-all overflow-hidden ${
                  activeClientId === client.id
                    ? 'bg-[#00d2ff]/20 text-[#00d2ff] border border-[#00d2ff]/50'
                    : 'text-gray-300 hover:bg-white/5 border border-transparent'
                }`}
              >
                <button
                  onClick={() => onClientChange?.(client.id)}
                  className="flex-1 text-left min-w-0 truncate px-3 py-2 h-full"
                >
                  {client.name}
                </button>
                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <ShareLinkButton slug={client.slug} compact />
                  <button
                    onClick={(e) => handleEditClient(client, e)}
                    className="p-1.5 hover:bg-[#00d2ff]/20 rounded text-[#00d2ff] transition-colors"
                    aria-label="Upraviť klienta"
                  >
                    <Edit2 size={14} />
                  </button>
                  <button
                    onClick={(e) => handleDeleteClient(client.id, e)}
                    className={`p-1.5 rounded transition-colors ${
                      deleteConfirm === client.id
                        ? 'bg-red-500/20 text-red-400'
                        : 'hover:bg-red-500/20 text-gray-400 hover:text-red-400'
                    }`}
                    aria-label="Vymazať klienta"
                  >
                    {deleteConfirm === client.id ? (
                      <span className="text-xs px-1">✓</span>
                    ) : (
                      <Trash2 size={14} />
                    )}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Add Client Modal */}
      {isAdmin && (
        <AddClientModal
          isOpen={isAddClientModalOpen}
          onClose={() => setIsAddClientModalOpen(false)}
          onClientAdded={() => {
            setIsAddClientModalOpen(false);
            onClientsUpdated?.();
          }}
        />
      )}

      {/* Edit Client Modal */}
      {isAdmin && editingClient && (
        <EditClientModal
          client={editingClient}
          onClose={() => setEditingClient(null)}
          onClientUpdated={() => {
            setEditingClient(null);
            onClientsUpdated?.();
          }}
        />
      )}

      {/* Navigation */}
      <nav className="flex-1 p-4">
        <div className="space-y-1">
          <Link
            href="/admin"
            className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-all w-full group ${
              pathname === '/admin'
                ? 'bg-[#00d2ff]/20 text-[#00d2ff]'
                : 'text-gray-300 hover:bg-white/5'
            }`}
          >
            <LayoutDashboard size={18} />
            <span className="flex-1">Dashboard</span>
          </Link>
          <Link
            href="/admin/settings"
            className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-all w-full group ${
              pathname === '/admin/settings'
                ? 'bg-[#00d2ff]/20 text-[#00d2ff]'
                : 'text-gray-300 hover:bg-white/5'
            }`}
          >
            <Settings size={18} />
            <span className="flex-1">Settings</span>
          </Link>
        </div>
      </nav>

      {/* Logout Button - Only show in admin area */}
      {isAdmin && (
        <div className="p-4 border-t border-white/10">
          <button
            onClick={async () => {
              try {
                await supabase.auth.signOut();
                // Hard redirect to force immediate page refresh and clear all state
                window.location.href = '/login';
              } catch (error) {
                console.error('Logout error:', error);
                toast.error('Chyba pri odhlásení');
                // Even on error, force redirect to login
                window.location.href = '/login';
              }
            }}
            className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-all text-red-400 hover:bg-red-500/20 hover:text-red-300 border border-red-500/30 hover:border-red-500/50"
          >
            <LogOut size={18} />
            <span>Odhlásiť sa</span>
          </button>
        </div>
      )}

      {/* Footer */}
      <div className="p-4 border-t border-white/10 text-xs text-center">
        <div className="font-semibold text-white neon-glow-text text-[#00d2ff]">REMAPPRO</div>
      </div>
    </aside>
  );
}

function EditClientModal({
  client,
  onClose,
  onClientUpdated,
}: {
  client: Client;
  onClose: () => void;
  onClientUpdated: () => void;
}) {
  const [name, setName] = useState(client.name);
  const [slug, setSlug] = useState(client.slug);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const generateSlug = (text: string): string => {
    return text
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '');
  };

  const handleNameChange = (value: string) => {
    setName(value);
    if (!slug || slug === generateSlug(client.name)) {
      setSlug(generateSlug(value));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!name.trim()) {
      toast.error('Prosím zadajte meno klienta');
      return;
    }

    if (!slug.trim()) {
      toast.error('Prosím zadajte slug');
      return;
    }

    setIsSubmitting(true);

    try {
      await updateClient(client.id, {
        name: name.trim(),
        slug: slug.trim(),
      });

      toast.success('Klient bol aktualizovaný');
      onClose();
      onClientUpdated();
    } catch (error: any) {
      console.error('Error updating client:', error);
      if (error.message?.includes('unique')) {
        toast.error('Klient s týmto slug už existuje');
      } else {
        toast.error('Nepodarilo sa aktualizovať klienta');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
      <div className="glass rounded-2xl p-6 md:p-8 max-w-md w-full max-h-[90vh] overflow-y-auto border border-white/20">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold text-white">Upraviť klienta</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white transition-colors p-2 -mr-2"
            aria-label="Zavrieť"
          >
            <X size={24} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="edit-name" className="block text-sm font-medium text-gray-300 mb-2">
              Meno klienta <span className="text-red-400">*</span>
            </label>
            <input
              id="edit-name"
              type="text"
              value={name}
              onChange={(e) => handleNameChange(e.target.value)}
              placeholder="Napríklad: JAN CERY"
              required
              className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-[#00d2ff]/50 focus:ring-2 focus:ring-[#00d2ff]/20"
            />
          </div>

          <div>
            <label htmlFor="edit-slug" className="block text-sm font-medium text-gray-300 mb-2">
              Slug (URL) <span className="text-red-400">*</span>
            </label>
            <input
              id="edit-slug"
              type="text"
              value={slug}
              onChange={(e) => setSlug(e.target.value)}
              placeholder="jan-cery"
              required
              className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-[#00d2ff]/50 focus:ring-2 focus:ring-[#00d2ff]/20"
            />
            <p className="text-xs text-gray-400 mt-1">
              Používa sa v URL: /portal/{slug || 'slug'}
            </p>
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
