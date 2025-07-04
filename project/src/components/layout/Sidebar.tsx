import React from 'react';
import { NavLink } from 'react-router-dom';
import { 
  LayoutDashboard, 
  FileText, 
  Package, 
  Users, 
  Quote,
  Building2,
  BarChart3,
  UserCircle,
  Settings
} from 'lucide-react';
import { useAuthStore } from '../../stores/authStore';

const navigation = [
  { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard, permission: 'can_view_dashboard' },
  { name: 'Quotes', href: '/quotes', icon: Quote, permission: 'can_create_quotes' },
  { name: 'Products', href: '/products', icon: Package, permission: 'can_manage_products' },
  { name: 'Clients', href: '/clients', icon: Users, permission: 'can_manage_clients' },
  { name: 'Analytics', href: '/analytics', icon: BarChart3, permission: 'can_view_audit_logs' },
  { name: 'Team', href: '/team', icon: Building2, permission: 'can_manage_users' },
];

export const Sidebar: React.FC = () => {
  const { permissions, organization, currentOrgMembership } = useAuthStore();

  const filteredNavigation = navigation.filter(item => {
    if (!item.permission) return true;
    return permissions?.[item.permission as keyof typeof permissions];
  });

  // Show settings only for admins
  const showSettings = currentOrgMembership?.role === 'admin';

  return (
    <div className="w-64 bg-white border-r border-gray-200 h-full flex flex-col">
      <div className="p-6 border-b border-gray-200">
        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 bg-primary-600 rounded-lg flex items-center justify-center">
            <Quote className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-gray-900">QuoteSync</h1>
            <p className="text-sm text-gray-500 truncate">{organization?.name}</p>
          </div>
        </div>
      </div>

      <nav className="flex-1 p-4 space-y-1">
        {filteredNavigation.map((item) => (
          <NavLink
            key={item.name}
            to={item.href}
            className={({ isActive }) =>
              `flex items-center px-3 py-2 text-sm font-medium rounded-lg transition-colors ${
                isActive
                  ? 'bg-primary-50 text-primary-700 border-r-2 border-primary-600'
                  : 'text-gray-700 hover:bg-gray-50 hover:text-gray-900'
              }`
            }
          >
            <item.icon className="mr-3 h-5 w-5" />
            {item.name}
          </NavLink>
        ))}

        {showSettings && (
          <NavLink
            to="/settings"
            className={({ isActive }) =>
              `flex items-center px-3 py-2 text-sm font-medium rounded-lg transition-colors ${
                isActive
                  ? 'bg-primary-50 text-primary-700 border-r-2 border-primary-600'
                  : 'text-gray-700 hover:bg-gray-50 hover:text-gray-900'
              }`
            }
          >
            <Settings className="mr-3 h-5 w-5" />
            Settings
          </NavLink>
        )}
      </nav>

      {/* Profile Link at Bottom */}
      <div className="p-4 border-t border-gray-200">
        <NavLink
          to="/profile"
          className={({ isActive }) =>
            `flex items-center px-3 py-2 text-sm font-medium rounded-lg transition-colors ${
              isActive
                ? 'bg-primary-50 text-primary-700'
                : 'text-gray-700 hover:bg-gray-50 hover:text-gray-900'
            }`
          }
        >
          <UserCircle className="mr-3 h-5 w-5" />
          Profile
        </NavLink>
      </div>
    </div>
  );
};