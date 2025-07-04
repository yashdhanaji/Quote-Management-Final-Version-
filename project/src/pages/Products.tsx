import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { Plus, Search, Edit2, Trash2, Package, DollarSign, Tag, MoreHorizontal } from 'lucide-react';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Badge } from '../components/ui/Badge';
import { useAuthStore } from '../stores/authStore';
import { supabase } from '../lib/supabase';
import { Product } from '../types';

interface ProductFormData {
  sku: string;
  name: string;
  description: string;
  price: number;
  tax_rate: number;
  category: string;
  is_active: boolean;
}

export const Products: React.FC = () => {
  const { user, organization } = useAuthStore();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');

  const { register, handleSubmit, formState: { errors }, reset, setValue } = useForm<ProductFormData>({
    defaultValues: {
      sku: '',
      name: '',
      description: '',
      price: 0,
      tax_rate: 0,
      category: '',
      is_active: true,
    }
  });

  const categories = ['Electronics', 'Software', 'Services', 'Hardware', 'Consulting', 'Other'];

  useEffect(() => {
    console.log('Products useEffect triggered, organization:', organization?.id);
    fetchProducts();
  }, [organization?.id]);

  const fetchProducts = async () => {
    console.log('Fetching products for organization:', organization?.id);
    
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
        .from('products')
        .select('*')
        .eq('organization_id', organization.id)
        .order('created_at', { ascending: false });

      console.log('Supabase response:', { data, error });

      if (error) {
        console.error('Supabase error:', error);
        throw error;
      }
      
      setProducts(data || []);
      console.log('Products set:', data?.length || 0);
    } catch (error) {
      console.error('Error fetching products:', error);
    } finally {
      setLoading(false);
    }
  };

  const onSubmit = async (data: ProductFormData) => {
    if (!organization?.id || !supabase) return;

    try {
      const productData = {
        ...data,
        organization_id: organization.id,
        price: Number(data.price),
        tax_rate: Number(data.tax_rate),
      };

      if (editingProduct) {
        const { error } = await supabase
          .from('products')
          .update(productData)
          .eq('id', editingProduct.id);

        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('products')
          .insert(productData);

        if (error) throw error;
      }

      await fetchProducts();
      setShowForm(false);
      setEditingProduct(null);
      reset();
    } catch (error) {
      console.error('Error saving product:', error);
    }
  };

  const handleEdit = (product: Product) => {
    setEditingProduct(product);
    setValue('sku', product.sku);
    setValue('name', product.name);
    setValue('description', product.description || '');
    setValue('price', product.price);
    setValue('tax_rate', product.tax_rate);
    setValue('category', product.category || '');
    setValue('is_active', product.is_active);
    setShowForm(true);
  };

  const handleDelete = async (productId: string) => {
    if (!supabase || !confirm('Are you sure you want to delete this product?')) return;

    try {
      const { error } = await supabase
        .from('products')
        .delete()
        .eq('id', productId);

      if (error) throw error;
      await fetchProducts();
    } catch (error) {
      console.error('Error deleting product:', error);
    }
  };

  const handleAddProduct = () => {
    console.log('Add Product clicked');
    setEditingProduct(null);
    reset({
      sku: '',
      name: '',
      description: '',
      price: 0,
      tax_rate: 0,
      category: '',
      is_active: true,
    });
    setShowForm(true);
    console.log('showForm set to:', true);
  };

  const handleCloseForm = () => {
    console.log('Closing form');
    setShowForm(false);
    setEditingProduct(null);
    reset();
  };

  const filteredProducts = products.filter(product => {
    const matchesSearch = product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         product.sku.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = selectedCategory === 'all' || product.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  console.log('Render state:', { loading, organization: !!organization, productsCount: products.length, showForm });

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
          <h1 className="text-2xl font-bold text-gray-900">Products</h1>
          <p className="text-gray-600">Manage your product catalog</p>
        </div>
        <Button
          onClick={handleAddProduct}
          icon={Plus}
        >
          Add Product
        </Button>
      </div>

      {/* Filters */}
      <Card>
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <input
                type="text"
                placeholder="Search products..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 pr-4 py-2 w-full border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
              />
            </div>
          </div>
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
          >
            <option value="all">All Categories</option>
            {categories.map(category => (
              <option key={category} value={category}>{category}</option>
            ))}
          </select>
        </div>
      </Card>

      {/* Product Form Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <Card className="w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-semibold">
                {editingProduct ? 'Edit Product' : 'Add New Product'}
              </h2>
              <button
                onClick={handleCloseForm}
                className="text-gray-400 hover:text-gray-600 text-2xl leading-none"
              >
                ×
              </button>
            </div>

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Input
                  {...register('sku', { required: 'SKU is required' })}
                  label="SKU"
                  error={errors.sku?.message}
                  placeholder="Enter product SKU"
                />
                <Input
                  {...register('name', { required: 'Product name is required' })}
                  label="Product Name"
                  error={errors.name?.message}
                  placeholder="Enter product name"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Description
                </label>
                <textarea
                  {...register('description')}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                  placeholder="Enter product description"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Input
                  {...register('price', { 
                    required: 'Price is required',
                    min: { value: 0, message: 'Price must be positive' }
                  })}
                  type="number"
                  step="0.01"
                  label="Price"
                  error={errors.price?.message}
                  placeholder="0.00"
                />
                <Input
                  {...register('tax_rate', { 
                    min: { value: 0, message: 'Tax rate must be positive' },
                    max: { value: 100, message: 'Tax rate cannot exceed 100%' }
                  })}
                  type="number"
                  step="0.01"
                  label="Tax Rate (%)"
                  error={errors.tax_rate?.message}
                  placeholder="0.00"
                />
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Category
                  </label>
                  <select
                    {...register('category')}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                  >
                    <option value="">Select category</option>
                    {categories.map(category => (
                      <option key={category} value={category}>{category}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="flex items-center">
                <input
                  {...register('is_active')}
                  type="checkbox"
                  id="is_active"
                  className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
                />
                <label htmlFor="is_active" className="ml-2 block text-sm text-gray-900">
                  Active product
                </label>
              </div>

              <div className="flex justify-end space-x-3 pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleCloseForm}
                >
                  Cancel
                </Button>
                <Button type="submit">
                  {editingProduct ? 'Update Product' : 'Add Product'}
                </Button>
              </div>
            </form>
          </Card>
        </div>
      )}

      {/* Products Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredProducts.map((product) => (
          <Card key={product.id} className="hover:shadow-md transition-shadow">
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-primary-100 rounded-lg flex items-center justify-center">
                  <Package className="w-5 h-5 text-primary-600" />
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900">{product.name}</h3>
                  <p className="text-sm text-gray-500">SKU: {product.sku}</p>
                </div>
              </div>
              <div className="flex items-center space-x-1">
                <button
                  onClick={() => handleEdit(product)}
                  className="p-1 text-gray-400 hover:text-gray-600 rounded"
                >
                  <Edit2 className="w-4 h-4" />
                </button>
                <button
                  onClick={() => handleDelete(product.id)}
                  className="p-1 text-gray-400 hover:text-red-600 rounded"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>

            {product.description && (
              <p className="text-sm text-gray-600 mb-4 line-clamp-2">
                {product.description}
              </p>
            )}

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-500">Price</span>
                <span className="font-semibold text-gray-900">
                  ${product.price.toFixed(2)}
                </span>
              </div>
              
              {product.tax_rate > 0 && (
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-500">Tax Rate</span>
                  <span className="text-sm text-gray-900">{product.tax_rate}%</span>
                </div>
              )}

              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-500">Category</span>
                {product.category ? (
                  <Badge variant="info">{product.category}</Badge>
                ) : (
                  <span className="text-sm text-gray-400">Uncategorized</span>
                )}
              </div>

              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-500">Status</span>
                <Badge variant={product.is_active ? 'success' : 'default'}>
                  {product.is_active ? 'Active' : 'Inactive'}
                </Badge>
              </div>
            </div>
          </Card>
        ))}
      </div>

      {filteredProducts.length === 0 && (
        <Card className="text-center py-12">
          <Package className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No products found</h3>
          <p className="text-gray-500 mb-4">
            {searchTerm || selectedCategory !== 'all' 
              ? 'Try adjusting your search or filter criteria.'
              : 'Get started by adding your first product.'
            }
          </p>
          {!searchTerm && selectedCategory === 'all' && (
            <Button
              onClick={handleAddProduct}
              icon={Plus}
            >
              Add Your First Product
            </Button>
          )}
        </Card>
      )}
    </div>
  );
};