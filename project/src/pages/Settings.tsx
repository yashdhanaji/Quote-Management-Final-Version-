import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { Save, Upload, X, Eye, Settings as SettingsIcon } from 'lucide-react';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { useAuthStore } from '../stores/authStore';
import { supabase } from '../lib/supabase';

interface SettingsFormData {
  default_tax_rate: number;
  default_terms_conditions: string;
  default_payment_terms: string;
  default_quote_expiry_days: number;
  company_logo_url?: string;
}

interface OrganizationSettings {
  default_tax_rate: number;
  default_terms_conditions: string;
  default_payment_terms: string;
  default_quote_expiry_days: number;
  company_logo_url?: string;
}

export const Settings: React.FC = () => {
  const { user, organization, permissions } = useAuthStore();
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [showPreview, setShowPreview] = useState(false);

  const { register, handleSubmit, formState: { errors }, reset, watch } = useForm<SettingsFormData>({
    defaultValues: {
      default_tax_rate: 0,
      default_terms_conditions: '',
      default_payment_terms: 'Net 30 Days',
      default_quote_expiry_days: 30,
    }
  });

  // Check if user is admin
  if (user?.role !== 'admin') {
    return (
      <div className="text-center py-12">
        <SettingsIcon className="w-12 h-12 text-gray-400 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-gray-900 mb-2">Access Restricted</h3>
        <p className="text-gray-500">Only administrators can access the settings page.</p>
      </div>
    );
  }

  useEffect(() => {
    if (organization?.id) {
      fetchSettings();
    }
  }, [organization?.id]);

  const fetchSettings = async () => {
    if (!supabase || !organization?.id) return;

    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('organizations')
        .select('settings')
        .eq('id', organization.id)
        .single();

      if (error) throw error;

      const settings = data?.settings as OrganizationSettings || {};
      
      reset({
        default_tax_rate: settings.default_tax_rate || 0,
        default_terms_conditions: settings.default_terms_conditions || '',
        default_payment_terms: settings.default_payment_terms || 'Net 30 Days',
        default_quote_expiry_days: settings.default_quote_expiry_days || 30,
        company_logo_url: settings.company_logo_url || '',
      });

      if (settings.company_logo_url) {
        setLogoPreview(settings.company_logo_url);
      }
    } catch (error) {
      console.error('Error fetching settings:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleLogoChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      // Validate file type
      if (!file.type.startsWith('image/')) {
        alert('Please select an image file (PNG, JPG, etc.)');
        return;
      }

      // Validate file size (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        alert('File size must be less than 5MB');
        return;
      }

      setLogoFile(file);
      
      // Create preview
      const reader = new FileReader();
      reader.onload = (e) => {
        setLogoPreview(e.target?.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const uploadLogo = async (): Promise<string | null> => {
    if (!logoFile || !supabase) return null;

    try {
      const fileExt = logoFile.name.split('.').pop();
      const fileName = `${organization?.id}/logo.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from('organization-assets')
        .upload(fileName, logoFile, {
          upsert: true
        });

      if (uploadError) throw uploadError;

      const { data } = supabase.storage
        .from('organization-assets')
        .getPublicUrl(fileName);

      return data.publicUrl;
    } catch (error) {
      console.error('Error uploading logo:', error);
      throw error;
    }
  };

  const onSubmit = async (data: SettingsFormData) => {
    if (!supabase || !organization?.id) return;

    try {
      setSaving(true);

      let logoUrl = data.company_logo_url;

      // Upload new logo if selected
      if (logoFile) {
        logoUrl = await uploadLogo();
      }

      const settings: OrganizationSettings = {
        default_tax_rate: Number(data.default_tax_rate),
        default_terms_conditions: data.default_terms_conditions,
        default_payment_terms: data.default_payment_terms,
        default_quote_expiry_days: Number(data.default_quote_expiry_days),
        company_logo_url: logoUrl || undefined,
      };

      const { error } = await supabase
        .from('organizations')
        .update({ settings })
        .eq('id', organization.id);

      if (error) throw error;

      alert('Settings saved successfully!');
      setLogoFile(null);
    } catch (error) {
      console.error('Error saving settings:', error);
      alert('Failed to save settings. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const removeLogo = () => {
    setLogoFile(null);
    setLogoPreview(null);
  };

  const watchedValues = watch();

  const generatePreviewQuote = () => {
    const today = new Date();
    const expiryDate = new Date(today);
    expiryDate.setDate(today.getDate() + watchedValues.default_quote_expiry_days);

    return {
      quote_number: 'Q-2024-001',
      client_name: 'Sample Client Inc.',
      created_date: today.toLocaleDateString(),
      expiry_date: expiryDate.toLocaleDateString(),
      payment_terms: watchedValues.default_payment_terms,
      terms_conditions: watchedValues.default_terms_conditions,
      tax_rate: watchedValues.default_tax_rate,
    };
  };

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
          <h1 className="text-2xl font-bold text-gray-900">Organization Settings</h1>
          <p className="text-gray-600">Configure default settings for quotes and branding</p>
        </div>
        <Button
          onClick={() => setShowPreview(!showPreview)}
          variant="outline"
          icon={Eye}
        >
          {showPreview ? 'Hide' : 'Show'} Preview
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Settings Form */}
        <div className="lg:col-span-2">
          <Card>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
              {/* Company Branding */}
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Company Branding</h3>
                
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Company Logo
                    </label>
                    <div className="flex items-center space-x-4">
                      {logoPreview && (
                        <div className="relative">
                          <img
                            src={logoPreview}
                            alt="Logo preview"
                            className="w-20 h-20 object-contain border border-gray-200 rounded-lg"
                          />
                          <button
                            type="button"
                            onClick={removeLogo}
                            className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 hover:bg-red-600"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </div>
                      )}
                      <div>
                        <input
                          type="file"
                          accept="image/*"
                          onChange={handleLogoChange}
                          className="hidden"
                          id="logo-upload"
                        />
                        <label
                          htmlFor="logo-upload"
                          className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 cursor-pointer"
                        >
                          <Upload className="w-4 h-4 mr-2" />
                          {logoPreview ? 'Change Logo' : 'Upload Logo'}
                        </label>
                        <p className="text-xs text-gray-500 mt-1">
                          PNG, JPG up to 5MB. Recommended: 200x80px
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Default Quote Content */}
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Default Quote Settings</h3>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Input
                    {...register('default_tax_rate', { 
                      required: 'Tax rate is required',
                      min: { value: 0, message: 'Tax rate cannot be negative' },
                      max: { value: 100, message: 'Tax rate cannot exceed 100%' }
                    })}
                    type="number"
                    step="0.01"
                    label="Default Tax Rate (%)"
                    error={errors.default_tax_rate?.message}
                    placeholder="0.00"
                  />

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Default Payment Terms
                    </label>
                    <select
                      {...register('default_payment_terms', { required: 'Payment terms are required' })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                    >
                      <option value="Net 15">Net 15 Days</option>
                      <option value="Net 30">Net 30 Days</option>
                      <option value="Net 45">Net 45 Days</option>
                      <option value="Net 60">Net 60 Days</option>
                      <option value="Due on receipt">Due on Receipt</option>
                      <option value="Cash on delivery">Cash on Delivery</option>
                      <option value="Advance 50%">Advance 50%</option>
                      <option value="Advance 100%">Advance 100%</option>
                    </select>
                    {errors.default_payment_terms && (
                      <p className="text-sm text-red-600 mt-1">{errors.default_payment_terms.message}</p>
                    )}
                  </div>

                  <Input
                    {...register('default_quote_expiry_days', { 
                      required: 'Quote expiry period is required',
                      min: { value: 1, message: 'Must be at least 1 day' },
                      max: { value: 365, message: 'Cannot exceed 365 days' }
                    })}
                    type="number"
                    label="Default Quote Expiry (Days)"
                    error={errors.default_quote_expiry_days?.message}
                    placeholder="30"
                  />
                </div>

                <div className="mt-4">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Default Terms & Conditions
                  </label>
                  <textarea
                    {...register('default_terms_conditions')}
                    rows={6}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                    placeholder="Enter default terms and conditions that will appear on all quotes..."
                  />
                  <p className="text-sm text-gray-500 mt-1">
                    These terms will be automatically included in all new quotes
                  </p>
                </div>
              </div>

              <div className="flex justify-end">
                <Button
                  type="submit"
                  loading={saving}
                  icon={Save}
                >
                  Save Settings
                </Button>
              </div>
            </form>
          </Card>
        </div>

        {/* Preview Panel */}
        {showPreview && (
          <div className="lg:col-span-1">
            <Card>
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Quote Preview</h3>
              <div className="space-y-4 text-sm">
                {logoPreview && (
                  <div className="text-center">
                    <img
                      src={logoPreview}
                      alt="Company logo"
                      className="h-12 mx-auto object-contain"
                    />
                  </div>
                )}
                
                <div className="border-b pb-4">
                  <h4 className="font-semibold text-lg">QUOTE</h4>
                  <p className="text-gray-600">{generatePreviewQuote().quote_number}</p>
                </div>

                <div>
                  <p><strong>Client:</strong> {generatePreviewQuote().client_name}</p>
                  <p><strong>Date:</strong> {generatePreviewQuote().created_date}</p>
                  <p><strong>Valid Until:</strong> {generatePreviewQuote().expiry_date}</p>
                </div>

                <div className="border-t pt-4">
                  <p><strong>Payment Terms:</strong> {generatePreviewQuote().payment_terms}</p>
                  {generatePreviewQuote().tax_rate > 0 && (
                    <p><strong>Tax Rate:</strong> {generatePreviewQuote().tax_rate}%</p>
                  )}
                </div>

                {generatePreviewQuote().terms_conditions && (
                  <div className="border-t pt-4">
                    <p><strong>Terms & Conditions:</strong></p>
                    <p className="text-gray-600 text-xs mt-1 whitespace-pre-wrap">
                      {generatePreviewQuote().terms_conditions}
                    </p>
                  </div>
                )}

                <div className="text-center text-xs text-gray-500 border-t pt-4">
                  Generated by {organization?.name}
                </div>
              </div>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
};