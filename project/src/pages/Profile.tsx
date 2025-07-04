import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { Save, User, Mail, Building2, Shield, Calendar, Clock } from 'lucide-react';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Badge } from '../components/ui/Badge';
import { useAuthStore } from '../stores/authStore';
import { supabase } from '../lib/supabase';
import { getRoleDisplayName } from '../lib/supabase';

interface ProfileFormData {
  full_name: string;
  email: string;
}

interface PasswordFormData {
  current_password: string;
  new_password: string;
  confirm_password: string;
}

export const Profile: React.FC = () => {
  const { user, organization } = useAuthStore();
  const [saving, setSaving] = useState(false);
  const [changingPassword, setChangingPassword] = useState(false);
  const [showPasswordForm, setShowPasswordForm] = useState(false);

  const { register: registerProfile, handleSubmit: handleProfileSubmit, formState: { errors: profileErrors } } = useForm<ProfileFormData>({
    defaultValues: {
      full_name: user?.full_name || '',
      email: user?.email || '',
    }
  });

  const { register: registerPassword, handleSubmit: handlePasswordSubmit, formState: { errors: passwordErrors }, reset: resetPassword, watch } = useForm<PasswordFormData>();

  const newPassword = watch('new_password');

  const onProfileSubmit = async (data: ProfileFormData) => {
    if (!supabase || !user?.id) return;

    try {
      setSaving(true);

      // Update user profile
      const { error } = await supabase
        .from('users')
        .update({
          full_name: data.full_name,
          email: data.email,
        })
        .eq('id', user.id);

      if (error) throw error;

      // Update auth email if changed
      if (data.email !== user.email) {
        const { error: authError } = await supabase.auth.updateUser({
          email: data.email
        });

        if (authError) throw authError;
        alert('Profile updated! Please check your new email for verification.');
      } else {
        alert('Profile updated successfully!');
      }

    } catch (error) {
      console.error('Error updating profile:', error);
      alert('Failed to update profile. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const onPasswordSubmit = async (data: PasswordFormData) => {
    if (!supabase) return;

    try {
      setChangingPassword(true);

      const { error } = await supabase.auth.updateUser({
        password: data.new_password
      });

      if (error) throw error;

      alert('Password changed successfully!');
      setShowPasswordForm(false);
      resetPassword();
    } catch (error) {
      console.error('Error changing password:', error);
      alert('Failed to change password. Please try again.');
    } finally {
      setChangingPassword(false);
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

  if (!user) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-2 border-primary-600 border-t-transparent"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Profile</h1>
        <p className="text-gray-600">Manage your account settings and preferences</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Profile Information */}
        <div className="lg:col-span-2">
          <Card>
            <div className="flex items-center space-x-4 mb-6">
              <div className="w-16 h-16 bg-primary-600 rounded-full flex items-center justify-center">
                <span className="text-white text-xl font-bold">
                  {user.full_name?.charAt(0).toUpperCase()}
                </span>
              </div>
              <div>
                <h2 className="text-xl font-semibold text-gray-900">{user.full_name}</h2>
                <p className="text-gray-600">{user.email}</p>
                <Badge variant={getRoleBadgeVariant(user.role)}>
                  {getRoleDisplayName(user.role)}
                </Badge>
              </div>
            </div>

            <form onSubmit={handleProfileSubmit(onProfileSubmit)} className="space-y-4">
              <Input
                {...registerProfile('full_name', { 
                  required: 'Full name is required',
                  minLength: { value: 2, message: 'Name must be at least 2 characters' }
                })}
                label="Full Name"
                icon={User}
                error={profileErrors.full_name?.message}
                placeholder="Enter your full name"
              />

              <Input
                {...registerProfile('email', { 
                  required: 'Email is required',
                  pattern: {
                    value: /^\S+@\S+$/i,
                    message: 'Invalid email address'
                  }
                })}
                type="email"
                label="Email Address"
                icon={Mail}
                error={profileErrors.email?.message}
                placeholder="Enter your email"
              />

              <div className="flex justify-end">
                <Button
                  type="submit"
                  loading={saving}
                  icon={Save}
                >
                  Save Changes
                </Button>
              </div>
            </form>
          </Card>

          {/* Password Change */}
          <Card className="mt-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">Change Password</h3>
              {!showPasswordForm && (
                <Button
                  onClick={() => setShowPasswordForm(true)}
                  variant="outline"
                  size="sm"
                >
                  Change Password
                </Button>
              )}
            </div>

            {showPasswordForm ? (
              <form onSubmit={handlePasswordSubmit(onPasswordSubmit)} className="space-y-4">
                <Input
                  {...registerPassword('current_password', { required: 'Current password is required' })}
                  type="password"
                  label="Current Password"
                  error={passwordErrors.current_password?.message}
                  placeholder="Enter current password"
                />

                <Input
                  {...registerPassword('new_password', { 
                    required: 'New password is required',
                    minLength: { value: 6, message: 'Password must be at least 6 characters' }
                  })}
                  type="password"
                  label="New Password"
                  error={passwordErrors.new_password?.message}
                  placeholder="Enter new password"
                />

                <Input
                  {...registerPassword('confirm_password', { 
                    required: 'Please confirm your password',
                    validate: value => value === newPassword || 'Passwords do not match'
                  })}
                  type="password"
                  label="Confirm New Password"
                  error={passwordErrors.confirm_password?.message}
                  placeholder="Confirm new password"
                />

                <div className="flex justify-end space-x-3">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      setShowPasswordForm(false);
                      resetPassword();
                    }}
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    loading={changingPassword}
                  >
                    Change Password
                  </Button>
                </div>
              </form>
            ) : (
              <p className="text-gray-600">
                Keep your account secure by using a strong password and changing it regularly.
              </p>
            )}
          </Card>
        </div>

        {/* Account Information */}
        <div className="space-y-6">
          <Card>
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Account Information</h3>
            <div className="space-y-4">
              <div className="flex items-center space-x-3">
                <Building2 className="w-5 h-5 text-gray-400" />
                <div>
                  <p className="text-sm font-medium text-gray-900">Organization</p>
                  <p className="text-sm text-gray-600">{organization?.name}</p>
                </div>
              </div>

              <div className="flex items-center space-x-3">
                <Shield className="w-5 h-5 text-gray-400" />
                <div>
                  <p className="text-sm font-medium text-gray-900">Role</p>
                  <p className="text-sm text-gray-600">{getRoleDisplayName(user.role)}</p>
                </div>
              </div>

              <div className="flex items-center space-x-3">
                <Calendar className="w-5 h-5 text-gray-400" />
                <div>
                  <p className="text-sm font-medium text-gray-900">Member Since</p>
                  <p className="text-sm text-gray-600">
                    {new Date(user.created_at).toLocaleDateString()}
                  </p>
                </div>
              </div>

              {user.last_login && (
                <div className="flex items-center space-x-3">
                  <Clock className="w-5 h-5 text-gray-400" />
                  <div>
                    <p className="text-sm font-medium text-gray-900">Last Login</p>
                    <p className="text-sm text-gray-600">
                      {new Date(user.last_login).toLocaleString()}
                    </p>
                  </div>
                </div>
              )}
            </div>
          </Card>

          <Card>
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Account Status</h3>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Account Status</span>
                <Badge variant={user.is_active ? 'success' : 'danger'}>
                  {user.is_active ? 'Active' : 'Inactive'}
                </Badge>
              </div>
              
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Email Verified</span>
                <Badge variant="success">Verified</Badge>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
};