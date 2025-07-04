import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { Mail, Lock, Quote } from 'lucide-react';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Card } from '../ui/Card';
import { useAuthStore } from '../../stores/authStore';

interface LoginFormData {
  email: string;
  password: string;
}

export const LoginForm: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const { signIn } = useAuthStore();
  
  const { register, handleSubmit, formState: { errors } } = useForm<LoginFormData>();

  const onSubmit = async (data: LoginFormData) => {
    try {
      setLoading(true);
      setError('');
      await signIn(data.email, data.password);
    } catch (err: any) {
      setError(err.message || 'Invalid credentials');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-50 to-secondary-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="mx-auto w-12 h-12 bg-primary-600 rounded-xl flex items-center justify-center mb-4">
            <Quote className="w-6 h-6 text-white" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900">Welcome to QuoteSync</h2>
          <p className="text-gray-600 mt-2">Sign in to your account</p>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <p className="text-red-800 text-sm">{error}</p>
            </div>
          )}

          <Input
            {...register('email', { 
              required: 'Email is required',
              pattern: {
                value: /^\S+@\S+$/i,
                message: 'Invalid email address'
              }
            })}
            type="email"
            label="Email"
            icon={Mail}
            error={errors.email?.message}
            placeholder="Enter your email"
          />

          <Input
            {...register('password', { 
              required: 'Password is required',
              minLength: {
                value: 6,
                message: 'Password must be at least 6 characters'
              }
            })}
            type="password"
            label="Password"
            icon={Lock}
            error={errors.password?.message}
            placeholder="Enter your password"
          />

          <Button
            type="submit"
            loading={loading}
            className="w-full"
            size="lg"
          >
            Sign In
          </Button>
        </form>

        <div className="mt-6 text-center">
          <a
            href="/forgot-password"
            className="text-sm text-primary-600 hover:text-primary-500"
          >
            Forgot your password?
          </a>
        </div>

        <div className="mt-8 pt-6 border-t border-gray-200 text-center">
          <p className="text-sm text-gray-600">
            Don't have an account?{' '}
            <a
              href="/signup"
              className="text-primary-600 hover:text-primary-500 font-medium"
            >
              Sign up
            </a>
          </p>
        </div>
      </Card>
    </div>
  );
};