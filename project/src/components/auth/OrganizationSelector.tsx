import React, { useState } from 'react';
import { Building2, ArrowRight, Plus } from 'lucide-react';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { useAuthStore } from '../../stores/authStore';
import { useForm } from 'react-hook-form';

interface CreateOrgFormData {
  name: string;
}

export const OrganizationSelector: React.FC = () => {
  const { userOrganizations, switchOrganization, createOrganization } = useAuthStore();
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [creating, setCreating] = useState(false);

  const { register, handleSubmit, formState: { errors }, reset } = useForm<CreateOrgFormData>();

  const handleSelectOrganization = async (orgId: string) => {
    try {
      setLoading(true);
      await switchOrganization(orgId);
    } catch (error) {
      console.error('Error selecting organization:', error);
      alert('Failed to select organization. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const onCreateSubmit = async (data: CreateOrgFormData) => {
    try {
      setCreating(true);
      await createOrganization(data.name);
    } catch (error) {
      console.error('Error creating organization:', error);
      alert('Failed to create organization. Please try again.');
    } finally {
      setCreating(false);
    }
  };

  const getRoleDisplayName = (role: string) => {
    const roleNames = {
      admin: 'Administrator',
      manager: 'Manager',
      agent: 'Sales Agent',
    };
    return roleNames[role as keyof typeof roleNames] || 'User';
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-50 to-secondary-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="mx-auto w-12 h-12 bg-primary-600 rounded-xl flex items-center justify-center mb-4">
            <Building2 className="w-6 h-6 text-white" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900">Select Organization</h2>
          <p className="text-gray-600 mt-2">Choose which organization to access</p>
        </div>

        {!showCreateForm ? (
          <div className="space-y-4">
            {userOrganizations.map((org) => (
              <button
                key={org.organization_id}
                onClick={() => handleSelectOrganization(org.organization_id)}
                disabled={loading}
                className="w-full flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:border-primary-300 hover:bg-primary-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 bg-primary-100 rounded-lg flex items-center justify-center">
                    <Building2 className="w-5 h-5 text-primary-600" />
                  </div>
                  <div className="text-left">
                    <h3 className="font-semibold text-gray-900">{org.organization_name}</h3>
                    <p className="text-sm text-gray-500">{getRoleDisplayName(org.user_role)}</p>
                  </div>
                </div>
                <ArrowRight className="w-5 h-5 text-gray-400" />
              </button>
            ))}

            <div className="pt-4 border-t border-gray-200">
              <Button
                onClick={() => setShowCreateForm(true)}
                variant="outline"
                icon={Plus}
                className="w-full"
              >
                Create New Organization
              </Button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit(onCreateSubmit)} className="space-y-4">
            <div className="text-center mb-4">
              <h3 className="text-lg font-semibold text-gray-900">Create New Organization</h3>
              <p className="text-sm text-gray-600">You'll be the administrator of this organization</p>
            </div>

            <Input
              {...register('name', { 
                required: 'Organization name is required',
                minLength: { value: 2, message: 'Name must be at least 2 characters' }
              })}
              label="Organization Name"
              icon={Building2}
              error={errors.name?.message}
              placeholder="Enter organization name"
              autoFocus
            />

            <div className="flex space-x-3">
              <Button
                type="submit"
                loading={creating}
                className="flex-1"
              >
                Create Organization
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setShowCreateForm(false);
                  reset();
                }}
              >
                Cancel
              </Button>
            </div>
          </form>
        )}
      </Card>
    </div>
  );
};