import { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { 
  Download, Upload, Eye, CheckCircle, Clock, Package, 
  RefreshCw, Search, User, Power, Save, Edit3, LogOut, FileText, X
} from 'lucide-react';
import Logo from '@/components/Logo';
import SystemStatus, { fetchSystemStatusFromDB, setSystemStatusInDB, isSystemOnline, SystemStatusMode } from '@/components/SystemStatus';
import SmartTooltip from '@/components/SmartTooltip';
import InternalNoteModal from '@/components/InternalNoteModal';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { supabase } from '@/lib/supabase';
import { Order } from '@/integrations/supabase/client';
import { createClient } from '@supabase/supabase-js';
import { toast } from 'sonner';
import { SERVICES } from '@/data/services';

const ManagementPortal = () => {
  const navigate = useNavigate();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [uploadingId, setUploadingId] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);
  const [editingFields, setEditingFields] = useState<Record<string, { checksum_crc: string; internal_note: string; important_note: string }>>({});
  const [importantNote, setImportantNote] = useState<string>('');
  const [savingImportantNote, setSavingImportantNote] = useState<string | null>(null);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [statusMode, setStatusMode] = useState<SystemStatusMode>('auto');
  const [statusLoading, setStatusLoading] = useState(false);
  const [noteModalOrder, setNoteModalOrder] = useState<Order | null>(null);
  const [detailOrder, setDetailOrder] = useState<Order | null>(null);
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);
  const [cancelDialogOpen, setCancelDialogOpen] = useState(false);
  const [pendingCancelOrder, setPendingCancelOrder] = useState<{ orderId: string; newStatus: string } | null>(null);

  // Check authentication on mount - only allow specific email
  useEffect(() => {
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        navigate('/login');
        return;
      }

      // Check if user email matches allowed email
      const allowedEmail = import.meta.env.VITE_ADMIN_EMAIL || 'info@remappro.eu';
      const userEmail = session.user?.email?.toLowerCase();
      
      if (userEmail !== allowedEmail.toLowerCase()) {
        toast.error('Nemáte oprávnenie na prístup k tomuto portálu');
        await supabase.auth.signOut();
        navigate('/login');
        return;
      }

      setIsCheckingAuth(false);
    };

    checkAuth();

    // Listen for auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
      if (!session) {
        navigate('/login');
        return;
      }

      // Re-check email on auth state change
      const allowedEmail = import.meta.env.VITE_ADMIN_EMAIL || 'info@remappro.eu';
      const userEmail = session.user?.email?.toLowerCase();
      
      if (userEmail !== allowedEmail.toLowerCase()) {
        toast.error('Nemáte oprávnenie na prístup k tomuto portálu');
        await supabase.auth.signOut();
        navigate('/login');
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [navigate]);

  // Load initial status from DB
  useEffect(() => {
    if (isCheckingAuth) return;
    
    const loadStatus = async () => {
      const mode = await fetchSystemStatusFromDB();
      setStatusMode(mode);
    };
    loadStatus();
  }, [isCheckingAuth]);

  const cycleStatusMode = async () => {
    // Cycle: auto -> online -> offline -> auto
    const nextMode: Record<SystemStatusMode, SystemStatusMode> = {
      'auto': 'online',
      'online': 'offline',
      'offline': 'auto'
    };
    const newMode = nextMode[statusMode];
    
    setStatusLoading(true);
    const success = await setSystemStatusInDB(newMode);
    setStatusLoading(false);
    
    if (success) {
      setStatusMode(newMode);
      const messages: Record<SystemStatusMode, string> = {
        'auto': 'System status set to AUTO (follows schedule 08:00-20:00)',
        'online': 'System forced ONLINE (visible to customers)',
        'offline': 'System forced OFFLINE (visible to customers)'
      };
      toast.success(messages[newMode]);
    } else {
      toast.error('Failed to update system status. Check RLS policies.');
    }
  };

  const fetchOrders = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('orders')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setOrders((data || []) as Order[]);
    } catch (error) {
      console.error('Fetch error:', error);
      toast.error('Failed to fetch orders');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isCheckingAuth) return;

    fetchOrders();

    // Set up realtime subscription for orders table
    const channel = supabase
      .channel('orders-realtime')
      .on(
        'postgres_changes',
        {
          event: '*', // Listen to all changes (INSERT, UPDATE, DELETE)
          schema: 'public',
          table: 'orders'
        },
        (payload) => {
          console.log('Realtime update received:', payload);
          
          if (payload.eventType === 'INSERT') {
            setOrders(prev => [payload.new as Order, ...prev]);
            toast.info('New order received!');
          } else if (payload.eventType === 'UPDATE') {
            setOrders(prev => prev.map(order => 
              order.id === payload.new.id ? (payload.new as Order) : order
            ));
          } else if (payload.eventType === 'DELETE') {
            setOrders(prev => prev.filter(order => order.id !== payload.old.id));
          }
        }
      )
      .subscribe((status) => {
        console.log('Realtime subscription status:', status);
        if (status === 'SUBSCRIBED') {
          console.log('Successfully subscribed to orders realtime updates');
        }
      });

    return () => {
      console.log('Cleaning up realtime subscription');
      supabase.removeChannel(channel);
    };
  }, [isCheckingAuth]);

  // Sync detailOrder with orders array when invoice_number or important_note changes
  useEffect(() => {
    if (detailOrder) {
      const updatedOrder = orders.find(o => o.id === detailOrder.id);
      if (updatedOrder && (
        updatedOrder.invoice_number !== detailOrder.invoice_number ||
        updatedOrder.invoice_url !== detailOrder.invoice_url ||
        updatedOrder.credit_note_number !== detailOrder.credit_note_number ||
        updatedOrder.credit_note_pdf !== detailOrder.credit_note_pdf ||
        updatedOrder.status !== detailOrder.status ||
        updatedOrder.result_file_url !== detailOrder.result_file_url ||
        updatedOrder.important_note !== detailOrder.important_note
      )) {
        setDetailOrder(updatedOrder);
        // Sync important_note from updated order to textarea
        if (updatedOrder.important_note !== detailOrder.important_note) {
          setImportantNote(updatedOrder.important_note || '');
        }
      }
    }
  }, [orders, detailOrder]);

  // Initialize important_note when detailOrder changes (on open or refresh)
  useEffect(() => {
    if (detailOrder) {
      // Always sync with detailOrder.important_note to ensure persistence
      // This ensures the textarea shows the value from database
      setImportantNote(detailOrder.important_note || '');
      // Reset saved state when switching orders
      setSavedImportantNote(null);
    } else {
      // Clear when no detail order is selected
      setImportantNote('');
      setSavedImportantNote(null);
    }
  }, [detailOrder?.id, detailOrder?.important_note]);

  const handleLogout = async () => {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) {
        toast.error('Chyba pri odhlasovaní');
        return;
      }
      toast.success('Úspešne odhlásený');
      navigate('/login');
    } catch (error: any) {
      toast.error('Chyba pri odhlasovaní');
    }
  };

  const sendStatusEmail = async (order: Order, status: string) => {
    try {
      const orderId = order.order_number || order.id.slice(0, 8).toUpperCase();
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://kivqvwdfujsnuwfxjtcz.supabase.co';
      // Use anon key for client-side calls - Edge Function will use its own RESEND_API_KEY
      const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';
      
      console.log('[sendStatusEmail] Sending email for order:', {
        orderId,
        orderNumber: orderId,
        customerEmail: order.customer_email,
        status,
      });
      
      // Call Edge Function via direct fetch (same method as admin notifications)
      const response = await fetch(`${supabaseUrl}/functions/v1/status-email`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${anonKey}`,
        },
        body: JSON.stringify({
          orderId: order.id,
          orderNumber: orderId,
          customerEmail: order.customer_email,
          customerName: order.customer_name || '',
          carBrand: order.car_brand || '',
          carModel: order.car_model || '',
          year: order.year || 0,
          status: status,
        }),
      });

      const responseData = await response.json();
      console.log('[sendStatusEmail] Response:', response.status, responseData);

      if (!response.ok) {
        console.error('[sendStatusEmail] HTTP error:', {
          status: response.status,
          statusText: response.statusText,
          body: responseData,
        });
        throw new Error(responseData.error || `HTTP ${response.status}: ${response.statusText}`);
      }

      if (responseData.success === false) {
        console.error('[sendStatusEmail] Email sending failed:', {
          error: responseData.error,
          details: responseData.details,
        });
        throw new Error(responseData.error || 'Email sending failed');
      }

      console.log('[sendStatusEmail] Email sent successfully');
      return responseData;
    } catch (error: any) {
      console.error('[sendStatusEmail] Error details:', {
        message: error.message,
        stack: error.stack,
        name: error.name,
      });
      throw error;
    }
  };

  const handleStatusChange = async (orderId: string, newStatus: string) => {
    console.log('Updating order status:', { orderId, newStatus });
    
    // If changing to cancelled, show confirmation dialog
    if (newStatus === 'cancelled') {
      setPendingCancelOrder({ orderId, newStatus });
      setCancelDialogOpen(true);
      return;
    }
    
    // For other statuses, proceed normally
    await executeStatusChange(orderId, newStatus);
  };

  const executeStatusChange = async (orderId: string, newStatus: string) => {
    console.log('Executing status change:', { orderId, newStatus });
    
    // Find the order before update
    const order = orders.find(o => o.id === orderId);
    const previousStatus = order?.status;
    
    // Optimistic UI update
    setOrders((prev) => prev.map((o) => (o.id === orderId ? { ...o, status: newStatus } : o)));

    try {
      // If changing to cancelled, multiply total_price by -1 for credit note
      const updateData: any = { status: newStatus };
      if (newStatus === 'cancelled' && order?.total_price) {
        const totalPrice = typeof order.total_price === 'string' 
          ? parseFloat(order.total_price) 
          : order.total_price;
        updateData.total_price = -Math.abs(totalPrice);
      }

      const { data, error } = await supabase
        .from('orders')
        .update(updateData)
        .eq('id', orderId)
        .select();

      console.log('Update response:', { data, error });

      if (error) {
        console.error('Supabase update error:', error);
        throw error;
      }

      // If cancelled, generate and send credit note
      if (newStatus === 'cancelled' && order) {
        try {
          await generateAndSendCreditNote(order);
          toast.success('Objednávka zrušená a dobropis odoslaný zákazníkovi');
        } catch (creditNoteError: any) {
          console.error('[executeStatusChange] Credit note generation failed:', creditNoteError);
          toast.error(`Chyba pri generovaní dobropisu: ${creditNoteError?.message || 'Neznáma chyba'}`);
          toast.success('Status zmenený na Cancelled (dobropis sa nepodarilo odoslať)');
        }
      } else if (newStatus !== previousStatus && order && order.customer_email) {
        // Send email for status changes to processing or completed
        if (newStatus === 'processing' || newStatus === 'completed') {
          try {
            await sendStatusEmail(order, newStatus);
            toast.success('Status aktualizovaný a email odoslaný klientovi');
          } catch (emailError: any) {
            console.error('[executeStatusChange] Email sending failed:', {
              error: emailError,
              message: emailError?.message,
              stack: emailError?.stack,
              orderId: order.id,
              customerEmail: order.customer_email,
            });
            
            // Show detailed error message
            const errorMsg = emailError?.message || 'Neznáma chyba';
            if (errorMsg.includes('RESEND_API_KEY') || errorMsg.includes('API key')) {
              toast.error('Chyba: RESEND_API_KEY nie je nastavený alebo je neplatný');
            } else if (errorMsg.includes('domain') || errorMsg.includes('verified')) {
              toast.error('Chyba: Emailová doména nie je overená v Resend');
            } else {
              toast.error(`Chyba pri odosielaní emailu: ${errorMsg}`);
            }
            toast.success('Status aktualizovaný (email sa nepodarilo odoslať)');
          }
        } else {
          const statusLabels: Record<string, string> = {
            'pending': 'Pending',
            'processing': 'Processing',
            'completed': 'Completed',
            'paid': 'Paid',
            'cancelled': 'Cancelled'
          };
          toast.success(`Status changed to: ${statusLabels[newStatus] || newStatus}`);
        }
      } else {
        const statusLabels: Record<string, string> = {
          'pending': 'Pending',
          'processing': 'Processing',
          'completed': 'Completed',
          'paid': 'Paid',
          'cancelled': 'Cancelled'
        };
        toast.success(`Status changed to: ${statusLabels[newStatus] || newStatus}`);
      }

      await fetchOrders();
    } catch (error: any) {
      console.error('Update error:', error);
      toast.error(`Chyba pri aktualizácii statusu: ${error.message || 'Neznáma chyba'}`);
      // Revert optimistic update
      if (order) {
        setOrders((prev) => prev.map((o) => (o.id === orderId ? { ...o, status: previousStatus || 'pending' } : o)));
      }
      await fetchOrders();
    }
  };

  const generateAndSendCreditNote = async (order: Order) => {
    console.log('[generateAndSendCreditNote] Starting credit note generation for order:', order.id);
    
    // Get Supabase configuration with fallbacks
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://kivqvwdfujsnuwfxjtcz.supabase.co';
    const authKey = import.meta.env.VITE_SUPABASE_SERVICE_ROLE_KEY;
    
    console.log('[generateAndSendCreditNote] Supabase URL:', supabaseUrl ? '✓ Set' : '✗ Missing');
    console.log('[generateAndSendCreditNote] Service Role Key:', authKey ? '✓ Set' : '✗ Missing');

    if (!supabaseUrl) {
      console.error('[generateAndSendCreditNote] Missing VITE_SUPABASE_URL');
      throw new Error('Missing Supabase URL configuration. Please set VITE_SUPABASE_URL in .env file.');
    }
    
    // Determine which auth key to use (prefer SERVICE_ROLE_KEY, fallback to ANON_KEY)
    const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtpdnF2d2RmdWpzbnV3ZnhqdGN6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjcwMjQ1OTMsImV4cCI6MjA4MjYwMDU5M30.-iDvC0T6lozYv5d4xrHrHeS9PSGOfqwajZapMB7hqjQ';
    const finalAuthKey = authKey || anonKey;
    
    if (!authKey) {
      console.warn('[generateAndSendCreditNote] Missing VITE_SUPABASE_SERVICE_ROLE_KEY - using ANON_KEY as fallback');
      console.warn('[generateAndSendCreditNote] Note: ANON_KEY may have limited permissions. For production, set VITE_SUPABASE_SERVICE_ROLE_KEY in .env file.');
    }
    
    if (!finalAuthKey) {
      throw new Error('Missing Supabase authentication. Please set VITE_SUPABASE_SERVICE_ROLE_KEY or VITE_SUPABASE_ANON_KEY in .env file.');
    }
    
    console.log('[generateAndSendCreditNote] Using auth key:', authKey ? 'SERVICE_ROLE_KEY' : 'ANON_KEY (fallback)');

    // Generate credit note invoice number (original invoice number + "-D")
    const originalInvoiceNumber = order.invoice_number || `INV-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`;
    const creditNoteNumber = `${originalInvoiceNumber}-D`;
    console.log('[generateAndSendCreditNote] Original invoice:', originalInvoiceNumber);
    console.log('[generateAndSendCreditNote] Credit note number:', creditNoteNumber);

    // Get order items for credit note
    // Try order_items table first, but fallback to service_type from orders table if it doesn't exist
    let orderItemsData: any[] | null = null;
    
    try {
      const { data, error } = await supabase
        .from('order_items')
        .select('*')
        .eq('order_id', order.id);
      
      if (!error && data && data.length > 0) {
        orderItemsData = data;
        console.log('[generateAndSendCreditNote] Found order_items:', orderItemsData.length, 'items');
      } else {
        console.log('[generateAndSendCreditNote] order_items table not found or empty, using service_type from orders table');
      }
    } catch (err: any) {
      console.warn('[generateAndSendCreditNote] order_items table may not exist:', err?.message);
      // Continue with fallback
    }

    // Calculate negative total amount
    const totalAmount = typeof order.total_price === 'string' 
      ? parseFloat(order.total_price) 
      : (order.total_price || 0);
    const negativeAmount = -Math.abs(totalAmount);

    // Prepare items for credit note (with negative prices)
    // If order_items exists, use it; otherwise use service_type from orders table
    let items: Array<{ name: string; price: number; quantity: number }>;
    
    if (orderItemsData && orderItemsData.length > 0) {
      items = orderItemsData.map(item => ({
        name: item.service_type || item.name || 'Service',
        price: -Math.abs(typeof item.price === 'string' ? parseFloat(item.price) : (item.price || 0)),
        quantity: item.quantity || 1
      }));
    } else {
      // Fallback: Use service_type from orders table
      // service_type can be an array or comma-separated string
      const serviceTypes = Array.isArray(order.service_type) 
        ? order.service_type 
        : (typeof order.service_type === 'string' ? order.service_type.split(',').map(s => s.trim()) : []);
      
      if (serviceTypes.length > 0) {
        const pricePerService = negativeAmount / serviceTypes.length;
        items = serviceTypes.map(serviceName => ({
          name: serviceName.replace(/[\[\]"]/g, '').trim() || 'ECU Tuning Service',
          price: pricePerService,
          quantity: 1
        }));
      } else {
        items = [{
          name: 'ECU Tuning Service',
          price: negativeAmount,
          quantity: 1
        }];
      }
    }
    
    console.log('[generateAndSendCreditNote] Prepared items for credit note:', items);

    // Call generate-invoice function with creditNote flag
    const requestPayload = {
      orderId: order.id,
      orderNumber: order.order_number || '',
      customerName: order.customer_name || 'Customer',
      customerEmail: order.customer_email,
      items: items,
      totalAmount: negativeAmount,
      brand: order.car_brand || order.brand,
      model: order.car_model || order.model,
      fuelType: order.fuel_type,
      year: order.year,
      ecuType: order.ecu_type,
      vin: order.vin,
      creditNote: true, // Flag to indicate this is a credit note
      originalInvoiceNumber: originalInvoiceNumber,
      creditNoteNumber: creditNoteNumber
    };
    
    console.log('[generateAndSendCreditNote] Calling generate-invoice with payload:', JSON.stringify(requestPayload, null, 2));
    
    const invoiceResponse = await fetch(`${supabaseUrl}/functions/v1/generate-invoice`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${finalAuthKey}`,
      },
      body: JSON.stringify(requestPayload),
    });

    console.log('[generateAndSendCreditNote] Response status:', invoiceResponse.status);
    
    if (!invoiceResponse.ok) {
      const errorText = await invoiceResponse.text();
      console.error('[generateAndSendCreditNote] Invoice generation failed:', errorText);
      throw new Error(`Invoice generation failed: ${errorText}`);
    }

    const invoiceData = await invoiceResponse.json();
    console.log('[generateAndSendCreditNote] Credit note generated successfully:', invoiceData);
    
    // Extract credit note data from response
    // Edge Function returns: invoiceNumber, invoiceUrl, creditNoteNumber, creditNotePdf
    const generatedCreditNoteNumber = invoiceData.creditNoteNumber || invoiceData.invoiceNumber || creditNoteNumber;
    const generatedCreditNotePdf = invoiceData.creditNotePdf || invoiceData.invoiceUrl || null;
    
    console.log('[generateAndSendCreditNote] Extracted credit note data:', {
      creditNoteNumber: generatedCreditNoteNumber,
      creditNotePdf: generatedCreditNotePdf,
      fullResponse: invoiceData
    });
    
    console.log('[generateAndSendCreditNote] Extracted from response:', {
      credit_note_number: generatedCreditNoteNumber,
      credit_note_pdf: generatedCreditNotePdf
    });
    
    // CRITICAL: Update database from frontend to ensure data is saved
    // Edge Function may have saved it, but we'll do it again from frontend to be sure
    if (generatedCreditNoteNumber && generatedCreditNotePdf) {
      console.log('[generateAndSendCreditNote] Updating database from frontend...');
      
      // Use SERVICE_ROLE_KEY if available, otherwise use ANON_KEY
      let supabaseClient = supabase;
      
      if (finalAuthKey && finalAuthKey !== anonKey) {
        try {
          supabaseClient = createClient(supabaseUrl, finalAuthKey);
          console.log('[generateAndSendCreditNote] Using SERVICE_ROLE_KEY for database update');
        } catch (err) {
          console.warn('[generateAndSendCreditNote] Failed to create client with SERVICE_ROLE_KEY, using default:', err);
          supabaseClient = supabase;
        }
      }
      
      const { data: updateData, error: updateError } = await supabaseClient
        .from('orders')
        .update({
          credit_note_number: generatedCreditNoteNumber,
          credit_note_pdf: generatedCreditNotePdf,
        })
        .eq('id', order.id)
        .select('credit_note_number, credit_note_pdf');
      
      if (updateError) {
        console.error('[generateAndSendCreditNote] Failed to update database from frontend:', updateError);
        console.error('[generateAndSendCreditNote] Error details:', JSON.stringify(updateError, null, 2));
        throw new Error(`Failed to save credit note to database: ${updateError.message}`);
      } else {
        console.log('[generateAndSendCreditNote] ✓ Database updated successfully from frontend:', updateData);
        
        if (updateData && updateData.length > 0) {
          const updated = updateData[0];
          if (updated.credit_note_number === generatedCreditNoteNumber && updated.credit_note_pdf === generatedCreditNotePdf) {
            console.log('[generateAndSendCreditNote] ✓ Verification: Credit note data matches in database');
          } else {
            console.warn('[generateAndSendCreditNote] ⚠ Verification: Credit note data mismatch');
            console.warn('[generateAndSendCreditNote] Expected:', {
              credit_note_number: generatedCreditNoteNumber,
              credit_note_pdf: generatedCreditNotePdf
            });
            console.warn('[generateAndSendCreditNote] Got:', {
              credit_note_number: updated.credit_note_number,
              credit_note_pdf: updated.credit_note_pdf
            });
          }
        }
      }
    } else {
      console.error('[generateAndSendCreditNote] CRITICAL: Missing credit note data in response:', invoiceData);
      throw new Error('Credit note generation failed: Missing credit note number or PDF URL in response');
    }
  };

  const handleFieldChange = (orderId: string, field: 'checksum_crc' | 'internal_note', value: string) => {
    setEditingFields(prev => ({
      ...prev,
      [orderId]: {
        checksum_crc: prev[orderId]?.checksum_crc ?? orders.find(o => o.id === orderId)?.checksum_crc ?? '',
        internal_note: prev[orderId]?.internal_note ?? orders.find(o => o.id === orderId)?.internal_note ?? '',
        [field]: value
      }
    }));
  };

  const handleFieldBlur = async (orderId: string, field: 'checksum_crc' | 'internal_note') => {
    const order = orders.find(o => o.id === orderId);
    const editedValue = editingFields[orderId]?.[field];
    const originalValue = order?.[field] ?? '';
    
    // Only save if value actually changed
    if (editedValue === undefined || editedValue === originalValue) return;
    
    setSavingId(orderId);
    try {
      const { error } = await supabase
        .from('orders')
        .update({ [field]: editedValue || null })
        .eq('id', orderId);

      if (error) throw error;
      toast.success(`${field === 'checksum_crc' ? 'Checksum CRC' : 'Internal Note'} saved`);
      await fetchOrders();
      // Clear the editing state for this order
      setEditingFields(prev => {
        const newState = { ...prev };
        delete newState[orderId];
        return newState;
      });
    } catch (error) {
      console.error('Save error:', error);
      toast.error('Failed to save field');
    } finally {
      setSavingId(null);
    }
  };

  const handleSaveFields = async (orderId: string) => {
    const fields = editingFields[orderId];
    if (!fields) return;

    setSavingId(orderId);
    try {
      const { error } = await supabase
        .from('orders')
        .update({
          checksum_crc: fields.checksum_crc || null,
          internal_note: fields.internal_note || null
        })
        .eq('id', orderId);

      if (error) throw error;
      toast.success('Admin fields saved');
      await fetchOrders();
      // Clear the editing state
      setEditingFields(prev => {
        const newState = { ...prev };
        delete newState[orderId];
        return newState;
      });
    } catch (error) {
      console.error('Save error:', error);
      toast.error('Failed to save fields');
    } finally {
      setSavingId(null);
    }
  };

  const getEditableValue = (order: Order, field: 'checksum_crc' | 'internal_note') => {
    if (editingFields[order.id]?.[field] !== undefined) {
      return editingFields[order.id][field];
    }
    return order[field] || '';
  };

  // Sanitize text input - remove potentially harmful HTML/JS
  const sanitizeText = (text: string): string => {
    return text
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '') // Remove script tags
      .replace(/<[^>]+>/g, '') // Remove all HTML tags
      .replace(/javascript:/gi, '') // Remove javascript: protocol
      .replace(/on\w+\s*=/gi, '') // Remove event handlers
      .trim();
  };

  const [savedImportantNote, setSavedImportantNote] = useState<string | null>(null);

  const handleSaveImportantNote = async (orderId: string) => {
    if (!importantNote.trim() && !detailOrder?.important_note) {
      toast.warning('Please enter a message or delete existing one');
      return;
    }

    setSavingImportantNote(orderId);
    try {
      const sanitizedNote = importantNote.trim() ? sanitizeText(importantNote) : null;
      
      const { error } = await supabase
        .from('orders')
        .update({ important_note: sanitizedNote })
        .eq('id', orderId);

      if (error) throw error;
      
      toast.success('Important message saved');
      
      // Refresh orders to get latest data
      await fetchOrders();
      
      // Update detailOrder if it's currently open - keep the saved value
      if (detailOrder?.id === orderId) {
        setDetailOrder(prev => prev ? { ...prev, important_note: sanitizedNote } : null);
        // Keep the text in textarea (don't clear it)
        // The textarea will show the saved value
        setSavedImportantNote(sanitizedNote);
        // Reset saved state after 2 seconds to show normal state again
        setTimeout(() => {
          setSavedImportantNote(null);
        }, 2000);
      }
    } catch (error) {
      console.error('Save important note error:', error);
      toast.error('Failed to save important message');
    } finally {
      setSavingImportantNote(null);
    }
  };

  const handleResultUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !selectedOrderId) return;

    const orderId = selectedOrderId; // Store in local variable for clarity
    
    // Strict Upload Lock: Check if invoice already exists
    const order = orders.find(o => o.id === orderId);
    if (order?.invoice_number) {
      console.warn('[handleResultUpload] Invoice already sent for order:', orderId, 'Invoice:', order.invoice_number);
      toast.warning('Faktúra už bola odoslaná pre túto objednávku');
      if (e.target) {
        e.target.value = '';
      }
      return;
    }
    
    // Prevent multiple uploads - set uploading state immediately
    if (uploadingId === orderId) {
      console.warn('[handleResultUpload] Upload already in progress for order:', orderId);
      return;
    }
    
    setUploadingId(orderId);
    
    // Reset file input to allow same file selection again
    if (e.target) {
      e.target.value = '';
    }
    
    try {
      // Step 1: Upload file to storage
      const fileName = `result-${Date.now()}-${file.name}`;
      const { error: uploadError } = await supabase.storage
        .from('modified-files')
        .upload(fileName, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('modified-files')
        .getPublicUrl(fileName);

      // Step 2: Update status to 'completed' FIRST (Status First)
      console.log('[handleResultUpload] Step 1: Updating status to completed for orderId:', orderId);
      const { error: updateError } = await supabase
        .from('orders')
        .update({
          result_file_url: publicUrl,
          status: 'completed',
        })
        .eq('id', orderId);

      if (updateError) {
        console.error('[handleResultUpload] Status update failed:', updateError);
        throw updateError;
      }
      
      console.log('[handleResultUpload] Status updated - orderId:', orderId);
      
      // Update local state immediately
      setOrders(prev => prev.map(o => o.id === orderId ? { ...o, status: 'completed', result_file_url: publicUrl } : o));

      // Step 3: Get order data for email
      const order = orders.find(o => o.id === orderId);
      if (!order) {
        console.error('[handleResultUpload] Order not found in local state, fetching...');
        // Fetch order from DB if not in local state
        const { data: fetchedOrder } = await supabase
          .from('orders')
          .select('*')
          .eq('id', orderId)
          .single();
        
        if (!fetchedOrder) {
          throw new Error('Order not found after status update');
        }
        
        // Use fetched order
        const finalOrder = fetchedOrder as Order;
        
        // Step 4: Send email notification (Email Second)
        if (finalOrder.customer_email) {
          try {
            const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://kivqvwdfujsnuwfxjtcz.supabase.co';
            const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';
            
            console.log('[handleResultUpload] Step 2: Sending order-ready email for orderId:', orderId);
            console.log('[handleResultUpload] Email data:', {
              orderId: finalOrder.id,
              orderNumber: finalOrder.order_number,
              customerEmail: finalOrder.customer_email,
              resultFileUrl: publicUrl,
            });
            
            const response = await fetch(`${supabaseUrl}/functions/v1/order-ready`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${anonKey}`,
              },
              body: JSON.stringify({
                orderId: finalOrder.id,
                orderNumber: finalOrder.order_number || '',
                customerEmail: finalOrder.customer_email,
                customerName: finalOrder.customer_name || '',
                carBrand: finalOrder.car_brand || '',
                carModel: finalOrder.car_model || '',
                resultFileUrl: publicUrl,
                importantNote: finalOrder.important_note || null,
              }),
            });

            const responseData = await response.json();
            console.log('[handleResultUpload] Email sent - response:', response.status, responseData);

            if (!response.ok || responseData.success === false) {
              console.error('[handleResultUpload] Email notification failed:', {
                status: response.status,
                error: responseData.error,
                details: responseData.details,
              });
              toast.success('Result file uploaded! (Email notification failed)');
            } else {
              console.log('[handleResultUpload] Email sent successfully');
              toast.success('Result file uploaded and customer notified via email!');
            }
          } catch (emailError) {
            console.error('[handleResultUpload] Email notification error:', emailError);
            toast.success('Result file uploaded! (Email notification failed)');
          }
        } else {
          console.warn('[handleResultUpload] No customer email found for order:', orderId);
          toast.success('Result file uploaded and status updated to completed');
        }

        // Step 5: Generate invoice asynchronously (Invoice at the end, async, non-blocking)
        // This runs in separate try-catch and doesn't block previous steps
        // Upload -> Status Completed -> Invoice
        (async () => {
          try {
            console.log('[handleResultUpload] Step 3: Invoice started - generating invoice for orderId:', orderId);
            const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://kivqvwdfujsnuwfxjtcz.supabase.co';
            // Use SERVICE_ROLE_KEY for admin access (same mechanism as emails)
            const SERVICE_ROLE_KEY = import.meta.env.VITE_SUPABASE_SERVICE_ROLE_KEY || '';
            
            if (!SERVICE_ROLE_KEY) {
              console.warn('[handleResultUpload] SERVICE_ROLE_KEY not found, using anon key as fallback');
            }
            
            const authKey = SERVICE_ROLE_KEY || import.meta.env.VITE_SUPABASE_ANON_KEY || '';
            
            const invoiceResponse = await fetch(`${supabaseUrl}/functions/v1/generate-invoice`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${authKey}`,
              },
              body: JSON.stringify({
                orderId: finalOrder.id,
                orderNumber: finalOrder.order_number || '',
                customerName: finalOrder.customer_name || 'Customer',
                customerEmail: finalOrder.customer_email,
                items: [{
                  name: 'ECU Tuning Service',
                  price: parseFloat(finalOrder.total_price?.toString() || '0'),
                }],
                totalAmount: parseFloat(finalOrder.total_price?.toString() || '0'),
                brand: finalOrder.car_brand || undefined,
                model: finalOrder.car_model || undefined,
                fuelType: finalOrder.fuel_type || undefined,
                year: finalOrder.year ? parseInt(finalOrder.year.toString()) : undefined,
                ecuType: finalOrder.ecu_type || undefined,
                vin: finalOrder.vin || undefined,
              }),
            });

            const invoiceData = await invoiceResponse.json();
            console.log('[handleResultUpload] Invoice generation response:', invoiceResponse.status, invoiceData);

            if (!invoiceResponse.ok || invoiceData.success === false) {
              console.error('[handleResultUpload] Invoice generation failed (non-fatal):', {
                status: invoiceResponse.status,
                error: invoiceData.error,
              });
            } else {
              console.log('[handleResultUpload] Invoice generated and sent successfully');
              // Strict Upload Lock: Update local state with invoice number to permanently lock the button
              if (invoiceData.invoiceNumber) {
                setOrders(prev => prev.map(o => 
                  o.id === finalOrder.id 
                    ? { ...o, invoice_number: invoiceData.invoiceNumber, invoice_url: invoiceData.invoiceUrl || null }
                    : o
                ));
              }
            }
          } catch (invoiceError) {
            console.error('[handleResultUpload] Invoice generation error (non-fatal):', invoiceError);
            // Non-fatal - invoice can be generated later, status and email are already done
          }
        })();
      } else {
        // Order found in local state
        if (order.customer_email) {
          try {
            const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://kivqvwdfujsnuwfxjtcz.supabase.co';
            const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';
            
            console.log('[handleResultUpload] Step 2: Sending order-ready email for orderId:', orderId);
            console.log('[handleResultUpload] Email data:', {
              orderId: order.id,
              orderNumber: order.order_number,
              customerEmail: order.customer_email,
              resultFileUrl: publicUrl,
            });
            
            const response = await fetch(`${supabaseUrl}/functions/v1/order-ready`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${anonKey}`,
              },
              body: JSON.stringify({
                orderId: order.id,
                orderNumber: order.order_number || '',
                customerEmail: order.customer_email,
                customerName: order.customer_name || '',
                carBrand: order.car_brand || '',
                carModel: order.car_model || '',
                resultFileUrl: publicUrl,
                importantNote: order.important_note || null,
              }),
            });

            const responseData = await response.json();
            console.log('[handleResultUpload] Email sent - response:', response.status, responseData);

            if (!response.ok || responseData.success === false) {
              console.error('[handleResultUpload] Email notification failed:', {
                status: response.status,
                error: responseData.error,
                details: responseData.details,
              });
              toast.success('Result file uploaded! (Email notification failed)');
            } else {
              console.log('[handleResultUpload] Email sent successfully');
              toast.success('Result file uploaded and customer notified via email!');
            }
          } catch (emailError) {
            console.error('[handleResultUpload] Email notification error:', emailError);
            toast.success('Result file uploaded! (Email notification failed)');
          }
        } else {
          console.warn('[handleResultUpload] No customer email found for order:', orderId);
          toast.success('Result file uploaded and status updated to completed');
        }

        // Step 5: Generate invoice asynchronously (Invoice at the end, async, non-blocking)
        // Upload -> Status Completed -> Invoice
        (async () => {
          try {
            console.log('[handleResultUpload] Step 3: Invoice started - generating invoice for orderId:', orderId);
            const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://kivqvwdfujsnuwfxjtcz.supabase.co';
            // Use SERVICE_ROLE_KEY for admin access (same mechanism as emails)
            const SERVICE_ROLE_KEY = import.meta.env.VITE_SUPABASE_SERVICE_ROLE_KEY || '';
            
            if (!SERVICE_ROLE_KEY) {
              console.warn('[handleResultUpload] SERVICE_ROLE_KEY not found, using anon key as fallback');
            }
            
            const authKey = SERVICE_ROLE_KEY || import.meta.env.VITE_SUPABASE_ANON_KEY || '';
            
            const invoiceResponse = await fetch(`${supabaseUrl}/functions/v1/generate-invoice`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${authKey}`,
              },
              body: JSON.stringify({
                orderId: order.id,
                orderNumber: order.order_number || '',
                customerName: order.customer_name || 'Customer',
                customerEmail: order.customer_email,
                items: [{
                  name: 'ECU Tuning Service',
                  price: parseFloat(order.total_price?.toString() || '0'),
                }],
                totalAmount: parseFloat(order.total_price?.toString() || '0'),
                brand: order.car_brand || undefined,
                model: order.car_model || undefined,
                fuelType: order.fuel_type || undefined,
                year: order.year ? parseInt(order.year.toString()) : undefined,
                ecuType: order.ecu_type || undefined,
                vin: order.vin || undefined,
              }),
            });

            const invoiceData = await invoiceResponse.json();
            console.log('[handleResultUpload] Invoice generation response:', invoiceResponse.status, invoiceData);

            if (!invoiceResponse.ok || invoiceData.success === false) {
              console.error('[handleResultUpload] Invoice generation failed (non-fatal):', {
                status: invoiceResponse.status,
                error: invoiceData.error,
              });
            } else {
              console.log('[handleResultUpload] Invoice generated and sent successfully');
              // Strict Upload Lock: Update local state with invoice number to permanently lock the button
              if (invoiceData.invoiceNumber) {
                setOrders(prev => prev.map(o => 
                  o.id === order.id 
                    ? { ...o, invoice_number: invoiceData.invoiceNumber, invoice_url: invoiceData.invoiceUrl || null }
                    : o
                ));
              }
            }
          } catch (invoiceError) {
            console.error('[handleResultUpload] Invoice generation error (non-fatal):', invoiceError);
            // Non-fatal - invoice can be generated later, status and email are already done
          }
        })();
      }
      
      fetchOrders();
      
      // On success: Keep button disabled (upload completed, no need to reset)
      // The button will be hidden/replaced when order status changes to 'completed'
      // Only reset on error to allow retry
    } catch (error) {
      console.error('[handleResultUpload] Upload error:', error);
      toast.error('Failed to upload result file');
      // Only reset on error to allow retry
      setUploadingId(null);
      setSelectedOrderId(null);
    }
  };

  const triggerUpload = (orderId: string) => {
    setSelectedOrderId(orderId);
    fileInputRef.current?.click();
  };

  const handleDownload = async (fileName: string, orderNumber: string, orderId: string) => {
    try {
      // Create Public URL from file name
      const { data: { publicUrl } } = supabase.storage
        .from('tunes')
        .getPublicUrl(fileName);

      if (!publicUrl) {
        toast.error('Nepodarilo sa vytvoriť URL pre sťahovanie');
        return;
      }

      // Force download for Supabase Storage URLs
      try {
        const response = await fetch(publicUrl);
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `order-${orderNumber || 'file'}-${fileName}`;
        document.body.appendChild(a);
        a.click();
        
        // Nekompromisný Update: Ihned po a.click() prepíš status na 'processing'
        console.log('Sťahujem a prepínam ID:', orderId);
        
        // 1. Zápis do databázy
        const { error: updateError } = await supabase
          .from('orders')
          .update({ status: 'processing' })
          .eq('id', orderId);
        if (updateError) console.error('DB UPDATE ERROR:', updateError);
        
        // 2. Okamžitá zmena v UI tabuľke
        setOrders(currentOrders => 
          currentOrders.map(o => o.id === orderId ? { ...o, status: 'processing' } : o)
        );
        
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
      } catch (err) {
        console.error('Download error:', err);
        // Fallback: open in new tab
        window.open(publicUrl, '_blank');
      }
    } catch (error) {
      console.error('Error creating download URL:', error);
      toast.error('Chyba pri sťahovaní súboru');
    }
  };

  const filteredOrders = orders.filter((order) => {
    const searchLower = searchTerm.toLowerCase();
    const matchesSearch = 
      (order.order_number || '').toLowerCase().includes(searchLower) ||
      (order.customer_name || '').toLowerCase().includes(searchLower) ||
      (order.customer_email || '').toLowerCase().includes(searchLower) ||
      (order.car_brand || '').toLowerCase().includes(searchLower) ||
      (order.car_model || '').toLowerCase().includes(searchLower);
    
    const matchesStatus = statusFilter === 'all' || order.status === statusFilter;
    
    return matchesSearch && matchesStatus;
  });

  const getStatusClass = (status: string) => {
    switch (status) {
      case 'paid':
        return 'status-paid';
      case 'pending':
        return 'status-pending';
      case 'processing':
        return 'status-processing';
      case 'completed':
        return 'status-completed';
      case 'cancelled':
        return 'status-cancelled';
      default:
        return 'status-pending';
    }
  };

  // Helper function to get display amount (negative for cancelled orders)
  const getDisplayAmount = (order: Order) => {
    const amount = parseFloat(order.total_price?.toString() || '0');
    if (order.status === 'cancelled') {
      return -Math.abs(amount); // Ensure negative for cancelled
    }
    return amount;
  };

const getServiceNames = (serviceIds: string[] | string | null) => {
    if (!serviceIds) return '';
    if (Array.isArray(serviceIds)) {
      return serviceIds.map((id: string) => SERVICES.find((s) => s.id === id)?.name || id).filter(Boolean).join(', ');
    }
    // Try to parse as JSON, otherwise treat as plain text
    try {
      const ids = JSON.parse(serviceIds);
      return ids.map((id: string) => SERVICES.find((s) => s.id === id)?.name || id).filter(Boolean).join(', ');
    } catch {
      // Already a plain text service name(s), return as-is
      return serviceIds;
    }
  };

  const formatLocalDateTime = (utcDateString: string) => {
    const date = new Date(utcDateString);
    return date.toLocaleString('sk-SK', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // Show loading while checking auth
  if (isCheckingAuth) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-muted-foreground">Kontrola prístupu...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <input
        ref={fileInputRef}
        type="file"
        className="hidden"
        onChange={handleResultUpload}
        accept=".bin,.ori,.mod,.ecu"
      />

      {/* Header */}
      <header className="border-b border-border/50 backdrop-blur-sm sticky top-0 z-50 bg-background/80">
        <div className="w-full max-w-[77%] mx-auto px-12 py-4 flex items-center justify-between">
          <div className="flex items-center gap-6">
            <Link to="/">
              <Logo size="sm" />
            </Link>
            <SystemStatus />
          </div>
          <div className="flex items-center gap-4">
            <button
              onClick={cycleStatusMode}
              disabled={statusLoading}
              className={`py-2 px-4 flex items-center gap-2 rounded-lg border transition-all disabled:opacity-50 ${
                statusMode === 'online'
                  ? 'bg-green-500/20 border-green-500/50 text-green-400 hover:bg-green-500/30'
                  : statusMode === 'offline'
                    ? 'bg-red-500/20 border-red-500/50 text-red-400 hover:bg-red-500/30'
                    : 'bg-primary/20 border-primary/50 text-primary hover:bg-primary/30'
              }`}
            >
              <Power className={`w-4 h-4 ${statusLoading ? 'animate-spin' : ''}`} />
              {statusLoading ? 'Updating...' : statusMode === 'online' ? 'Force ONLINE' : statusMode === 'offline' ? 'Force OFFLINE' : 'Auto (Schedule)'}
            </button>
            <span className="text-sm text-muted-foreground">Admin Portal</span>
            <button onClick={fetchOrders} className="btn-secondary py-2 px-4 flex items-center gap-2">
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </button>
            <button 
              onClick={handleLogout}
              className="btn-secondary py-2 px-4 flex items-center gap-2 hover:bg-red-500/20 hover:border-red-500/50 hover:text-red-400 transition-colors"
            >
              <LogOut className="w-4 h-4" />
              Odhlásiť sa
            </button>
          </div>
        </div>
      </header>

      <main className="w-full max-w-[77%] mx-auto px-12 py-8">
        {/* Revenue Header */}
        <div className="glass-card p-6 mb-8">
          <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
            <span className="neon-text">Revenue Dashboard</span>
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <div className="text-center p-4 bg-blue-500/10 rounded-lg border-2 border-blue-500/50">
              <p className="text-muted-foreground text-sm mb-1 flex items-center justify-center gap-2">
                <span className="w-2 h-2 rounded-full bg-blue-500"></span> Total Revenue
              </p>
              <p className="text-3xl font-bold text-blue-500">
                €{orders.reduce((sum, o) => {
                  const amount = Number(o.total_price) || 0;
                  // For cancelled orders, subtract the amount (already negative in display)
                  return sum + (o.status === 'cancelled' ? -Math.abs(amount) : amount);
                }, 0).toLocaleString()}
              </p>
            </div>
            <div className="text-center p-4 bg-secondary/30 rounded-lg border-2 border-white/50 shadow-[0_0_8px_rgba(255,255,255,0.15)]">
              <p className="text-white text-sm mb-1 flex items-center justify-center gap-2">
                <span className="w-2 h-2 rounded-full bg-white"></span> Orders Count
              </p>
              <p className="text-3xl font-bold text-white">{orders.length}</p>
            </div>
            <div className="text-center p-4 bg-orange-500/10 rounded-lg border-2 border-orange-500/50">
              <p className="text-muted-foreground text-sm mb-1 flex items-center justify-center gap-2">
                <Clock className="w-4 h-4 text-orange-500" /> Pending
              </p>
              <p className="text-3xl font-bold text-orange-500">
                {orders.filter((o) => o.status === 'pending').length}
              </p>
            </div>
            <div className="text-center p-4 bg-emerald-500/10 rounded-lg border-2 border-emerald-500/50">
              <p className="text-muted-foreground text-sm mb-1 flex items-center justify-center gap-2">
                <CheckCircle className="w-4 h-4 text-emerald-500" /> Completed
              </p>
              <p className="text-3xl font-bold text-emerald-500">
                {orders.filter((o) => o.status === 'completed').length}
              </p>
            </div>
            <div className="text-center p-4 bg-red-500/10 rounded-lg border-2 border-red-500/50">
              <p className="text-muted-foreground text-sm mb-1 flex items-center justify-center gap-2">
                <X className="w-4 h-4 text-red-500" /> Cancelled
              </p>
              <p className="text-3xl font-bold text-red-500">
                {orders.filter((o) => o.status === 'cancelled').length}
              </p>
            </div>
          </div>
        </div>

        <div className="flex flex-col md:flex-row gap-4 mb-6">
          {/* Search */}
          <div className="relative flex-1">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search orders..."
              className="input-field w-full pl-12"
            />
          </div>
          
          {/* Status Filter */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="admin-filter-select min-w-[150px]"
          >
            <option value="all">All Status</option>
            <option value="paid">Paid</option>
            <option value="pending">Pending</option>
            <option value="processing">Processing</option>
            <option value="completed">Completed</option>
            <option value="cancelled">Cancelled</option>
          </select>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <div className="glass-card p-4 border-l-4 border-l-white">
            <p className="text-muted-foreground text-sm flex items-center gap-2">
              <User className="w-4 h-4 text-white" /> Total Orders
            </p>
            <p className="text-2xl font-bold text-white">{orders.length}</p>
          </div>
          <div className="glass-card p-4 border-l-4 border-l-orange-500">
            <p className="text-muted-foreground text-sm flex items-center gap-2">
              <Clock className="w-4 h-4 text-orange-500" /> Pending
            </p>
            <p className="text-2xl font-bold text-orange-500">
              {orders.filter((o) => o.status === 'pending').length}
            </p>
          </div>
          <div className="glass-card p-4 border-l-4 border-l-primary">
            <p className="text-muted-foreground text-sm flex items-center gap-2">
              <Package className="w-4 h-4 text-primary" /> Processing
            </p>
            <p className="text-2xl font-bold text-primary">
              {orders.filter((o) => o.status === 'processing').length}
            </p>
          </div>
          <div className="glass-card p-4 border-l-4 border-l-emerald-500">
            <p className="text-muted-foreground text-sm flex items-center gap-2">
              <CheckCircle className="w-4 h-4 text-emerald-500" /> Completed
            </p>
            <p className="text-2xl font-bold text-emerald-500">
              {orders.filter((o) => o.status === 'completed').length}
            </p>
          </div>
        </div>

        {/* Orders Table */}
        <div className="rounded-xl bg-background/40 backdrop-blur-xl border border-primary/20 shadow-[0_0_30px_rgba(59,130,246,0.15)]">
          <div className="overflow-x-auto">
            <table className="w-full text-base">
              <thead className="sticky top-0 z-50">
                <tr className="bg-[#0a192f] border-b border-primary/30 shadow-md">
                  <th className="text-left p-2 text-xs font-semibold uppercase tracking-wide align-middle text-white w-1 whitespace-nowrap">ID</th>
                  <th className="text-left p-2 text-xs font-semibold uppercase tracking-wide align-middle text-white whitespace-nowrap">Date</th>
                  <th className="text-left p-2 text-xs font-semibold uppercase tracking-wide align-middle text-white w-full">Customer</th>
                  <th className="text-left p-2 text-xs font-semibold uppercase tracking-wide align-middle text-white whitespace-nowrap">Price</th>
                  <th className="text-left p-2 text-xs font-semibold uppercase tracking-wide align-middle text-white whitespace-nowrap">Status</th>
                  <th className="text-left p-2 text-xs font-semibold uppercase tracking-wide align-middle text-white whitespace-nowrap">Invoice</th>
                  <th className="text-right p-2 text-xs font-semibold uppercase tracking-wide align-middle text-white whitespace-nowrap sticky right-0 backdrop-blur-sm z-10">Actions</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                <tr>
                      <td colSpan={7} className="text-center py-12 text-muted-foreground">
                        Loading orders...
                      </td>
                    </tr>
                  ) : filteredOrders.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="text-center py-12 text-muted-foreground">
                        No orders found
                      </td>
                    </tr>
                ) : (
                  filteredOrders.map((order) => (
                    <tr key={order.id} className="align-top border-b border-gray-700/50 hover:bg-white/5 transition-colors duration-150">
                      <td className="p-2 w-1 whitespace-nowrap">
                        <span className="font-mono text-xs font-semibold text-primary bg-primary/10 px-1.5 py-0.5 rounded inline-block">
                          {order.order_number || order.id.slice(0, 6).toUpperCase()}
                        </span>
                      </td>
                      <td className="p-2 whitespace-nowrap">
                        <p className="text-xs text-muted-foreground">
                          {formatLocalDateTime(order.created_at)}
                        </p>
                      </td>
                      <td className="p-2 w-full">
                        <div className="overflow-hidden">
                          <p className="font-medium text-xs truncate" title={order.customer_name}>{order.customer_name}</p>
                          <p className="text-xs text-muted-foreground truncate" title={order.customer_email}>{order.customer_email}</p>
                        </div>
                      </td>
                      <td className="p-2 whitespace-nowrap">
                        <p className={`font-semibold text-xs ${
                          order.status === 'cancelled' 
                            ? 'text-red-500' 
                            : 'text-primary'
                        }`}>
                          {getDisplayAmount(order).toFixed(2)}€
                        </p>
                      </td>
                      <td className="p-2 whitespace-nowrap">
                        <select
                          value={order.status}
                          onChange={(e) => handleStatusChange(order.id, e.target.value)}
                          className={`admin-status-select text-xs w-full ${getStatusClass(order.status)}`}
                        >
                          <option value="pending">Pending</option>
                          <option value="processing">Processing</option>
                          <option value="completed">Completed</option>
                          <option value="cancelled">Cancelled</option>
                        </select>
                      </td>
                      <td className="p-2 whitespace-nowrap">
                        <div className="flex flex-col gap-1">
                          {order.invoice_number ? (
                            <a
                              href={order.invoice_url || '#'}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-xs font-mono text-green-400 hover:text-green-300 underline truncate block"
                              title="View Invoice PDF"
                            >
                              {order.invoice_number}
                            </a>
                          ) : (
                            <span className="text-xs text-muted-foreground">—</span>
                          )}
                          {order.credit_note_number ? (
                            <a
                              href={order.credit_note_pdf || '#'}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-xs font-mono text-red-400 hover:text-red-300 underline truncate block"
                              title="Download Credit Note PDF"
                            >
                              {order.credit_note_number}
                            </a>
                          ) : null}
                        </div>
                      </td>
                      <td className="p-2 sticky right-0 bg-background/95 backdrop-blur-sm z-10">
                        <div className="flex items-center justify-end gap-1.5 flex-shrink-0">
                          {order.file_url ? (
                            <button
                              onClick={() => handleDownload(order.file_url!, order.order_number || order.id.slice(0, 8), order.id)}
                              className="p-2 rounded-lg bg-orange-500/20 hover:bg-orange-500/30 text-orange-500 transition-colors flex-shrink-0"
                              title="Stiahnuť súbor zákazníka"
                            >
                              <Download className="w-4 h-4" />
                            </button>
                          ) : (
                            <span className="p-2 rounded-lg bg-secondary/30 text-muted-foreground/50 cursor-not-allowed flex-shrink-0" title="Súbor nie je k dispozícii">
                              <Download className="w-4 h-4" />
                            </span>
                          )}
                          {order.status === 'completed' || order.result_file_url ? (
                            <span className="p-2 rounded-lg bg-emerald-500/20 text-emerald-400 flex-shrink-0" title="Hotový súbor je nahraný">
                              <CheckCircle className="w-4 h-4" />
                            </span>
                          ) : order.invoice_number ? (
                            <button
                              disabled={true}
                              className="p-2 rounded-lg bg-gray-200 text-gray-500 cursor-not-allowed flex-shrink-0"
                              title="Súbor odoslaný"
                            >
                              <span className="text-xs">Súbor odoslaný</span>
                            </button>
                          ) : (
                            <button
                              onClick={() => triggerUpload(order.id)}
                              disabled={uploadingId === order.id}
                              className={`p-2 rounded-lg transition-colors flex-shrink-0 ${
                                uploadingId === order.id
                                  ? 'bg-gray-500/20 text-gray-400 cursor-not-allowed'
                                  : 'bg-green-500/20 hover:bg-green-500/30 text-green-500'
                              }`}
                              title={uploadingId === order.id ? 'Odosielam...' : 'Nahrať hotový súbor'}
                            >
                              {uploadingId === order.id ? (
                                <span className="text-xs">Odosielam...</span>
                              ) : (
                                <Upload className="w-4 h-4" />
                              )}
                            </button>
                          )}
                          <button
                            onClick={() => setDetailOrder(order)}
                            className="p-2 rounded-lg bg-blue-500/20 hover:bg-blue-500/30 text-blue-400 transition-colors flex-shrink-0"
                            title="Zobraziť detail objednávky"
                          >
                            <FileText className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Order Detail Modal */}
        {detailOrder && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <div className="glass-card max-w-4xl w-full max-h-[90vh] overflow-y-auto">
              <div className="p-6">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-2xl font-bold text-foreground flex items-center gap-2">
                    <FileText className="w-6 h-6 text-primary" />
                    Detail objednávky
                  </h2>
                  <button
                    onClick={() => setDetailOrder(null)}
                    className="p-2 rounded-lg hover:bg-secondary/50 transition-colors"
                  >
                    <X className="w-5 h-5 text-muted-foreground" />
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                  {/* Základné informácie */}
                  <div className="space-y-4">
                    <h3 className="text-lg font-semibold text-foreground border-b border-primary/20 pb-2">
                      Základné informácie
                    </h3>
                    <div className="space-y-3">
                      <div>
                        <p className="text-sm text-muted-foreground">ID objednávky</p>
                        <p className="font-mono font-semibold text-primary">{detailOrder.order_number || detailOrder.id.slice(0, 8).toUpperCase()}</p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Dátum vytvorenia</p>
                        <p className="text-foreground">{formatLocalDateTime(detailOrder.created_at)}</p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Status</p>
                        <span className={`inline-flex items-center px-3 py-1.5 rounded-full text-sm font-semibold ${getStatusClass(detailOrder.status)}`}>
                          {detailOrder.status === 'pending' ? 'Pending' : detailOrder.status === 'processing' ? 'Processing' : detailOrder.status === 'completed' ? 'Completed' : detailOrder.status === 'cancelled' ? 'Cancelled' : detailOrder.status}
                        </span>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Celková cena</p>
                        <p className={`text-xl font-bold ${
                          detailOrder.status === 'cancelled' 
                            ? 'text-red-500' 
                            : 'text-primary'
                        }`}>
                          {getDisplayAmount(detailOrder).toFixed(2)}€
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Zákazník */}
                  <div className="space-y-4">
                    <h3 className="text-lg font-semibold text-foreground border-b border-primary/20 pb-2">
                      Zákazník
                    </h3>
                    <div className="space-y-3">
                      <div>
                        <p className="text-sm text-muted-foreground">Meno</p>
                        <p className="text-foreground font-medium">{detailOrder.customer_name}</p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">E-mail</p>
                        <p className="text-foreground">{detailOrder.customer_email}</p>
                      </div>
                    </div>
                  </div>

                  {/* Vozidlo */}
                  <div className="space-y-4">
                    <h3 className="text-lg font-semibold text-foreground border-b border-primary/20 pb-2">
                      Vozidlo
                    </h3>
                    <div className="space-y-3">
                      <div>
                        <p className="text-sm text-muted-foreground">Značka / Model</p>
                        <p className="text-foreground font-medium">{detailOrder.car_brand || 'Nezadané'} {detailOrder.car_model || ''}</p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Palivo</p>
                        <p className="text-foreground">{detailOrder.fuel_type || '—'}</p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Rok výroby</p>
                        <p className="text-foreground">{detailOrder.year ? detailOrder.year.toString() : '—'}</p>
                      </div>
                      {detailOrder.ecu_type && (
                        <div>
                          <p className="text-sm text-muted-foreground">Typ ECU</p>
                          <p className="text-foreground">{detailOrder.ecu_type}</p>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Služby */}
                  <div className="space-y-4">
                    <h3 className="text-lg font-semibold text-foreground border-b border-primary/20 pb-2">
                      Služby
                    </h3>
                    <div>
                      <p className="text-foreground">{getServiceNames(detailOrder.service_type) || '—'}</p>
                    </div>
                  </div>
                </div>

                {/* Faktúra a Dobropis */}
                {(detailOrder.invoice_number || detailOrder.credit_note_number) && (
                  <div className="mt-6 pt-6 border-t border-primary/20">
                    <h3 className="text-lg font-semibold text-foreground mb-4">Faktúra a Dobropis</h3>
                    <div className="space-y-3">
                      {detailOrder.invoice_number && (
                        <div>
                          <p className="text-sm text-muted-foreground mb-2">Faktúra</p>
                          <a
                            href={detailOrder.invoice_url || '#'}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-2 text-green-400 hover:text-green-300 underline"
                          >
                            <FileText className="w-4 h-4" />
                            <span className="font-mono">{detailOrder.invoice_number}</span>
                          </a>
                        </div>
                      )}
                      {detailOrder.credit_note_number && (
                        <div>
                          <p className="text-sm text-muted-foreground mb-2">Dobropis</p>
                          <a
                            href={detailOrder.credit_note_pdf || '#'}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-2 text-red-400 hover:text-red-300 underline"
                          >
                            <FileText className="w-4 h-4" />
                            <span className="font-mono">{detailOrder.credit_note_number}</span>
                          </a>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Súbory */}
                <div className="mt-6 pt-6 border-t border-primary/20">
                  <h3 className="text-lg font-semibold text-foreground mb-4">Súbory</h3>
                  <div className="space-y-4">
                    <div>
                      <p className="text-sm text-muted-foreground mb-2">Súbor zákazníka</p>
                      {detailOrder.file_url ? (
                        <button
                          onClick={() => handleDownload(detailOrder.file_url!, detailOrder.order_number || detailOrder.id.slice(0, 8), detailOrder.id)}
                          className="btn-secondary inline-flex items-center gap-2"
                        >
                          <Download className="w-4 h-4" />
                          Stiahnuť súbor zákazníka
                        </button>
                      ) : (
                        <p className="text-muted-foreground text-sm">Súbor nie je k dispozícii</p>
                      )}
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground mb-2">Hotový súbor</p>
                      {detailOrder.result_file_url ? (
                        <a
                          href={detailOrder.result_file_url}
                          download
                          className="btn-primary inline-flex items-center gap-2"
                        >
                          <Eye className="w-4 h-4" />
                          Stiahnuť hotový súbor
                        </a>
                      ) : detailOrder.invoice_number ? (
                        <div className="space-y-2">
                          <p className="text-muted-foreground text-sm">Súbor už bol odoslaný</p>
                          <button
                            disabled={true}
                            className="inline-flex items-center gap-2 bg-gray-200 text-gray-500 cursor-not-allowed"
                          >
                            <span>Súbor odoslaný</span>
                          </button>
                        </div>
                      ) : (
                        <div className="space-y-2">
                          {uploadingId === detailOrder.id ? (
                            <div className="flex items-center gap-2 text-gray-400">
                              <span className="animate-pulse">⏳</span>
                              <span className="text-sm">Odosielam faktúru a notifikáciu klientovi...</span>
                            </div>
                          ) : (
                            <>
                              <p className="text-muted-foreground text-sm">Hotový súbor ešte nie je nahraný</p>
                              <button
                                onClick={() => {
                                  setDetailOrder(null);
                                  triggerUpload(detailOrder.id);
                                }}
                                disabled={uploadingId === detailOrder.id || detailOrder.invoice_number}
                                className={`inline-flex items-center gap-2 ${
                                  uploadingId === detailOrder.id
                                    ? 'bg-gray-500/20 text-gray-400 cursor-not-allowed'
                                    : detailOrder.invoice_number
                                    ? 'bg-gray-200 text-gray-500 cursor-not-allowed'
                                    : 'btn-primary'
                                }`}
                              >
                                {uploadingId === detailOrder.id ? (
                                  <>
                                    <span className="animate-pulse">⏳</span>
                                    <span>Odosielam...</span>
                                  </>
                                ) : detailOrder.invoice_number ? (
                                  <span>Súbor odoslaný</span>
                                ) : (
                                  <>
                                    <Upload className="w-4 h-4" />
                                    Nahrať hotový súbor
                                  </>
                                )}
                              </button>
                            </>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Poznámka zákazníka */}
                <div className="mt-6 pt-6 border-t border-primary/20">
                  <h3 className="text-lg font-semibold text-foreground border-b border-primary/20 pb-2 mb-4">
                    Poznámka zákazníka
                  </h3>
                  <div className="bg-secondary/30 p-4 rounded-lg">
                    <p className="text-foreground whitespace-pre-wrap">{detailOrder.customer_note || '—'}</p>
                  </div>
                </div>

                {/* Interná poznámka */}
                {detailOrder.internal_note && (
                  <div className="mt-6 pt-6 border-t border-primary/20">
                    <h3 className="text-lg font-semibold text-foreground border-b border-primary/20 pb-2 mb-4">
                      Interná poznámka
                    </h3>
                    <div className="bg-primary/10 p-4 rounded-lg">
                      <p className="text-foreground whitespace-pre-wrap">{detailOrder.internal_note}</p>
                    </div>
                  </div>
                )}

                {/* CRC */}
                <div className="mt-6 pt-6 border-t border-primary/20">
                  <h3 className="text-lg font-semibold text-foreground border-b border-primary/20 pb-2 mb-4">
                    CRC
                  </h3>
                  <div className="flex items-center gap-3">
                    <input
                      type="text"
                      value={getEditableValue(detailOrder, 'checksum_crc')}
                      onChange={(e) => {
                        handleFieldChange(detailOrder.id, 'checksum_crc', e.target.value);
                        // Automaticky aktivovať tlačidlo pri zmene
                        if (!editingFields[detailOrder.id]) {
                          setEditingFields(prev => ({
                            ...prev,
                            [detailOrder.id]: { ...prev[detailOrder.id], checksum_crc: e.target.value }
                          }));
                        }
                      }}
                      placeholder="CRC..."
                      maxLength={6}
                      className="w-[120px] h-9 bg-secondary/50 border border-gray-600 rounded px-3 py-2 text-sm text-white placeholder:text-gray-400 focus:outline-none focus:ring-1 focus:ring-primary/50 font-mono"
                    />
                    <button
                      onClick={() => handleSaveFields(detailOrder.id)}
                      disabled={savingId === detailOrder.id}
                      className="px-4 py-2 bg-primary/20 hover:bg-primary/30 text-primary border border-primary/30 rounded-lg transition-colors flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                      title="Uložiť CRC"
                    >
                      <Save className={`w-4 h-4 ${savingId === detailOrder.id ? 'animate-pulse' : ''}`} />
                      Uložiť
                    </button>
                  </div>
                </div>

                {/* Important Message */}
                <div className="mt-6 pt-6 border-t border-primary/20">
                  <h3 className="text-lg font-semibold text-foreground border-b border-primary/20 pb-2 mb-4">
                    *IMPORTANT*
                  </h3>
                  <div className="space-y-3">
                    <textarea
                      value={importantNote}
                      onChange={(e) => {
                        setImportantNote(e.target.value);
                        // Reset saved state when user starts typing again
                        if (savedImportantNote !== null && e.target.value !== savedImportantNote) {
                          setSavedImportantNote(null);
                        }
                      }}
                      placeholder="Enter important message for customer email..."
                      rows={4}
                      maxLength={500}
                      className="w-full bg-secondary/50 border border-gray-600 rounded-lg px-4 py-3 text-sm text-white placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-primary/50 resize-none"
                    />
                    <div className="flex items-center justify-between">
                      <p className="text-xs text-muted-foreground">
                        This message will appear in the customer email after file completion notification.
                      </p>
                      <button
                        onClick={() => handleSaveImportantNote(detailOrder.id)}
                        disabled={savingImportantNote === detailOrder.id || (savedImportantNote !== null && importantNote === savedImportantNote)}
                        className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
                          savedImportantNote !== null && importantNote === savedImportantNote
                            ? 'bg-emerald-500/20 text-emerald-400'
                            : 'bg-primary/20 hover:bg-primary/30 text-primary'
                        }`}
                        title={savedImportantNote !== null && importantNote === savedImportantNote ? 'Uložené!' : 'Uložiť dôležitú správu'}
                      >
                        {savedImportantNote !== null && importantNote === savedImportantNote ? (
                          <>
                            <CheckCircle className="w-4 h-4" />
                            Uložené!
                          </>
                        ) : savingImportantNote === detailOrder.id ? (
                          <>
                            <Save className="w-4 h-4 animate-pulse" />
                            Ukladám...
                          </>
                        ) : (
                          <>
                            <Save className="w-4 h-4" />
                            Uložiť poznámku
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Internal Note Modal */}
        <InternalNoteModal
          isOpen={!!noteModalOrder}
          onClose={() => setNoteModalOrder(null)}
          orderId={noteModalOrder?.id || ''}
          orderNumber={noteModalOrder?.order_number || noteModalOrder?.id.slice(0, 8).toUpperCase() || ''}
          initialNote={noteModalOrder ? getEditableValue(noteModalOrder, 'internal_note') : ''}
          onSave={async (note) => {
            if (!noteModalOrder) return;
            handleFieldChange(noteModalOrder.id, 'internal_note', note);
            await handleSaveFields(noteModalOrder.id);
            setNoteModalOrder(null);
          }}
          isSaving={savingId === noteModalOrder?.id}
        />
      </main>

      {/* Footer */}
      <footer className="bg-background border-t border-border/50 mt-auto">
        <div className="w-full max-w-[77%] mx-auto px-12 py-8">
          <div className="glass-card p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-3">
                <h3 className="font-semibold text-foreground text-lg mb-4">Fakturačné údaje</h3>
                <div className="space-y-2 text-sm text-muted-foreground">
                  <p className="font-semibold text-foreground text-base">REMAPPRO</p>
                  <p>Janka Kráľa 29</p>
                  <p>990 01 Veľký Krtíš</p>
                </div>
              </div>
            </div>
            <div className="mt-8 pt-6 border-t border-border/50">
              <p className="text-center text-sm text-muted-foreground">
                Copyright © 2026 REMAPPRO Digital Solutions. All rights reserved.
              </p>
            </div>
          </div>
        </div>
      </footer>

      {/* Cancel Order Confirmation Dialog */}
      <AlertDialog open={cancelDialogOpen} onOpenChange={setCancelDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Vytvoriť dobropis a zrušiť objednávku?</AlertDialogTitle>
            <AlertDialogDescription>
              Naozaj chcete vytvoriť dobropis a zrušiť túto objednávku? Tento krok vygeneruje zápornú faktúru a odošle ju zákazníkovi na email. 
              Suma sa automaticky odpočíta z celkových tržieb.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => {
              setCancelDialogOpen(false);
              setPendingCancelOrder(null);
            }}>
              Zrušiť
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={async () => {
                if (pendingCancelOrder) {
                  setCancelDialogOpen(false);
                  await executeStatusChange(pendingCancelOrder.orderId, pendingCancelOrder.newStatus);
                  setPendingCancelOrder(null);
                }
              }}
              className="bg-red-500 hover:bg-red-600 text-white"
            >
              Vytvoriť dobropis
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default ManagementPortal;
