import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { Plus, Search, Edit2, Trash2, Users, Mail, Shield, MoreHorizontal } from 'lucide-react';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Badge } from '../components/ui/Badge';
import { useAuthStore } from '../stores/authStore';
import { supabase } from '../lib/supabase';
import { User } from '../types';
import { getRoleDisplayName } from '../lib/supabase';

interface UserFormData {
  email: string;
  full_name: string;
  role: 'admin' | 'manager' | 'agent';
}

export const Team: React.FC = () => {
  const { user, organization, permissions } = useAuthStore();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  const { register, handleSubmit, formState: { errors }, reset, setValue } = useForm<UserFormData>();

  // Check if user has permission to manage users
  if (!permissions?.can_manage_users) {
    return (
      <div className="text-center py-12">
        <Users className="w-12 h-12 text-gray-400 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-gray-900 mb-2">Access Restricted</h3>
        <p className="text-gray-500">You don't have permission to manage team members.</p>
      </div>
    );
  }

  useEffect(() => {
    fetchUsers();
  }, [organization?.id]);

  const fetchUsers = async () => {
    console.log('Fetching users for organization:', organization?.id);
    
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
        .from('users')
        .select('*')
        .eq('organization_id', organization.id)
        .order('created_at', { ascending: false });

      console.log('Supabase response:', { data, error });

      if (error) {
        console.error('Supabase error:', error);
        throw error;
      }
      
      setUsers(data || []);
      console.log('Users set:', data?.length || 0);
    } catch (error) {
      console.error('Error fetching users:', error);
    } finally {
      setLoading(false);
    }
  };

  const onSubmit = async (data: UserFormData) => {
    if (!organization?.id || !supabase) return;

    try {
      if (editingUser) {
        // Update existing user
        const { error } = await supabase
          .from('users')
          .update({
            full_name: data.full_name,
            email: data.email,
            role: data.role,
          })
          .eq('id', editingUser.id);

        if (error) throw error;
      } else {
        // For new users, we would typically send an invitation
        // This is a simplified version - in production, you'd want to:
        // 1. Send an invitation email
        // 2. Create a pending user record
        // 3. Let them complete signup with the invitation
        alert('User invitation feature would be implemented here. For now, users need to sign up directly.');
        return;
      }

      await fetchUsers();
      setShowForm(false);
      setEditingUser(null);
      reset();
    } catch (error) {
      console.error('Error saving user:', error);
      alert('Failed to save user. Please try again.');
    }
  };

  const handleEdit = (userToEdit: User) => {
    setEditingUser(userToEdit);
    setValue('email', userToEdit.email);
    setValue('full_name', userToEdit.full_name);
    setValue('role', userToEdit.role);
    setShowForm(true);
  };

  const handleDelete = async (userId: string) => {
    if (!supabase || !confirm('Are you sure you want to remove this user?')) return;

    // Prevent deleting self
    if (userId === user?.id) {
      alert('You cannot delete your own account.');
      return;
    }

    try {
      const { error } = await supabase
        .from('users')
        .update({ is_active: false })
        .eq('id', userId);

      if (error) throw error;
      await fetchUsers();
    } catch (error) {
      console.error('Error deactivating user:', error);
      alert('Failed to remove user. Please try again.');
    }
  };

  const toggleUserStatus = async (userId: string, currentStatus: boolean) => {
    if (!supabase) return;

    try {
      const { error } = await supabase
        .from('users')
        .update({ is_active: !currentStatus })
        .eq('id', userId);

      if (error) throw error;
      await fetchUsers();
    } catch (error) {
      console.error('Error updating user status:', error);
      alert('Failed to update user status. Please try again.');
    }
  };

  const getRoleBadgeVariant = (role: string) => {
    switch (role) {
      case 'admin':
        return 'danger' as const;
      case 'manager':
        return 'warning' as const;
      case 'agent':
        return 'info' as const;
      default:
        return 'default' as const;
    }
  };

  const filteredUsers = users.filter(u =>
    u.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    u.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
    u.role.toLowerCase().includes(searchTerm.toLowerCase())
  );

  console.log('Render state:', { loading, organization: !!organization, usersCount: users.length });

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
          <h1 className="text-2xl font-bold text-gray-900">Team Management</h1>
          <p className="text-gray-600">Manage your organization's team members</p>
        </div>
        <Button
          onClick={() => {
            setEditingUser(null);
            reset();
            setShowForm(true);
          }}
          icon={Plus}
        >
          Invite User
        </Button>
      </div>

      {/* Search */}
      <Card>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
          <input
            type="text"
            placeholder="Search team members..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10 pr-4 py-2 w-full border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
          />
        </div>
      </Card>

      {/* User Form Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <Card className="w-full max-w-md">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-semibold">
                {editingUser ? 'Edit Team Member' : 'Invite Team Member'}
              </h2>
              <button
                onClick={() => setShowForm(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                ×
              </button>
            </div>

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <Input
                {...register('full_name', { 
                  required: 'Full name is required',
                  minLength: { value: 2, message: 'Name must be at least 2 characters' }
                })}
                label="Full Name"
                error={errors.full_name?.message}
                placeholder="Enter full name"
              />

              <Input
                {...register('email', { 
                  required: 'Email is required',
                  pattern: {
                    value: /^\S+@\S+$/i,
                    message: 'Invalid email address'
                  }
                })}
                type="email"
                label="Email Address"
                error={errors.email?.message}
                placeholder="Enter email address"
                disabled={!!editingUser}
              />

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Role
                </label>
                <select
                  {...register('role', { required: 'Role is required' })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                >
                  <option value="">Select a role</option>
                  <option value="agent">Sales Agent</option>
                  <option value="manager">Manager</option>
                  <option value="admin">Administrator</option>
                </select>
                {errors.role && (
                  <p className="text-sm text-red-600 mt-1">{errors.role.message}</p>
                )}
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
                  {editingUser ? 'Update' : 'Send Invitation'}
                </Button>
              </div>
            </form>
          </Card>
        </div>
      )}

      {/* Users List */}
      <div className="grid grid-cols-1 gap-4">
        {filteredUsers.map((teamUser) => (
          <Card key={teamUser.id} className="hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <div className="w-12 h-12 bg-primary-600 rounded-full flex items-center justify-center">
                  <span className="text-white font-medium">
                    {teamUser.full_name?.charAt(0).toUpperCase()}
                  </span>
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900">{teamUser.full_name}</h3>
                  <p className="text-sm text-gray-500">{teamUser.email}</p>
                  <div className="flex items-center space-x-2 mt-1">
                    <Badge variant={getRoleBadgeVariant(teamUser.role)}>
                      {getRoleDisplayName(teamUser.role)}
                    </Badge>
                    <Badge variant={teamUser.is_active ? 'success' : 'default'}>
                      {teamUser.is_active ? 'Active' : 'Inactive'}
                    </Badge>
                    {teamUser.id === user?.id && (
                      <Badge variant="info">You</Badge>
                    )}
                  </div>
                </div>
              </div>

              <div className="flex items-center space-x-2">
                <div className="text-right text-sm text-gray-500">
                  <p>Joined {new Date(teamUser.created_at).toLocaleDateString()}</p>
                  {teamUser.last_login && (
                    <p>Last login {new Date(teamUser.last_login).toLocaleDateString()}</p>
                  )}
                </div>

                {teamUser.id !== user?.id && (
                  <div className="flex items-center space-x-1">
                    <button
                      onClick={() => handleEdit(teamUser)}
                      className="p-2 text-gray-400 hover:text-gray-600 rounded-lg"
                      title="Edit user"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    
                    <button
                      onClick={() => toggleUserStatus(teamUser.id, teamUser.is_active)}
                      className={`p-2 rounded-lg ${
                        teamUser.is_active 
                          ? 'text-amber-600 hover:bg-amber-50' 
                          : 'text-green-600 hover:bg-green-50'
                      }`}
                      title={teamUser.is_active ? 'Deactivate user' : 'Activate user'}
                    >
                      <Shield className="w-4 h-4" />
                    </button>

                    <button
                      onClick={() => handleDelete(teamUser.id)}
                      className="p-2 text-red-600 hover:bg-red-50 rounded-lg"
                      title="Remove user"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                )}
              </div>
            </div>
          </Card>
        ))}
      </div>

      {filteredUsers.length === 0 && (
        <Card className="text-center py-12">
          <Users className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No team members found</h3>
          <p className="text-gray-500 mb-4">
            {searchTerm 
              ? 'Try adjusting your search criteria.'
              : 'Start building your team by inviting members.'
            }
          </p>
          {!searchTerm && (
            <Button
              onClick={() => {
                setEditingUser(null);
                reset();
                setShowForm(true);
              }}
              icon={Plus}
            >
              Invite Your First Team Member
            </Button>
          )}
        </Card>
      )}
    </div>
  );
};