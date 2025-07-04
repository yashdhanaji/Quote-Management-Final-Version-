import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// Only create client if both URL and key are provided
export const supabase = supabaseUrl && supabaseAnonKey 
  ? createClient(supabaseUrl, supabaseAnonKey)
  : null;

export const isSupabaseConfigured = () => {
  return !!(supabaseUrl && supabaseAnonKey);
};

export const getPermissions = (role: string) => {
  const permissions = {
    admin: {
      can_create_quotes: true,
      can_approve_quotes: true,
      can_send_quotes: true,
      can_manage_products: true,
      can_manage_clients: true,
      can_view_dashboard: true,
      can_manage_users: true,
      can_view_audit_logs: true,
    },
    manager: {
      can_create_quotes: true,
      can_approve_quotes: true,
      can_send_quotes: true,
      can_manage_products: true,
      can_manage_clients: true,
      can_view_dashboard: true,
      can_manage_users: false,
      can_view_audit_logs: true,
    },
    agent: {
      can_create_quotes: true,
      can_approve_quotes: false,
      can_send_quotes: false,
      can_manage_products: false,
      can_manage_clients: false,
      can_view_dashboard: true,
      can_manage_users: false,
      can_view_audit_logs: false,
    },
  };

  return permissions[role as keyof typeof permissions] || permissions.agent;
};

// Helper function to get user role display name
export const getRoleDisplayName = (role: string) => {
  const roleNames = {
    admin: 'Administrator',
    manager: 'Manager',
    agent: 'Sales Agent',
  };
  
  return roleNames[role as keyof typeof roleNames] || 'User';
};

// Helper function to check if user can perform action on quote
export const canPerformQuoteAction = (
  action: 'create' | 'edit' | 'approve' | 'reject' | 'send' | 'delete',
  quote: any,
  userRole: string,
  userId: string
) => {
  const permissions = getPermissions(userRole);
  
  switch (action) {
    case 'create':
      return permissions.can_create_quotes;
    
    case 'edit':
      // Can edit if it's a draft and user created it, or user is manager/admin
      return quote.status === 'draft' && (quote.created_by === userId || userRole !== 'agent');
    
    case 'approve':
    case 'reject':
      return permissions.can_approve_quotes && quote.status === 'pending_approval';
    
    case 'send':
      return permissions.can_send_quotes && quote.status === 'approved';
    
    case 'delete':
      // Can delete if user created it or is admin
      return quote.created_by === userId || userRole === 'admin';
    
    default:
      return false;
  }
};