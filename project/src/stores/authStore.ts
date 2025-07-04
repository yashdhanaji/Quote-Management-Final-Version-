import { create } from 'zustand';
import { User, Organization, Permission, UserOrganization, OrganizationUser } from '../types';
import { supabase, getPermissions, isSupabaseConfigured } from '../lib/supabase';

interface AuthState {
  user: User | null;
  organization: Organization | null;
  currentOrgMembership: OrganizationUser | null;
  userOrganizations: UserOrganization[];
  permissions: Permission | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string, fullName: string, organizationName?: string) => Promise<void>;
  signOut: () => Promise<void>;
  initialize: () => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  switchOrganization: (organizationId: string) => Promise<void>;
  createOrganization: (name: string) => Promise<void>;
  fetchUserOrganizations: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  organization: null,
  currentOrgMembership: null,
  userOrganizations: [],
  permissions: null,
  loading: true,

  signIn: async (email: string, password: string) => {
    console.log('SignIn called');
    if (!supabase) {
      throw new Error('Supabase is not configured');
    }

    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    console.log('SignIn response:', { user: data.user?.id, error });

    if (error) throw error;

    if (data.user) {
      // Update last login
      await supabase
        .from('users')
        .update({ last_login: new Date().toISOString() })
        .eq('id', data.user.id);

      // Fetch user data and organizations
      await get().fetchUserData(data.user.id);
    }
  },

  signUp: async (email: string, password: string, fullName: string, organizationName?: string) => {
    console.log('signUp called with:', { email, fullName, organizationName, hasPassword: !!password });
    
    if (!supabase) {
      throw new Error('Supabase is not configured');
    }

    if (!organizationName) {
      throw new Error('Organization name is required for user registration');
    }

    try {
      // Create the auth user
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email,
        password,
      });

      console.log('Supabase signUp response:', { data: authData, error: authError });

      if (authError) {
        console.error('Supabase signUp error:', authError);
        throw authError;
      }

      if (!authData.user) {
        throw new Error('Failed to create user account');
      }

      const userId = authData.user.id;
      console.log('Auth user created successfully:', userId);

      // Check if user profile already exists
      const { data: existingUser, error: checkError } = await supabase
        .from('users')
        .select('id')
        .eq('id', userId)
        .maybeSingle();

      let userData;
      
      if (!existingUser) {
        // User doesn't exist, create new profile
        const { data: newUserData, error: userError } = await supabase
          .from('users')
          .insert({
            id: userId,
            email: email,
            full_name: fullName,
            is_active: true
          })
          .select()
          .single();

        if (userError) {
          console.error('Error creating user profile:', userError);
          throw new Error('Failed to create user profile');
        }

        userData = newUserData;
        console.log('User profile created:', userData);
      } else {
        // User already exists, update their profile
        const { data: updatedUserData, error: updateError } = await supabase
          .from('users')
          .update({
            email: email,
            full_name: fullName,
            is_active: true
          })
          .eq('id', userId)
          .select()
          .single();

        if (updateError) {
          console.error('Error updating user profile:', updateError);
          throw new Error('Failed to update user profile');
        }

        userData = updatedUserData;
        console.log('User profile updated:', userData);
      }

      // Create organization
      const { data: orgData, error: orgError } = await supabase
        .from('organizations')
        .insert({
          name: organizationName,
          settings: {
            default_tax_rate: 0,
            default_payment_terms: 'Net 30 Days',
            default_terms_conditions: '',
            default_quote_expiry_days: 30
          }
        })
        .select()
        .single();

      if (orgError) {
        console.error('Error creating organization:', orgError);
        throw new Error('Failed to create organization');
      }

      console.log('Organization created:', orgData);

      // Update user with organization_id
      const { error: updateUserError } = await supabase
        .from('users')
        .update({ organization_id: orgData.id })
        .eq('id', userId);

      if (updateUserError) {
        console.error('Error updating user with organization_id:', updateUserError);
        throw new Error('Failed to link user to organization');
      }

      // Check if organization membership already exists
      const { data: existingMembership, error: membershipCheckError } = await supabase
        .from('organization_users')
        .select('id')
        .eq('user_id', userId)
        .eq('organization_id', orgData.id)
        .maybeSingle();

      if (!existingMembership) {
        // Membership doesn't exist, create it
        const { data: membershipData, error: membershipError } = await supabase
          .from('organization_users')
          .insert({
            user_id: userId,
            organization_id: orgData.id,
            role: 'admin',
            status: 'active'
          })
          .select()
          .single();

        if (membershipError) {
          console.error('Error creating organization membership:', membershipError);
          throw new Error('Failed to create organization membership');
        }

        console.log('Organization membership created:', membershipData);
      } else {
        // Membership already exists, update it
        const { data: membershipData, error: membershipUpdateError } = await supabase
          .from('organization_users')
          .update({
            role: 'admin',
            status: 'active'
          })
          .eq('user_id', userId)
          .eq('organization_id', orgData.id)
          .select()
          .single();

        if (membershipUpdateError) {
          console.error('Error updating organization membership:', membershipUpdateError);
          throw new Error('Failed to update organization membership');
        }

        console.log('Organization membership updated:', membershipData);
      }

      console.log('User registration completed successfully');

    } catch (err) {
      console.error('Error in signUp function:', err);
      throw err;
    }
  },

  signOut: async () => {
    console.log('SignOut called');
    
    try {
      // First, attempt to sign out from Supabase
      if (supabase) {
        const { error } = await supabase.auth.signOut();
        if (error) {
          console.error('Supabase signOut error:', error);
          // Don't throw here - we still want to clear local state even if Supabase signout fails
        } else {
          console.log('Successfully signed out from Supabase');
        }
      }
    } catch (error) {
      console.error('Error during Supabase signOut:', error);
      // Continue with local cleanup even if Supabase signout fails
    }

    // Clear local state
    console.log('Clearing local auth state');
    localStorage.removeItem('currentOrganizationId');
    
    set({
      user: null,
      organization: null,
      currentOrgMembership: null,
      userOrganizations: [],
      permissions: null,
    });

    console.log('SignOut completed');
  },

  fetchUserData: async (userId: string) => {
    if (!supabase) return;

    try {
      // Fetch user data using maybeSingle to handle cases where user profile doesn't exist
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('*')
        .eq('id', userId)
        .maybeSingle();

      if (userError) throw userError;

      // If no user profile found, sign out to clear inconsistent session
      if (!userData) {
        console.warn('No user profile found for authenticated user, signing out');
        await get().signOut();
        return;
      }

      // Fetch user's organizations
      const { data: orgsData, error: orgsError } = await supabase
        .rpc('get_user_organizations', { user_uuid: userId });

      if (orgsError) throw orgsError;

      console.log('User organizations:', orgsData);

      set({ 
        user: userData,
        userOrganizations: orgsData || []
      });

      // If user has organizations, set the first one as current
      // Or restore from localStorage if available
      const savedOrgId = localStorage.getItem('currentOrganizationId');
      const targetOrgId = savedOrgId && orgsData?.find(org => org.organization_id === savedOrgId)
        ? savedOrgId
        : orgsData?.[0]?.organization_id;

      if (targetOrgId) {
        await get().switchOrganization(targetOrgId);
      }

    } catch (error) {
      console.error('Error fetching user data:', error);
    }
  },

  switchOrganization: async (organizationId: string) => {
    if (!supabase) return;

    try {
      // Fetch organization data
      const { data: orgData, error: orgError } = await supabase
        .from('organizations')
        .select('*')
        .eq('id', organizationId)
        .single();

      if (orgError) throw orgError;

      // Fetch user's membership in this organization
      const { data: membershipData, error: membershipError } = await supabase
        .from('organization_users')
        .select('*')
        .eq('user_id', get().user?.id)
        .eq('organization_id', organizationId)
        .eq('status', 'active')
        .single();

      if (membershipError) throw membershipError;

      // Save to localStorage
      localStorage.setItem('currentOrganizationId', organizationId);

      set({
        organization: orgData,
        currentOrgMembership: membershipData,
        permissions: getPermissions(membershipData.role),
      });

      console.log('Switched to organization:', {
        org: orgData.name,
        role: membershipData.role,
        permissions: getPermissions(membershipData.role)
      });

    } catch (error) {
      console.error('Error switching organization:', error);
      throw error;
    }
  },

  createOrganization: async (name: string) => {
    if (!supabase || !get().user?.id) return;

    try {
      // Create organization
      const { data: orgData, error: orgError } = await supabase
        .from('organizations')
        .insert({
          name,
          settings: {
            default_tax_rate: 0,
            default_terms_conditions: '',
            default_payment_terms: 'Net 30 Days',
            default_quote_expiry_days: 30
          }
        })
        .select()
        .single();

      if (orgError) throw orgError;

      // Add user as admin to the new organization
      const { error: membershipError } = await supabase
        .from('organization_users')
        .insert({
          user_id: get().user!.id,
          organization_id: orgData.id,
          role: 'admin',
          status: 'active'
        });

      if (membershipError) throw membershipError;

      // Refresh user organizations
      await get().fetchUserOrganizations();

      // Switch to the new organization
      await get().switchOrganization(orgData.id);

      return orgData;
    } catch (error) {
      console.error('Error creating organization:', error);
      throw error;
    }
  },

  fetchUserOrganizations: async () => {
    if (!supabase || !get().user?.id) return;

    try {
      const { data: orgsData, error } = await supabase
        .rpc('get_user_organizations', { user_uuid: get().user!.id });

      if (error) throw error;

      set({ userOrganizations: orgsData || [] });
    } catch (error) {
      console.error('Error fetching user organizations:', error);
    }
  },

  initialize: async () => {
    console.log('Auth initialize called');
    try {
      if (!isSupabaseConfigured()) {
        console.log('Supabase not configured, setting loading to false');
        set({ loading: false });
        return;
      }

      if (!supabase) {
        console.log('No supabase client, setting loading to false');
        set({ loading: false });
        return;
      }

      console.log('Getting session...');
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      console.log('Session result:', { session: !!session, user: session?.user?.id, error: sessionError });
      
      if (session?.user) {
        console.log('Session found, fetching user data...');
        await get().fetchUserData(session.user.id);
      } else {
        console.log('No session found');
      }

      // Listen for auth changes
      supabase.auth.onAuthStateChange(async (event, session) => {
        console.log('Auth state changed:', event, session?.user?.id);
        
        if (event === 'SIGNED_IN' && session?.user) {
          await get().fetchUserData(session.user.id);
        } else if (event === 'SIGNED_OUT') {
          console.log('User signed out via auth state change');
          localStorage.removeItem('currentOrganizationId');
          set({
            user: null,
            organization: null,
            currentOrgMembership: null,
            userOrganizations: [],
            permissions: null,
          });
        }
      });
    } catch (error) {
      console.error('Auth initialization error:', error);
    } finally {
      console.log('Auth initialization complete, setting loading to false');
      set({ loading: false });
    }
  },

  resetPassword: async (email: string) => {
    if (!supabase) {
      throw new Error('Supabase is not configured');
    }

    const { error } = await supabase.auth.resetPasswordForEmail(email);
    if (error) throw error;
  },
}));