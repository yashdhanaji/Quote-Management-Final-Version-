import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { Plus, Search, Edit2, Trash2, FileText, Send, Check, X, Eye, Download } from 'lucide-react';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Badge } from '../components/ui/Badge';
import { QuoteViewModal } from '../components/quotes/QuoteViewModal';
import { useAuthStore } from '../stores/authStore';
import { supabase } from '../lib/supabase';
import { Quote, Client, Product, QuoteItem } from '../types';
import { generateQuotePDF } from '../utils/pdfGenerator';

interface QuoteFormData {
  client_id: string;
  valid_until: string;
  terms_conditions: string;
  notes: string;
}

interface QuoteItemFormData {
  product_id: string;
  quantity: number;
  unit_price: number;
  discount_percent: number;
}

export const Quotes: React.FC = () => {
  const { user, organization, permissions } = useAuthStore();
  const [quotes, setQuotes] = useState<Quote[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingQuote, setEditingQuote] = useState<Quote | null>(null);
  const [viewingQuote, setViewingQuote] = useState<Quote | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [quoteItems, setQuoteItems] = useState<QuoteItemFormData[]>([]);

  const { register, handleSubmit, formState: { errors }, reset, setValue, watch } = useForm<QuoteFormData>();

  const statuses = [
    { value: 'all', label: 'All Statuses' },
    { value: 'draft', label: 'Draft' },
    { value: 'pending_approval', label: 'Pending Approval' },
    { value: 'approved', label: 'Approved' },
    { value: 'sent', label: 'Sent' },
    { value: 'rejected', label: 'Rejected' },
  ];

  useEffect(() => {
    fetchData();
  }, [organization?.id]);

  const fetchData = async () => {
    console.log('Fetching data for organization:', organization?.id);
    
    if (!organization?.id) {
      console.log('No organization ID, setting loading to false');
      setLoading(false);
      return;
    }

    if (!supabase) {
      console.log('No supabase client, setting loading to false');
      setLoading(false);
      return;
    }

    try {
      console.log('Making supabase queries...');
      const [quotesRes, clientsRes, productsRes] = await Promise.all([
        supabase
          .from('quotes')
          .select(`
            *,
            client:clients(*)
          `)
          .eq('organization_id', organization.id)
          .order('created_at', { ascending: false }),
        supabase
          .from('clients')
          .select('*')
          .eq('organization_id', organization.id),
        supabase
          .from('products')
          .select('*')
          .eq('organization_id', organization.id)
          .eq('is_active', true)
      ]);

      console.log('Supabase responses:', { 
        quotes: quotesRes.data?.length || 0, 
        clients: clientsRes.data?.length || 0, 
        products: productsRes.data?.length || 0,
        errors: { quotes: quotesRes.error, clients: clientsRes.error, products: productsRes.error }
      });

      if (quotesRes.error) throw quotesRes.error;
      if (clientsRes.error) throw clientsRes.error;
      if (productsRes.error) throw productsRes.error;

      setQuotes(quotesRes.data || []);
      setClients(clientsRes.data || []);
      setProducts(productsRes.data || []);
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const generateQuoteNumber = () => {
    const year = new Date().getFullYear();
    const count = quotes.length + 1;
    return `Q-${year}-${count.toString().padStart(3, '0')}`;
  };

  const calculateItemTotal = (item: QuoteItemFormData) => {
    const subtotal = item.quantity * item.unit_price;
    const discountAmount = subtotal * (item.discount_percent / 100);
    const product = products.find(p => p.id === item.product_id);
    const taxAmount = (subtotal - discountAmount) * ((product?.tax_rate || 0) / 100);
    return subtotal - discountAmount + taxAmount;
  };

  const calculateQuoteTotals = () => {
    const subtotal = quoteItems.reduce((sum, item) => sum + (item.quantity * item.unit_price), 0);
    const discountAmount = quoteItems.reduce((sum, item) => {
      return sum + (item.quantity * item.unit_price * (item.discount_percent / 100));
    }, 0);
    const taxAmount = quoteItems.reduce((sum, item) => {
      const product = products.find(p => p.id === item.product_id);
      const itemSubtotal = item.quantity * item.unit_price;
      const itemDiscount = itemSubtotal * (item.discount_percent / 100);
      return sum + ((itemSubtotal - itemDiscount) * ((product?.tax_rate || 0) / 100));
    }, 0);
    const totalAmount = subtotal - discountAmount + taxAmount;

    return { subtotal, discountAmount, taxAmount, totalAmount };
  };

  const addQuoteItem = () => {
    setQuoteItems([...quoteItems, {
      product_id: '',
      quantity: 1,
      unit_price: 0,
      discount_percent: 0,
    }]);
  };

  const removeQuoteItem = (index: number) => {
    setQuoteItems(quoteItems.filter((_, i) => i !== index));
  };

  const updateQuoteItem = (index: number, field: keyof QuoteItemFormData, value: any) => {
    const updated = [...quoteItems];
    updated[index] = { ...updated[index], [field]: value };
    
    // Auto-fill unit price when product is selected
    if (field === 'product_id') {
      const product = products.find(p => p.id === value);
      if (product) {
        updated[index].unit_price = product.price;
      }
    }
    
    setQuoteItems(updated);
  };

  // Determine initial status based on user role
  const getInitialStatus = (): Quote['status'] => {
    if (user?.role === 'agent') {
      return 'draft';
    } else if (user?.role === 'manager' || user?.role === 'admin') {
      return 'approved';
    }
    return 'draft';
  };

  const onSubmit = async (data: QuoteFormData) => {
    if (!organization?.id || !user?.id || !supabase) return;
    if (quoteItems.length === 0) {
      alert('Please add at least one item to the quote');
      return;
    }

    try {
      const totals = calculateQuoteTotals();
      const quoteNumber = editingQuote?.quote_number || generateQuoteNumber();
      const initialStatus = editingQuote?.status || getInitialStatus();

      const quoteData = {
        quote_number: quoteNumber,
        client_id: data.client_id,
        status: initialStatus,
        subtotal: totals.subtotal,
        discount_amount: totals.discountAmount,
        tax_amount: totals.taxAmount,
        total_amount: totals.totalAmount,
        valid_until: data.valid_until,
        terms_conditions: data.terms_conditions,
        notes: data.notes,
        created_by: user.id,
        organization_id: organization.id,
      };

      let quoteId: string;

      if (editingQuote) {
        const { error } = await supabase
          .from('quotes')
          .update(quoteData)
          .eq('id', editingQuote.id);

        if (error) throw error;
        quoteId = editingQuote.id;

        // Delete existing items
        await supabase
          .from('quote_items')
          .delete()
          .eq('quote_id', editingQuote.id);
      } else {
        const { data: newQuote, error } = await supabase
          .from('quotes')
          .insert(quoteData)
          .select()
          .single();

        if (error) throw error;
        quoteId = newQuote.id;
      }

      // Insert quote items
      const itemsToInsert = quoteItems.map(item => {
        const product = products.find(p => p.id === item.product_id)!;
        const itemSubtotal = item.quantity * item.unit_price;
        const itemDiscount = itemSubtotal * (item.discount_percent / 100);
        const itemTax = (itemSubtotal - itemDiscount) * (product.tax_rate / 100);
        
        return {
          quote_id: quoteId,
          product_id: item.product_id,
          quantity: item.quantity,
          unit_price: item.unit_price,
          discount_percent: item.discount_percent,
          tax_amount: itemTax,
          total_amount: itemSubtotal - itemDiscount + itemTax,
        };
      });

      const { error: itemsError } = await supabase
        .from('quote_items')
        .insert(itemsToInsert);

      if (itemsError) throw itemsError;

      await fetchData();
      setShowForm(false);
      setEditingQuote(null);
      setQuoteItems([]);
      reset();

      // Show success message based on role and action
      if (!editingQuote) {
        if (user.role === 'agent') {
          alert('Quote created as draft. You can submit it for approval when ready.');
        } else {
          alert('Quote created and automatically approved.');
        }
      }
    } catch (error) {
      console.error('Error saving quote:', error);
    }
  };

  const handleStatusChange = async (quoteId: string, newStatus: Quote['status'], reason?: string) => {
    if (!supabase) return;

    try {
      const updateData: any = { status: newStatus };
      
      if (newStatus === 'approved' && user?.id) {
        updateData.approved_by = user.id;
      } else if (newStatus === 'sent') {
        updateData.sent_at = new Date().toISOString();
      }

      // Add rejection reason to notes if provided
      if (newStatus === 'rejected' && reason) {
        const quote = quotes.find(q => q.id === quoteId);
        const existingNotes = quote?.notes || '';
        updateData.notes = existingNotes + (existingNotes ? '\n\n' : '') + `Rejected: ${reason}`;
      }

      const { error } = await supabase
        .from('quotes')
        .update(updateData)
        .eq('id', quoteId);

      if (error) throw error;
      await fetchData();
      setViewingQuote(null);

      // Show appropriate success message
      const statusMessages = {
        pending_approval: 'Quote submitted for approval.',
        approved: 'Quote approved successfully.',
        rejected: 'Quote rejected.',
        sent: 'Quote marked as sent.',
      };
      
      if (statusMessages[newStatus]) {
        alert(statusMessages[newStatus]);
      }
    } catch (error) {
      console.error('Error updating quote status:', error);
    }
  };

  const handleDelete = async (quoteId: string) => {
    if (!supabase || !confirm('Are you sure you want to delete this quote?')) return;

    try {
      const { error } = await supabase
        .from('quotes')
        .delete()
        .eq('id', quoteId);

      if (error) throw error;
      await fetchData();
      setViewingQuote(null);
    } catch (error) {
      console.error('Error deleting quote:', error);
    }
  };

  const handleEdit = (quote: Quote) => {
    setEditingQuote(quote);
    setValue('client_id', quote.client_id);
    setValue('valid_until', quote.valid_until);
    setValue('terms_conditions', quote.terms_conditions || '');
    setValue('notes', quote.notes || '');
    
    // Load quote items
    fetchQuoteItemsForEdit(quote.id);
    setShowForm(true);
  };

  const fetchQuoteItemsForEdit = async (quoteId: string) => {
    if (!supabase) return;

    try {
      const { data, error } = await supabase
        .from('quote_items')
        .select('*')
        .eq('quote_id', quoteId);

      if (error) throw error;
      
      const items = data.map(item => ({
        product_id: item.product_id,
        quantity: item.quantity,
        unit_price: item.unit_price,
        discount_percent: item.discount_percent,
      }));
      
      setQuoteItems(items);
    } catch (error) {
      console.error('Error fetching quote items for edit:', error);
    }
  };

  const handleDownloadPDF = async (quote: Quote) => {
    if (!organization || !supabase) return;

    try {
      // Fetch quote items
      const { data: items, error } = await supabase
        .from('quote_items')
        .select(`
          *,
          product:products(*)
        `)
        .eq('quote_id', quote.id);

      if (error) throw error;

      await generateQuotePDF(quote, items || [], organization.name);
    } catch (error) {
      console.error('Error generating PDF:', error);
      alert('Failed to generate PDF. Please try again.');
    }
  };

  const getStatusBadge = (status: Quote['status']) => {
    const statusConfig = {
      draft: { variant: 'default' as const, label: 'Draft' },
      pending_approval: { variant: 'warning' as const, label: 'Pending Approval' },
      approved: { variant: 'success' as const, label: 'Approved' },
      sent: { variant: 'info' as const, label: 'Sent' },
      rejected: { variant: 'danger' as const, label: 'Rejected' },
    };
    
    const config = statusConfig[status];
    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  // Check permissions for actions
  const canCreateQuotes = permissions?.can_create_quotes;
  const canApproveQuotes = permissions?.can_approve_quotes;
  const canSendQuotes = permissions?.can_send_quotes;

  const filteredQuotes = quotes.filter(quote => {
    const matchesSearch = quote.quote_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         quote.client?.name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || quote.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  console.log('Render state:', { loading, organization: !!organization, quotesCount: quotes.length, clientsCount: clients.length, productsCount: products.length });

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-2 border-primary-600 border-t-transparent"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Quotes</h1>
          <p className="text-gray-600">Create and manage your quotes</p>
          {user?.role === 'agent' && (
            <p className="text-sm text-amber-600 mt-1">
              💡 As an agent, your quotes will be created as drafts and require approval before sending.
            </p>
          )}
        </div>
        {canCreateQuotes && (
          <Button
            onClick={() => {
              setEditingQuote(null);
              setQuoteItems([]);
              reset();
              setShowForm(true);
            }}
            icon={Plus}
          >
            Create Quote
          </Button>
        )}
      </div>

      {/* Filters */}
      <Card>
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <input
                type="text"
                placeholder="Search quotes..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 pr-4 py-2 w-full border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
              />
            </div>
          </div>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
          >
            {statuses.map(status => (
              <option key={status.value} value={status.value}>{status.label}</option>
            ))}
          </select>
        </div>
      </Card>

      {/* Quote Form Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <Card className="w-full max-w-6xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-xl font-semibold">
                  {editingQuote ? 'Edit Quote' : 'Create New Quote'}
                </h2>
                {!editingQuote && user?.role === 'agent' && (
                  <p className="text-sm text-amber-600 mt-1">
                    This quote will be created as a draft. You can submit it for approval when ready.
                  </p>
                )}
                {!editingQuote && (user?.role === 'manager' || user?.role === 'admin') && (
                  <p className="text-sm text-green-600 mt-1">
                    This quote will be automatically approved and ready to send.
                  </p>
                )}
              </div>
              <button
                onClick={() => setShowForm(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                ×
              </button>
            </div>

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Client
                  </label>
                  <select
                    {...register('client_id', { required: 'Client is required' })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                  >
                    <option value="">Select a client</option>
                    {clients.map(client => (
                      <option key={client.id} value={client.id}>{client.name}</option>
                    ))}
                  </select>
                  {errors.client_id && (
                    <p className="text-sm text-red-600 mt-1">{errors.client_id.message}</p>
                  )}
                </div>

                <Input
                  {...register('valid_until', { required: 'Valid until date is required' })}
                  type="date"
                  label="Valid Until"
                  error={errors.valid_until?.message}
                />
              </div>

              {/* Quote Items */}
              <div>
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-medium text-gray-900">Quote Items</h3>
                  <Button type="button" onClick={addQuoteItem} size="sm">
                    Add Item
                  </Button>
                </div>

                <div className="space-y-4">
                  {quoteItems.map((item, index) => (
                    <div key={index} className="border border-gray-200 rounded-lg p-4">
                      <div className="grid grid-cols-1 md:grid-cols-6 gap-4 items-end">
                        <div className="md:col-span-2">
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Product
                          </label>
                          <select
                            value={item.product_id}
                            onChange={(e) => updateQuoteItem(index, 'product_id', e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                          >
                            <option value="">Select product</option>
                            {products.map(product => (
                              <option key={product.id} value={product.id}>
                                {product.name} - ${product.price}
                              </option>
                            ))}
                          </select>
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Quantity
                          </label>
                          <input
                            type="number"
                            min="1"
                            value={item.quantity}
                            onChange={(e) => updateQuoteItem(index, 'quantity', Number(e.target.value))}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                          />
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Unit Price
                          </label>
                          <input
                            type="number"
                            step="0.01"
                            min="0"
                            value={item.unit_price}
                            onChange={(e) => updateQuoteItem(index, 'unit_price', Number(e.target.value))}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                          />
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Discount %
                          </label>
                          <input
                            type="number"
                            min="0"
                            max="100"
                            step="0.01"
                            value={item.discount_percent}
                            onChange={(e) => updateQuoteItem(index, 'discount_percent', Number(e.target.value))}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                          />
                        </div>

                        <div className="flex items-center justify-between">
                          <div>
                            <span className="text-sm font-medium text-gray-700">Total</span>
                            <p className="text-lg font-semibold">
                              ${item.product_id ? calculateItemTotal(item).toFixed(2) : '0.00'}
                            </p>
                          </div>
                          <button
                            type="button"
                            onClick={() => removeQuoteItem(index)}
                            className="text-red-600 hover:text-red-800"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                {quoteItems.length > 0 && (
                  <div className="bg-gray-50 rounded-lg p-4 mt-4">
                    <div className="flex justify-between items-center">
                      <span className="text-lg font-semibold">Quote Total:</span>
                      <span className="text-xl font-bold text-primary-600">
                        ${calculateQuoteTotals().totalAmount.toFixed(2)}
                      </span>
                    </div>
                  </div>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Terms & Conditions
                  </label>
                  <textarea
                    {...register('terms_conditions')}
                    rows={4}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                    placeholder="Enter terms and conditions"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Notes
                  </label>
                  <textarea
                    {...register('notes')}
                    rows={4}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                    placeholder="Enter internal notes"
                  />
                </div>
              </div>

              <div className="flex justify-end space-x-3 pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowForm(false)}
                >
                  Cancel
                </Button>
                <Button type="submit">
                  {editingQuote ? 'Update Quote' : 'Create Quote'}
                </Button>
              </div>
            </form>
          </Card>
        </div>
      )}

      {/* Quote View Modal */}
      {viewingQuote && (
        <QuoteViewModal
          quote={viewingQuote}
          isOpen={!!viewingQuote}
          onClose={() => setViewingQuote(null)}
          onStatusChange={handleStatusChange}
          onEdit={handleEdit}
          onDelete={handleDelete}
        />
      )}

      {/* Quotes List */}
      <div className="space-y-4">
        {filteredQuotes.map((quote) => (
          <Card key={quote.id} className="hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <div className="w-10 h-10 bg-primary-100 rounded-lg flex items-center justify-center">
                  <FileText className="w-5 h-5 text-primary-600" />
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900">{quote.quote_number}</h3>
                  <p className="text-sm text-gray-500">{quote.client?.name}</p>
                </div>
              </div>

              <div className="flex items-center space-x-4">
                <div className="text-right">
                  <p className="font-semibold text-gray-900">${quote.total_amount.toFixed(2)}</p>
                  <p className="text-sm text-gray-500">
                    Valid until: {new Date(quote.valid_until).toLocaleDateString()}
                  </p>
                </div>

                <div className="flex items-center space-x-2">
                  {getStatusBadge(quote.status)}
                </div>

                <div className="flex items-center space-x-1">
                  {/* Status-based action buttons */}
                  {quote.status === 'draft' && (
                    <button
                      onClick={() => handleStatusChange(quote.id, 'pending_approval')}
                      className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg"
                      title="Submit for approval"
                    >
                      <Send className="w-4 h-4" />
                    </button>
                  )}
                  
                  {quote.status === 'pending_approval' && canApproveQuotes && (
                    <>
                      <button
                        onClick={() => handleStatusChange(quote.id, 'approved')}
                        className="p-2 text-green-600 hover:bg-green-50 rounded-lg"
                        title="Approve"
                      >
                        <Check className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => {
                          const reason = prompt('Reason for rejection (optional):');
                          handleStatusChange(quote.id, 'rejected', reason || undefined);
                        }}
                        className="p-2 text-red-600 hover:bg-red-50 rounded-lg"
                        title="Reject"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </>
                  )}

                  {quote.status === 'approved' && canSendQuotes && (
                    <button
                      onClick={() => handleStatusChange(quote.id, 'sent')}
                      className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg"
                      title="Mark as sent"
                    >
                      <Send className="w-4 h-4" />
                    </button>
                  )}

                  <button
                    onClick={() => setViewingQuote(quote)}
                    className="p-2 text-gray-600 hover:bg-gray-50 rounded-lg"
                    title="View quote"
                  >
                    <Eye className="w-4 h-4" />
                  </button>

                  <button
                    onClick={() => handleDownloadPDF(quote)}
                    className="p-2 text-gray-600 hover:bg-gray-50 rounded-lg"
                    title="Download PDF"
                  >
                    <Download className="w-4 h-4" />
                  </button>

                  {quote.status === 'draft' && (
                    <button
                      onClick={() => handleEdit(quote)}
                      className="p-2 text-gray-600 hover:bg-gray-50 rounded-lg"
                      title="Edit quote"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                  )}

                  <button
                    onClick={() => handleDelete(quote.id)}
                    className="p-2 text-red-600 hover:bg-red-50 rounded-lg"
                    title="Delete quote"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          </Card>
        ))}
      </div>

      {filteredQuotes.length === 0 && (
        <Card className="text-center py-12">
          <FileText className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No quotes found</h3>
          <p className="text-gray-500 mb-4">
            {searchTerm || statusFilter !== 'all'
              ? 'Try adjusting your search or filter criteria.'
              : 'Get started by creating your first quote.'
            }
          </p>
          {!searchTerm && statusFilter === 'all' && canCreateQuotes && (
            <Button
              onClick={() => {
                setEditingQuote(null);
                setQuoteItems([]);
                reset();
                setShowForm(true);
              }}
              icon={Plus}
            >
              Create Your First Quote
            </Button>
          )}
        </Card>
      )}
    </div>
  );
};