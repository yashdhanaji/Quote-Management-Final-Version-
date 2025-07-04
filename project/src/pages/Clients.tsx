import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { Plus, Search, Edit2, Trash2, Users, Mail, Phone, MapPin, Building } from 'lucide-react';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { useAuthStore } from '../stores/authStore';
import { supabase } from '../lib/supabase';
import { Client } from '../types';

interface ClientFormData {
  name: string;
  contact_person: string;
  email: string;
  phone: string;
  gstin: string;
  pan: string;
  address: string;
  payment_terms: string;
}

export const Clients: React.FC = () => {
  const { user, organization } = useAuthStore();
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingClient, setEditingClient] = useState<Client | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  const { register, handleSubmit, formState: { errors }, reset, setValue } = useForm<ClientFormData>();

  useEffect(() => {
    fetchClients();
  }, [organization?.id]);

  const fetchClients = async () => {
    console.log('Fetching clients for organization:', organization?.id);
    
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
      console.log('Making supabase query...');
      const { data, error } = await supabase
        .from('clients')
        .select('*')
        .eq('organization_id', organization.id)
        .order('created_at', { ascending: false });

      console.log('Supabase response:', { data, error });

      if (error) {
        console.error('Supabase error:', error);
        throw error;
      }
      
      setClients(data || []);
      console.log('Clients set:', data?.length || 0);
    } catch (error) {
      console.error('Error fetching clients:', error);
    } finally {
      setLoading(false);
    }
  };

  const onSubmit = async (data: ClientFormData) => {
    if (!organization?.id || !supabase) return;

    try {
      const clientData = {
        ...data,
        organization_id: organization.id,
      };

      if (editingClient) {
        const { error } = await supabase
          .from('clients')
          .update(clientData)
          .eq('id', editingClient.id);

        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('clients')
          .insert(clientData);

        if (error) throw error;
      }

      await fetchClients();
      setShowForm(false);
      setEditingClient(null);
      reset();
    } catch (error) {
      console.error('Error saving client:', error);
    }
  };

  const handleEdit = (client: Client) => {
    setEditingClient(client);
    setValue('name', client.name);
    setValue('contact_person', client.contact_person || '');
    setValue('email', client.email || '');
    setValue('phone', client.phone || '');
    setValue('gstin', client.gstin || '');
    setValue('pan', client.pan || '');
    setValue('address', client.address || '');
    setValue('payment_terms', client.payment_terms || '');
    setShowForm(true);
  };

  const handleDelete = async (clientId: string) => {
    if (!supabase || !confirm('Are you sure you want to delete this client?')) return;

    try {
      const { error } = await supabase
        .from('clients')
        .delete()
        .eq('id', clientId);

      if (error) throw error;
      await fetchClients();
    } catch (error) {
      console.error('Error deleting client:', error);
    }
  };

  const filteredClients = clients.filter(client =>
    client.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (client.contact_person && client.contact_person.toLowerCase().includes(searchTerm.toLowerCase())) ||
    (client.email && client.email.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  console.log('Render state:', { loading, organization: !!organization, clientsCount: clients.length });

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
          <h1 className="text-2xl font-bold text-gray-900">Clients</h1>
          <p className="text-gray-600">Manage your client relationships</p>
        </div>
        <Button
          onClick={() => {
            setEditingClient(null);
            reset();
            setShowForm(true);
          }}
          icon={Plus}
        >
          Add Client
        </Button>
      </div>

      {/* Search */}
      <Card>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
          <input
            type="text"
            placeholder="Search clients..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10 pr-4 py-2 w-full border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
          />
        </div>
      </Card>

      {/* Client Form Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <Card className="w-full max-w-4xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-semibold">
                {editingClient ? 'Edit Client' : 'Add New Client'}
              </h2>
              <button
                onClick={() => setShowForm(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                ×
              </button>
            </div>

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Input
                  {...register('name', { required: 'Client name is required' })}
                  label="Client Name"
                  error={errors.name?.message}
                  placeholder="Enter client name"
                  icon={Building}
                />
                <Input
                  {...register('contact_person')}
                  label="Contact Person"
                  placeholder="Enter contact person name"
                  icon={Users}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Input
                  {...register('email', {
                    pattern: {
                      value: /^\S+@\S+$/i,
                      message: 'Invalid email address'
                    }
                  })}
                  type="email"
                  label="Email"
                  error={errors.email?.message}
                  placeholder="Enter email address"
                  icon={Mail}
                />
                <Input
                  {...register('phone')}
                  label="Phone"
                  placeholder="Enter phone number"
                  icon={Phone}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Input
                  {...register('gstin')}
                  label="GSTIN"
                  placeholder="Enter GSTIN number"
                />
                <Input
                  {...register('pan')}
                  label="PAN"
                  placeholder="Enter PAN number"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Address
                </label>
                <textarea
                  {...register('address')}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                  placeholder="Enter client address"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Payment Terms
                </label>
                <select
                  {...register('payment_terms')}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                >
                  <option value="">Select payment terms</option>
                  <option value="Net 15">Net 15 days</option>
                  <option value="Net 30">Net 30 days</option>
                  <option value="Net 45">Net 45 days</option>
                  <option value="Net 60">Net 60 days</option>
                  <option value="Due on receipt">Due on receipt</option>
                  <option value="Cash on delivery">Cash on delivery</option>
                </select>
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
                  {editingClient ? 'Update Client' : 'Add Client'}
                </Button>
              </div>
            </form>
          </Card>
        </div>
      )}

      {/* Clients Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredClients.map((client) => (
          <Card key={client.id} className="hover:shadow-md transition-shadow">
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                  <Building className="w-5 h-5 text-blue-600" />
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900">{client.name}</h3>
                  {client.contact_person && (
                    <p className="text-sm text-gray-500">{client.contact_person}</p>
                  )}
                </div>
              </div>
              <div className="flex items-center space-x-1">
                <button
                  onClick={() => handleEdit(client)}
                  className="p-1 text-gray-400 hover:text-gray-600 rounded"
                >
                  <Edit2 className="w-4 h-4" />
                </button>
                <button
                  onClick={() => handleDelete(client.id)}
                  className="p-1 text-gray-400 hover:text-red-600 rounded"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>

            <div className="space-y-3">
              {client.email && (
                <div className="flex items-center space-x-2">
                  <Mail className="w-4 h-4 text-gray-400" />
                  <span className="text-sm text-gray-600">{client.email}</span>
                </div>
              )}
              
              {client.phone && (
                <div className="flex items-center space-x-2">
                  <Phone className="w-4 h-4 text-gray-400" />
                  <span className="text-sm text-gray-600">{client.phone}</span>
                </div>
              )}

              {client.address && (
                <div className="flex items-start space-x-2">
                  <MapPin className="w-4 h-4 text-gray-400 mt-0.5" />
                  <span className="text-sm text-gray-600 line-clamp-2">{client.address}</span>
                </div>
              )}

              {client.payment_terms && (
                <div className="pt-2 border-t border-gray-100">
                  <span className="text-xs text-gray-500">Payment Terms: </span>
                  <span className="text-xs font-medium text-gray-700">{client.payment_terms}</span>
                </div>
              )}

              {(client.gstin || client.pan) && (
                <div className="pt-2 border-t border-gray-100 space-y-1">
                  {client.gstin && (
                    <div>
                      <span className="text-xs text-gray-500">GSTIN: </span>
                      <span className="text-xs font-medium text-gray-700">{client.gstin}</span>
                    </div>
                  )}
                  {client.pan && (
                    <div>
                      <span className="text-xs text-gray-500">PAN: </span>
                      <span className="text-xs font-medium text-gray-700">{client.pan}</span>
                    </div>
                  )}
                </div>
              )}
            </div>
          </Card>
        ))}
      </div>

      {filteredClients.length === 0 && (
        <Card className="text-center py-12">
          <Users className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No clients found</h3>
          <p className="text-gray-500 mb-4">
            {searchTerm 
              ? 'Try adjusting your search criteria.'
              : 'Get started by adding your first client.'
            }
          </p>
          {!searchTerm && (
            <Button
              onClick={() => {
                setEditingClient(null);
                reset();
                setShowForm(true);
              }}
              icon={Plus}
            >
              Add Your First Client
            </Button>
          )}
        </Card>
      )}
    </div>
  );
};