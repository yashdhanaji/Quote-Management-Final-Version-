import React, { useState, useEffect } from 'react';
import { X, Download, Send, Check, Edit2, Trash2, AlertCircle } from 'lucide-react';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { Badge } from '../ui/Badge';
import { Quote, QuoteItem } from '../../types';
import { supabase } from '../../lib/supabase';
import { useAuthStore } from '../../stores/authStore';
import { generateQuotePDF } from '../../utils/pdfGenerator';

interface QuoteViewModalProps {
  quote: Quote;
  isOpen: boolean;
  onClose: () => void;
  onStatusChange: (quoteId: string, newStatus: Quote['status'], reason?: string) => void;
  onEdit: (quote: Quote) => void;
  onDelete: (quoteId: string) => void;
}

export const QuoteViewModal: React.FC<QuoteViewModalProps> = ({
  quote,
  isOpen,
  onClose,
  onStatusChange,
  onEdit,
  onDelete,
}) => {
  const { user, organization, permissions } = useAuthStore();
  const [quoteItems, setQuoteItems] = useState<QuoteItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [rejectReason, setRejectReason] = useState('');

  useEffect(() => {
    if (isOpen && quote.id) {
      fetchQuoteItems();
    }
  }, [isOpen, quote.id]);

  const fetchQuoteItems = async () => {
    if (!supabase) return;

    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('quote_items')
        .select(`
          *,
          product:products(*)
        `)
        .eq('quote_id', quote.id);

      if (error) throw error;
      setQuoteItems(data || []);
    } catch (error) {
      console.error('Error fetching quote items:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadPDF = async () => {
    if (!organization) return;
    
    try {
      await generateQuotePDF(quote, quoteItems, organization.name);
    } catch (error) {
      console.error('Error generating PDF:', error);
      alert('Failed to generate PDF. Please try again.');
    }
  };

  const handleReject = () => {
    onStatusChange(quote.id, 'rejected', rejectReason);
    setShowRejectModal(false);
    setRejectReason('');
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

  // Permission checks based on role and quote status
  const canSubmitForApproval = quote.status === 'draft' && (quote.created_by === user?.id || user?.role !== 'agent');
  const canApprove = permissions?.can_approve_quotes && quote.status === 'pending_approval';
  const canReject = permissions?.can_approve_quotes && quote.status === 'pending_approval';
  const canSend = permissions?.can_send_quotes && quote.status === 'approved';
  const canEdit = quote.status === 'draft' && (quote.created_by === user?.id || user?.role !== 'agent');
  const canDelete = quote.created_by === user?.id || user?.role === 'admin';

  if (!isOpen) return null;

  return (
    <>
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
        <Card className="w-full max-w-4xl max-h-[90vh] overflow-y-auto">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center space-x-4">
              <h2 className="text-2xl font-bold text-gray-900">{quote.quote_number}</h2>
              {getStatusBadge(quote.status)}
            </div>
            <div className="flex items-center space-x-2">
              <Button
                onClick={handleDownloadPDF}
                variant="outline"
                size="sm"
                icon={Download}
              >
                Download PDF
              </Button>
              <button
                onClick={onClose}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-6 h-6" />
              </button>
            </div>
          </div>

          {loading ? (
            <div className="flex items-center justify-center h-64">
              <div className="animate-spin rounded-full h-8 w-8 border-2 border-primary-600 border-t-transparent"></div>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Quote Status Info */}
              {quote.status === 'pending_approval' && (
                <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                  <div className="flex items-center">
                    <AlertCircle className="w-5 h-5 text-amber-600 mr-2" />
                    <p className="text-amber-800">
                      This quote is pending approval. {permissions?.can_approve_quotes ? 'You can approve or reject it below.' : 'Waiting for manager/admin approval.'}
                    </p>
                  </div>
                </div>
              )}

              {quote.status === 'rejected' && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                  <div className="flex items-center">
                    <X className="w-5 h-5 text-red-600 mr-2" />
                    <p className="text-red-800">This quote has been rejected.</p>
                  </div>
                </div>
              )}

              {quote.status === 'approved' && (
                <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                  <div className="flex items-center">
                    <Check className="w-5 h-5 text-green-600 mr-2" />
                    <p className="text-green-800">
                      This quote has been approved. {permissions?.can_send_quotes ? 'You can now send it to the client.' : 'Ready to be sent to client.'}
                    </p>
                  </div>
                </div>
              )}

              {/* Quote Header */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-3">Client Information</h3>
                  <div className="space-y-2">
                    <p><span className="font-medium">Name:</span> {quote.client.name}</p>
                    {quote.client.contact_person && (
                      <p><span className="font-medium">Contact:</span> {quote.client.contact_person}</p>
                    )}
                    {quote.client.email && (
                      <p><span className="font-medium">Email:</span> {quote.client.email}</p>
                    )}
                    {quote.client.phone && (
                      <p><span className="font-medium">Phone:</span> {quote.client.phone}</p>
                    )}
                    {quote.client.address && (
                      <p><span className="font-medium">Address:</span> {quote.client.address}</p>
                    )}
                  </div>
                </div>
                
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-3">Quote Details</h3>
                  <div className="space-y-2">
                    <p><span className="font-medium">Created:</span> {new Date(quote.created_at).toLocaleDateString()}</p>
                    <p><span className="font-medium">Valid Until:</span> {new Date(quote.valid_until).toLocaleDateString()}</p>
                    {quote.sent_at && (
                      <p><span className="font-medium">Sent:</span> {new Date(quote.sent_at).toLocaleDateString()}</p>
                    )}
                    <p><span className="font-medium">Total Amount:</span> <span className="text-xl font-bold text-primary-600">${quote.total_amount.toFixed(2)}</span></p>
                  </div>
                </div>
              </div>

              {/* Quote Items */}
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-3">Items</h3>
                <div className="overflow-x-auto">
                  <table className="w-full border-collapse border border-gray-200">
                    <thead>
                      <tr className="bg-gray-50">
                        <th className="border border-gray-200 px-4 py-2 text-left">Product</th>
                        <th className="border border-gray-200 px-4 py-2 text-center">Qty</th>
                        <th className="border border-gray-200 px-4 py-2 text-right">Unit Price</th>
                        <th className="border border-gray-200 px-4 py-2 text-center">Discount</th>
                        <th className="border border-gray-200 px-4 py-2 text-right">Total</th>
                      </tr>
                    </thead>
                    <tbody>
                      {quoteItems.map((item) => (
                        <tr key={item.id} className="hover:bg-gray-50">
                          <td className="border border-gray-200 px-4 py-2">
                            <div>
                              <p className="font-medium">{item.product.name}</p>
                              {item.product.description && (
                                <p className="text-sm text-gray-600">{item.product.description}</p>
                              )}
                              <p className="text-xs text-gray-500">SKU: {item.product.sku}</p>
                            </div>
                          </td>
                          <td className="border border-gray-200 px-4 py-2 text-center">{item.quantity}</td>
                          <td className="border border-gray-200 px-4 py-2 text-right">${item.unit_price.toFixed(2)}</td>
                          <td className="border border-gray-200 px-4 py-2 text-center">{item.discount_percent}%</td>
                          <td className="border border-gray-200 px-4 py-2 text-right font-medium">${item.total_amount.toFixed(2)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Quote Totals */}
              <div className="flex justify-end">
                <div className="w-64 space-y-2">
                  <div className="flex justify-between">
                    <span>Subtotal:</span>
                    <span>${quote.subtotal.toFixed(2)}</span>
                  </div>
                  {quote.discount_amount > 0 && (
                    <div className="flex justify-between">
                      <span>Discount:</span>
                      <span>-${quote.discount_amount.toFixed(2)}</span>
                    </div>
                  )}
                  {quote.tax_amount > 0 && (
                    <div className="flex justify-between">
                      <span>Tax:</span>
                      <span>${quote.tax_amount.toFixed(2)}</span>
                    </div>
                  )}
                  <div className="flex justify-between font-bold text-lg border-t pt-2">
                    <span>Total:</span>
                    <span>${quote.total_amount.toFixed(2)}</span>
                  </div>
                </div>
              </div>

              {/* Terms and Notes */}
              {(quote.terms_conditions || quote.notes) && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {quote.terms_conditions && (
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900 mb-3">Terms & Conditions</h3>
                      <p className="text-gray-700 whitespace-pre-wrap">{quote.terms_conditions}</p>
                    </div>
                  )}
                  {quote.notes && (
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900 mb-3">Notes</h3>
                      <p className="text-gray-700 whitespace-pre-wrap">{quote.notes}</p>
                    </div>
                  )}
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex items-center justify-between pt-6 border-t">
                <div className="flex items-center space-x-2">
                  {canSubmitForApproval && (
                    <Button
                      onClick={() => onStatusChange(quote.id, 'pending_approval')}
                      variant="secondary"
                      size="sm"
                      icon={Send}
                    >
                      Submit for Approval
                    </Button>
                  )}
                  
                  {canApprove && (
                    <Button
                      onClick={() => onStatusChange(quote.id, 'approved')}
                      variant="primary"
                      size="sm"
                      icon={Check}
                    >
                      Approve Quote
                    </Button>
                  )}

                  {canReject && (
                    <Button
                      onClick={() => setShowRejectModal(true)}
                      variant="danger"
                      size="sm"
                      icon={X}
                    >
                      Reject Quote
                    </Button>
                  )}

                  {canSend && (
                    <Button
                      onClick={() => onStatusChange(quote.id, 'sent')}
                      variant="primary"
                      size="sm"
                      icon={Send}
                    >
                      Mark as Sent
                    </Button>
                  )}
                </div>

                <div className="flex items-center space-x-2">
                  {canEdit && (
                    <Button
                      onClick={() => onEdit(quote)}
                      variant="outline"
                      size="sm"
                      icon={Edit2}
                    >
                      Edit
                    </Button>
                  )}
                  {canDelete && (
                    <Button
                      onClick={() => onDelete(quote.id)}
                      variant="danger"
                      size="sm"
                      icon={Trash2}
                    >
                      Delete
                    </Button>
                  )}
                  <Button
                    onClick={onClose}
                    variant="outline"
                    size="sm"
                  >
                    Close
                  </Button>
                </div>
              </div>
            </div>
          )}
        </Card>
      </div>

      {/* Reject Modal */}
      {showRejectModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-60">
          <Card className="w-full max-w-md">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">Reject Quote</h3>
              <button
                onClick={() => setShowRejectModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="space-y-4">
              <p className="text-gray-600">
                Please provide a reason for rejecting this quote (optional):
              </p>
              
              <textarea
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                placeholder="Enter rejection reason..."
              />
              
              <div className="flex justify-end space-x-3">
                <Button
                  onClick={() => setShowRejectModal(false)}
                  variant="outline"
                  size="sm"
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleReject}
                  variant="danger"
                  size="sm"
                >
                  Reject Quote
                </Button>
              </div>
            </div>
          </Card>
        </div>
      )}
    </>
  );
};