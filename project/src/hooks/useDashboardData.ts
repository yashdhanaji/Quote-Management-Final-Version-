import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useAuthStore } from '../stores/authStore';

export interface DashboardStats {
  totalQuotes: number;
  totalValue: number;
  pendingApproval: number;
  approvedQuotes: number;
  sentQuotes: number;
  draftQuotes: number;
  approvalRate: number;
  avgResponseTime: number;
  valueChange: number;
}

export interface MonthlyTrend {
  month: string;
  value: number;
  count: number;
}

export interface StatusBreakdown {
  name: string;
  value: number;
  color: string;
}

export interface TopClient {
  name: string;
  value: string;
  quotes: number;
}

export interface RecentQuote {
  id: string;
  quote_number: string;
  client_name: string;
  amount: number;
  status: string;
  date: string;
}

export const useDashboardData = () => {
  const { organization } = useAuthStore();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [monthlyTrend, setMonthlyTrend] = useState<MonthlyTrend[]>([]);
  const [statusBreakdown, setStatusBreakdown] = useState<StatusBreakdown[]>([]);
  const [topClients, setTopClients] = useState<TopClient[]>([]);
  const [recentQuotes, setRecentQuotes] = useState<RecentQuote[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (organization?.id) {
      fetchDashboardData();
    }
  }, [organization?.id]);

  const fetchDashboardData = async () => {
    if (!supabase || !organization?.id) return;

    try {
      setLoading(true);
      setError(null);

      // Fetch all quotes for the organization
      const { data: quotes, error: quotesError } = await supabase
        .from('quotes')
        .select(`
          *,
          client:clients(name)
        `)
        .eq('organization_id', organization.id);

      if (quotesError) throw quotesError;

      // Calculate stats
      const totalQuotes = quotes?.length || 0;
      const totalValue = quotes?.reduce((sum, q) => sum + Number(q.total_amount), 0) || 0;
      const pendingApproval = quotes?.filter(q => q.status === 'pending_approval').length || 0;
      const approvedQuotes = quotes?.filter(q => q.status === 'approved').length || 0;
      const sentQuotes = quotes?.filter(q => q.status === 'sent').length || 0;
      const draftQuotes = quotes?.filter(q => q.status === 'draft').length || 0;
      const approvalRate = totalQuotes > 0 ? (approvedQuotes / totalQuotes) * 100 : 0;

      // Calculate monthly trends (last 6 months)
      const monthlyData: { [key: string]: { value: number; count: number } } = {};
      const now = new Date();
      
      for (let i = 5; i >= 0; i--) {
        const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
        const monthKey = date.toLocaleDateString('en-US', { month: 'short' });
        monthlyData[monthKey] = { value: 0, count: 0 };
      }

      quotes?.forEach(quote => {
        const quoteDate = new Date(quote.created_at);
        const monthKey = quoteDate.toLocaleDateString('en-US', { month: 'short' });
        if (monthlyData[monthKey]) {
          monthlyData[monthKey].value += Number(quote.total_amount);
          monthlyData[monthKey].count += 1;
        }
      });

      const monthlyTrendData = Object.entries(monthlyData).map(([month, data]) => ({
        month,
        value: data.value,
        count: data.count,
      }));

      // Calculate status breakdown
      const statusData = [
        { name: 'Approved', value: approvedQuotes, color: '#10B981' },
        { name: 'Pending', value: pendingApproval, color: '#F59E0B' },
        { name: 'Draft', value: draftQuotes, color: '#6B7280' },
        { name: 'Sent', value: sentQuotes, color: '#3B82F6' },
        { name: 'Rejected', value: quotes?.filter(q => q.status === 'rejected').length || 0, color: '#EF4444' },
      ].filter(item => item.value > 0);

      // Calculate top clients
      const clientData: { [key: string]: { value: number; count: number; name: string } } = {};
      quotes?.forEach(quote => {
        const clientName = quote.client?.name || 'Unknown Client';
        if (!clientData[clientName]) {
          clientData[clientName] = { value: 0, count: 0, name: clientName };
        }
        clientData[clientName].value += Number(quote.total_amount);
        clientData[clientName].count += 1;
      });

      const topClientsData = Object.values(clientData)
        .sort((a, b) => b.value - a.value)
        .slice(0, 4)
        .map(client => ({
          name: client.name,
          value: `$${client.value.toLocaleString()}`,
          quotes: client.count,
        }));

      // Get recent quotes
      const recentQuotesData = quotes
        ?.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
        .slice(0, 4)
        .map(quote => ({
          id: quote.id,
          quote_number: quote.quote_number,
          client_name: quote.client?.name || 'Unknown Client',
          amount: Number(quote.total_amount),
          status: quote.status,
          date: quote.created_at,
        })) || [];

      // Calculate value change (current month vs last month)
      const currentMonth = new Date().getMonth();
      const currentYear = new Date().getFullYear();
      const lastMonth = currentMonth === 0 ? 11 : currentMonth - 1;
      const lastMonthYear = currentMonth === 0 ? currentYear - 1 : currentYear;

      const currentMonthValue = quotes?.filter(q => {
        const date = new Date(q.created_at);
        return date.getMonth() === currentMonth && date.getFullYear() === currentYear;
      }).reduce((sum, q) => sum + Number(q.total_amount), 0) || 0;

      const lastMonthValue = quotes?.filter(q => {
        const date = new Date(q.created_at);
        return date.getMonth() === lastMonth && date.getFullYear() === lastMonthYear;
      }).reduce((sum, q) => sum + Number(q.total_amount), 0) || 0;

      const valueChange = lastMonthValue > 0 ? ((currentMonthValue - lastMonthValue) / lastMonthValue) * 100 : 0;

      setStats({
        totalQuotes,
        totalValue,
        pendingApproval,
        approvedQuotes,
        sentQuotes,
        draftQuotes,
        approvalRate,
        avgResponseTime: 2.4, // This would need more complex calculation based on actual data
        valueChange,
      });

      setMonthlyTrend(monthlyTrendData);
      setStatusBreakdown(statusData);
      setTopClients(topClientsData);
      setRecentQuotes(recentQuotesData);

    } catch (err: any) {
      console.error('Error fetching dashboard data:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return {
    stats,
    monthlyTrend,
    statusBreakdown,
    topClients,
    recentQuotes,
    loading,
    error,
    refetch: fetchDashboardData,
  };
};