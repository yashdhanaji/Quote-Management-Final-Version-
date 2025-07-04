import React from 'react';
import { Quote, Database, Settings } from 'lucide-react';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';

export const SetupPage: React.FC = () => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-50 to-secondary-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-2xl">
        <div className="text-center mb-8">
          <div className="mx-auto w-16 h-16 bg-primary-600 rounded-xl flex items-center justify-center mb-6">
            <Quote className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Welcome to QuoteSync</h1>
          <p className="text-gray-600 text-lg">Professional Quote Management System</p>
        </div>

        <div className="space-y-6">
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-6">
            <div className="flex items-start space-x-4">
              <Database className="w-6 h-6 text-amber-600 mt-1" />
              <div>
                <h3 className="text-lg font-semibold text-amber-900 mb-2">Database Setup Required</h3>
                <p className="text-amber-800 mb-4">
                  QuoteSync requires a Supabase database to store your quotes, clients, and products. 
                  Please connect to Supabase to get started.
                </p>
                <div className="bg-white rounded-lg p-4 border border-amber-200">
                  <h4 className="font-medium text-gray-900 mb-2">To set up Supabase:</h4>
                  <ol className="list-decimal list-inside space-y-1 text-sm text-gray-700">
                    <li>Click the "Connect to Supabase" button in the top right corner</li>
                    <li>Follow the setup instructions to create your database</li>
                    <li>Your application will automatically reload once connected</li>
                  </ol>
                </div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="text-center p-4">
              <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mx-auto mb-3">
                <Quote className="w-6 h-6 text-blue-600" />
              </div>
              <h3 className="font-semibold text-gray-900 mb-1">Quote Management</h3>
              <p className="text-sm text-gray-600">Create, approve, and send professional quotes</p>
            </div>
            <div className="text-center p-4">
              <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center mx-auto mb-3">
                <Database className="w-6 h-6 text-green-600" />
              </div>
              <h3 className="font-semibold text-gray-900 mb-1">Client & Product Data</h3>
              <p className="text-sm text-gray-600">Manage your clients and product catalog</p>
            </div>
            <div className="text-center p-4">
              <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center mx-auto mb-3">
                <Settings className="w-6 h-6 text-purple-600" />
              </div>
              <h3 className="font-semibold text-gray-900 mb-1">Team Collaboration</h3>
              <p className="text-sm text-gray-600">Role-based access for your team</p>
            </div>
          </div>

          <div className="text-center pt-4">
            <p className="text-sm text-gray-500">
              Once connected, you'll be able to create your organization and start managing quotes.
            </p>
          </div>
        </div>
      </Card>
    </div>
  );
};