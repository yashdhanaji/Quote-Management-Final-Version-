import React from 'react';
import { Card } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { 
  TrendingUp, 
  FileText, 
  CheckCircle, 
  Clock, 
  DollarSign,
  Users,
  Package,
  ArrowUpRight,
  ArrowDownRight,
  RefreshCw
} from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { useDashboardData } from '../hooks/useDashboardData';
import { Button } from '../components/ui/Button';

const COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#6B7280'];

const getStatusBadge = (status: string) => {
  const statusConfig = {
    approved: { variant: 'success' as const, label: 'Approved' },
    pending_approval: { variant: 'warning' as const, label: 'Pending' },
    sent: { variant: 'info' as const, label: 'Sent' },
    draft: { variant: 'default' as const, label: 'Draft' },
    rejected: { variant: 'danger' as const, label: 'Rejected' },
  };
  
  const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.draft;
  return <Badge variant={config.variant}>{config.label}</Badge>;
};

export const Dashboard: React.FC = () => {
  const {
    stats,
    monthlyTrend,
    statusBreakdown,
    topClients,
    recentQuotes,
    loading,
    error,
    refetch,
  } = useDashboardData();

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-2 border-primary-600 border-t-transparent"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-12">
        <p className="text-red-600 mb-4">Error loading dashboard data: {error}</p>
        <Button onClick={refetch} icon={RefreshCw}>
          Retry
        </Button>
      </div>
    );
  }

  if (!stats) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500">No data available</p>
      </div>
    );
  }

  const statsData = [
    { 
      label: 'Total Quotes', 
      value: stats.totalQuotes.toString(), 
      change: '+12%', 
      icon: FileText, 
      color: 'text-blue-600' 
    },
    { 
      label: 'Pipeline Value', 
      value: `$${stats.totalValue.toLocaleString()}`, 
      change: `${stats.valueChange >= 0 ? '+' : ''}${stats.valueChange.toFixed(1)}%`, 
      icon: DollarSign, 
      color: 'text-green-600' 
    },
    { 
      label: 'Approval Rate', 
      value: `${stats.approvalRate.toFixed(0)}%`, 
      change: '+3%', 
      icon: CheckCircle, 
      color: 'text-emerald-600' 
    },
    { 
      label: 'Avg. Response', 
      value: `${stats.avgResponseTime} days`, 
      change: '-0.2', 
      icon: Clock, 
      color: 'text-amber-600' 
    },
  ];

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
          <p className="text-gray-600">Overview of your quote management activity</p>
        </div>
        <div className="flex items-center space-x-4">
          <Button onClick={refetch} variant="outline" size="sm" icon={RefreshCw}>
            Refresh
          </Button>
          <div className="text-right">
            <p className="text-sm text-gray-500">Last updated</p>
            <p className="text-sm font-medium">{new Date().toLocaleString()}</p>
          </div>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {statsData.map((stat, index) => (
          <Card key={index} className="hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">{stat.label}</p>
                <p className="text-2xl font-bold text-gray-900 mt-1">{stat.value}</p>
                <div className="flex items-center mt-2">
                  {stat.change.startsWith('+') ? (
                    <ArrowUpRight className="w-4 h-4 text-green-600 mr-1" />
                  ) : stat.change.startsWith('-') ? (
                    <ArrowDownRight className="w-4 h-4 text-red-600 mr-1" />
                  ) : null}
                  <span className={`text-sm font-medium ${stat.change.startsWith('+') ? 'text-green-600' : stat.change.startsWith('-') ? 'text-red-600' : 'text-gray-600'}`}>
                    {stat.change}
                  </span>
                  <span className="text-xs text-gray-500 ml-1">vs last month</span>
                </div>
              </div>
              <div className={`p-3 rounded-lg bg-gray-50 ${stat.color}`}>
                <stat.icon className="w-6 h-6" />
              </div>
            </div>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Monthly Trend Chart */}
        <Card className="lg:col-span-2">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-semibold text-gray-900">Monthly Quote Value</h3>
            <TrendingUp className="w-5 h-5 text-green-600" />
          </div>
          {monthlyTrend.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={monthlyTrend}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis />
                <Tooltip formatter={(value) => [`$${Number(value).toLocaleString()}`, 'Value']} />
                <Bar dataKey="value" fill="#3B82F6" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-300 flex items-center justify-center text-gray-500">
              No data available for chart
            </div>
          )}
        </Card>

        {/* Quote Status Distribution */}
        <Card>
          <h3 className="text-lg font-semibold text-gray-900 mb-6">Quote Status</h3>
          {statusBreakdown.length > 0 ? (
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie
                  data={statusBreakdown}
                  cx="50%"
                  cy="50%"
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                >
                  {statusBreakdown.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-200 flex items-center justify-center text-gray-500">
              No quotes to display
            </div>
          )}
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top Clients */}
        <Card>
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-semibold text-gray-900">Top Clients</h3>
            <Users className="w-5 h-5 text-gray-400" />
          </div>
          <div className="space-y-4">
            {topClients.length > 0 ? (
              topClients.map((client, index) => (
                <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div>
                    <p className="font-medium text-gray-900">{client.name}</p>
                    <p className="text-sm text-gray-500">{client.quotes} quotes</p>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold text-gray-900">{client.value}</p>
                    <ArrowUpRight className="w-4 h-4 text-green-600 ml-auto" />
                  </div>
                </div>
              ))
            ) : (
              <p className="text-gray-500 text-center py-4">No clients yet</p>
            )}
          </div>
        </Card>

        {/* Recent Quotes */}
        <Card>
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-semibold text-gray-900">Recent Quotes</h3>
            <FileText className="w-5 h-5 text-gray-400" />
          </div>
          <div className="space-y-4">
            {recentQuotes.length > 0 ? (
              recentQuotes.map((quote, index) => (
                <div key={index} className="flex items-center justify-between p-3 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
                  <div>
                    <p className="font-medium text-gray-900">{quote.quote_number}</p>
                    <p className="text-sm text-gray-500">{quote.client_name}</p>
                  </div>
                  <div className="text-right space-y-1">
                    <p className="font-semibold text-gray-900">${quote.amount.toLocaleString()}</p>
                    {getStatusBadge(quote.status)}
                  </div>
                </div>
              ))
            ) : (
              <p className="text-gray-500 text-center py-4">No quotes yet</p>
            )}
          </div>
        </Card>
      </div>
    </div>
  );
};