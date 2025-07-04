export interface User {
  id: string;
  email: string;
  full_name: string;
  created_at: string;
  last_login?: string;
  is_active: boolean;
}

export interface Organization {
  id: string;
  name: string;
  created_at: string;
  settings?: {
    currency: string;
    tax_rate: number;
    terms_conditions: string;
    default_tax_rate: number;
    default_terms_conditions: string;
    default_payment_terms: string;
    default_quote_expiry_days: number;
    company_logo_url?: string;
  };
}

export interface OrganizationUser {
  id: string;
  user_id: string;
  organization_id: string;
  role: 'admin' | 'manager' | 'agent';
  status: 'active' | 'pending' | 'inactive';
  joined_at: string;
  created_at: string;
  organization?: Organization;
}

export interface UserOrganization {
  organization_id: string;
  organization_name: string;
  user_role: 'admin' | 'manager' | 'agent';
  user_status: 'active' | 'pending' | 'inactive';
  joined_at: string;
}

export interface Product {
  id: string;
  sku: string;
  name: string;
  description?: string;
  price: number;
  tax_rate: number;
  category?: string;
  is_active: boolean;
  organization_id: string;
  created_at: string;
  updated_at: string;
}

export interface Client {
  id: string;
  name: string;
  contact_person?: string;
  email?: string;
  phone?: string;
  gstin?: string;
  pan?: string;
  address?: string;
  payment_terms?: string;
  organization_id: string;
  created_at: string;
  updated_at: string;
}

export interface QuoteItem {
  id: string;
  product_id: string;
  product: Product;
  quantity: number;
  unit_price: number;
  discount_percent: number;
  tax_amount: number;
  total_amount: number;
}

export interface Quote {
  id: string;
  quote_number: string;
  client_id: string;
  client: Client;
  status: 'draft' | 'pending_approval' | 'approved' | 'rejected' | 'sent';
  items: QuoteItem[];
  subtotal: number;
  discount_amount: number;
  tax_amount: number;
  total_amount: number;
  valid_until: string;
  terms_conditions?: string;
  notes?: string;
  created_by: string;
  approved_by?: string;
  sent_at?: string;
  organization_id: string;
  created_at: string;
  updated_at: string;
  created_by_user?: User;
}

export interface DashboardStats {
  total_quotes: number;
  total_value: number;
  pending_approval: number;
  approved_quotes: number;
  sent_quotes: number;
  draft_quotes: number;
  monthly_trend: {
    month: string;
    value: number;
    count: number;
  }[];
  quote_status_breakdown: {
    status: string;
    count: number;
    value: number;
  }[];
  top_clients: {
    client_name: string;
    total_value: number;
    quote_count: number;
  }[];
}

export interface Permission {
  can_create_quotes: boolean;
  can_approve_quotes: boolean;
  can_send_quotes: boolean;
  can_manage_products: boolean;
  can_manage_clients: boolean;
  can_view_dashboard: boolean;
  can_manage_users: boolean;
  can_view_audit_logs: boolean;
}