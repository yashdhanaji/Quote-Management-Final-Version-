import React, { useState } from 'react';
import { ChevronDown, Building2, Plus, Check } from 'lucide-react';
import { useAuthStore } from '../../stores/authStore';
import { Button } from '../ui/Button';
import { Card } from '../ui/Card';
import { Input } from '../ui/Input';
import { useForm } from 'react-hook-form';

interface CreateOrgFormData {
  name: string;
}

export const OrganizationSwitcher: React.FC = () => {
  const { 
    organization, 
    userOrganizations, 
    currentOrgMembership,
    switchOrganization, 
    createOrganization 
  } = useAuthStore();
  
  const [isOpen, setIsOpen] = useState(false);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [creating, setCreating] = useState(false);

  const { register, handleSubmit, formState: { errors }, reset } = useForm<CreateOrgFormData>();

  const handleSwitchOrganization = async (orgId: string) => {
    try {
      await switchOrganization(orgId);
      setIsOpen(false);
    } catch (error) {
      console.error('Error switching organization:', error);
      alert('Failed to switch organization. Please try again.');
    }
  };

  const onCreateSubmit = async (data: CreateOrgFormData) => {
    try {
      setCreating(true);
      await createOrganization(data.name);
      setShowCreateForm(false);
      setIsOpen(false);
      reset();
    } catch (error) {
      console.error('Error creating organization:', error);
      alert('Failed to create organization. Please try again.');
    } finally {
      setCreating(false);
    }
  };

  const getRoleDisplayName = (role: string) => {
    const roleNames = {
      admin: 'Admin',
      manager: 'Manager',
      agent: 'Agent',
    };
    return roleNames[role as keyof typeof roleNames] || 'User';
  };

  if (!organization || userOrganizations.length === 0) {
    return null;
  }

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center space-x-2 px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
      >
        <Building2 className="w-4 h-4" />
        <span className="max-w-32 truncate">{organization.name}</span>
        <ChevronDown className="w-4 h-4" />
      </button>

      {isOpen && (
        <>
          <div 
            className="fixed inset-0 z-10" 
            onClick={() => setIsOpen(false)}
          />
          <Card className="absolute top-full left-0 mt-2 w-80 z-20 p-0">
            <div className="p-4 border-b border-gray-200">
              <h3 className="text-sm font-medium text-gray-900">Switch Organization</h3>
              <p className="text-xs text-gray-500 mt-1">
                You're currently in <span className="font-medium">{organization.name}</span> as {getRoleDisplayName(currentOrgMembership?.role || '')}
              </p>
            </div>

            <div className="max-h-64 overflow-y-auto">
              {userOrganizations.map((org) => (
                <button
                  key={org.organization_id}
                  onClick={() => handleSwitchOrganization(org.organization_id)}
                  className="w-full flex items-center justify-between px-4 py-3 text-left hover:bg-gray-50 transition-colors"
                >
                  <div className="flex items-center space-x-3">
                    <div className="w-8 h-8 bg-primary-100 rounded-lg flex items-center justify-center">
                      <Building2 className="w-4 h-4 text-primary-600" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-900">
                        {org.organization_name}
                      </p>
                      <p className="text-xs text-gray-500">
                        {getRoleDisplayName(org.user_role)}
                      </p>
                    </div>
                  </div>
                  {org.organization_id === organization.id && (
                    <Check className="w-4 h-4 text-primary-600" />
                  )}
                </button>
              ))}
            </div>

            <div className="p-4 border-t border-gray-200">
              {!showCreateForm ? (
                <Button
                  onClick={() => setShowCreateForm(true)}
                  variant="outline"
                  size="sm"
                  icon={Plus}
                  className="w-full"
                >
                  Create New Organization
                </Button>
              ) : (
                <form onSubmit={handleSubmit(onCreateSubmit)} className="space-y-3">
                  <Input
                    {...register('name', { 
                      required: 'Organization name is required',
                      minLength: { value: 2, message: 'Name must be at least 2 characters' }
                    })}
                    placeholder="Enter organization name"
                    error={errors.name?.message}
                    autoFocus
                  />
                  <div className="flex space-x-2">
                    <Button
                      type="submit"
                      size="sm"
                      loading={creating}
                      className="flex-1"
                    >
                      Create
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
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
            </div>
          </Card>
        </>
      )}
    </div>
  );
};