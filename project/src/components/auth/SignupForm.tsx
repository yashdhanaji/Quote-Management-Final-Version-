import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { Mail, Lock, User, Building2, Quote } from 'lucide-react';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Card } from '../ui/Card';
import { useAuthStore } from '../../stores/authStore';

interface SignupFormData {
  email: string;
  password: string;
  confirmPassword: string;
  fullName: string;
  organizationName: string;
}

export const SignupForm: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const { signUp } = useAuthStore();
  
  const { 
    register, 
    handleSubmit, 
    formState: { errors }, 
    watch,
    getValues 
  } = useForm<SignupFormData>({
    mode: 'onChange'
  });
  
  const password = watch('password');

  const onSubmit = async (data: SignupFormData) => {
    console.log('Form submitted with data:', { 
      ...data, 
      password: '[HIDDEN]', 
      confirmPassword: '[HIDDEN]' 
    });
    
    // Double check all fields are filled
    if (!data.fullName || !data.email || !data.organizationName || !data.password || !data.confirmPassword) {
      setError('Please fill in all required fields');
      return;
    }

    if (data.password !== data.confirmPassword) {
      setError('Passwords do not match');
      return;
    }
    
    try {
      setLoading(true);
      setError('');
      
      console.log('Calling signUp function...');
      await signUp(data.email, data.password, data.fullName, data.organizationName);
      
      console.log('Signup successful!');
      setSuccess(true);
    } catch (err: any) {
      console.error('Signup error:', err);
      setError(err.message || 'Failed to create account. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    console.log('Form submit triggered');
    
    // Get current form values
    const values = getValues();
    console.log('Current form values:', {
      fullName: values.fullName || '[EMPTY]',
      email: values.email || '[EMPTY]',
      organizationName: values.organizationName || '[EMPTY]',
      password: values.password ? '[HAS VALUE]' : '[EMPTY]',
      confirmPassword: values.confirmPassword ? '[HAS VALUE]' : '[EMPTY]'
    });
    
    handleSubmit(onSubmit)(e);
  };

  if (success) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-primary-50 to-secondary-50 flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <div className="text-center">
            <div className="mx-auto w-12 h-12 bg-green-600 rounded-xl flex items-center justify-center mb-4">
              <Quote className="w-6 h-6 text-white" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Account Created!</h2>
            <p className="text-gray-600 mb-6">
              Your account has been created successfully. You can now sign in.
            </p>
            <Button
              onClick={() => window.location.href = '/login'}
              className="w-full"
            >
              Go to Sign In
            </Button>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-50 to-secondary-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="mx-auto w-12 h-12 bg-primary-600 rounded-xl flex items-center justify-center mb-4">
            <Quote className="w-6 h-6 text-white" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900">Create Your Account</h2>
          <p className="text-gray-600 mt-2">Start managing quotes professionally</p>
        </div>

        <form onSubmit={handleFormSubmit} className="space-y-6">
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <p className="text-red-800 text-sm">{error}</p>
            </div>
          )}

          <Input
            {...register('fullName', { 
              required: 'Full name is required',
              minLength: {
                value: 2,
                message: 'Name must be at least 2 characters'
              }
            })}
            type="text"
            label="Full Name"
            icon={User}
            error={errors.fullName?.message}
            placeholder="Enter your full name"
            autoComplete="name"
          />

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
            autoComplete="email"
          />

          <Input
            {...register('organizationName', { 
              required: 'Organization name is required',
              minLength: {
                value: 2,
                message: 'Organization name must be at least 2 characters'
              }
            })}
            type="text"
            label="Organization Name"
            icon={Building2}
            error={errors.organizationName?.message}
            placeholder="Enter your company name"
            autoComplete="organization"
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
            placeholder="Create a password"
            autoComplete="new-password"
          />

          <Input
            {...register('confirmPassword', { 
              required: 'Please confirm your password',
              validate: value => value === password || 'Passwords do not match'
            })}
            type="password"
            label="Confirm Password"
            icon={Lock}
            error={errors.confirmPassword?.message}
            placeholder="Confirm your password"
            autoComplete="new-password"
          />

          <Button
            type="submit"
            loading={loading}
            className="w-full"
            size="lg"
          >
            Create Account
          </Button>
        </form>

        <div className="mt-8 pt-6 border-t border-gray-200 text-center">
          <p className="text-sm text-gray-600">
            Already have an account?{' '}
            <a
              href="/login"
              className="text-primary-600 hover:text-primary-500 font-medium"
            >
              Sign in
            </a>
          </p>
        </div>
      </Card>
    </div>
  );
};