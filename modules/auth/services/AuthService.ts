import { createClient } from '@supabase/supabase-js';
import type { AuthUser, AuthResult, RolePermissions } from './types';
import type { User } from '../types';

export class AuthService {
  private supabase;

  constructor() {
    this.supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );
  }

  /**
   * Create anonymous user session
   */
  async createAnonymousSession(): Promise<AuthResult> {
    try {
      // Create anonymous user in Supabase
      const { data: authData, error: authError } = await this.supabase.auth.signUp({
        email: `anon_${Date.now()}@solace.local`,
        password: Math.random().toString(36)
      });

      if (authError) throw authError;

      // Create user profile
      const { data: userData, error: userError } = await this.supabase
        .from('users')
        .insert({
          id: authData.user!.id,
          role: 'user',
          is_active: true,
          last_active: new Date().toISOString()
        })
        .select()
        .single();

      if (userError) throw userError;

      return {
        success: true,
        user: {
          id: userData.id,
          role: userData.role,
          is_active: userData.is_active,
          created_at: userData.created_at,
          last_active: userData.last_active
        }
      };
    } catch (error) {
      console.error('Auth creation error:', error);
      return {
        success: false,
        error: 'Failed to create anonymous session'
      };
    }
  }

  /**
   * Create counselor session (for verified counselors)
   */
  async createCounselorSession(email: string, password: string): Promise<AuthResult> {
    try {
      const { data: authData, error: authError } = await this.supabase.auth.signInWithPassword({
        email,
        password
      });

      if (authError) throw authError;

      // Verify counselor status
      const { data: profile, error: profileError } = await this.supabase
        .from('counselor_profiles')
        .select('verification_status')
        .eq('user_id', authData.user!.id)
        .single();

      if (profileError || profile?.verification_status !== 'verified') {
        await this.supabase.auth.signOut();
        throw new Error('Counselor not verified');
      }

      return {
        success: true,
        user: {
          id: authData.user!.id,
          role: 'counselor',
          is_active: true,
          created_at: authData.user!.created_at,
          last_active: new Date().toISOString()
        }
      };
    } catch (error) {
      console.error('Counselor auth error:', error);
      return {
        success: false,
        error: 'Invalid counselor credentials'
      };
    }
  }

  /**
   * Create admin session
   */
  async createAdminSession(email: string, password: string): Promise<AuthResult> {
    try {
      const { data: authData, error: authError } = await this.supabase.auth.signInWithPassword({
        email,
        password
      });

      if (authError) throw authError;

      // Verify admin status
      const { data: user, error: userError } = await this.supabase
        .from('users')
        .select('role')
        .eq('id', authData.user!.id)
        .single();

      if (userError || user?.role !== 'admin') {
        await this.supabase.auth.signOut();
        throw new Error('Not an admin user');
      }

      return {
        success: true,
        user: {
          id: authData.user!.id,
          role: 'admin',
          is_active: true,
          created_at: authData.user!.created_at,
          last_active: new Date().toISOString()
        }
      };
    } catch (error) {
      console.error('Admin auth error:', error);
      return {
        success: false,
        error: 'Invalid admin credentials'
      };
    }
  }

  /**
   * Get current user session
   */
  async getCurrentUser(): Promise<AuthUser | null> {
    try {
      const { data: { user }, error } = await this.supabase.auth.getUser();
      if (error || !user) return null;

      const { data: userData, error: userError } = await this.supabase
        .from('users')
        .select('*')
        .eq('id', user.id)
        .single();

      if (userError || !userData) return null;

      return {
        id: userData.id,
        role: userData.role,
        is_active: userData.is_active,
        created_at: userData.created_at,
        last_active: userData.last_active
      };
    } catch (error) {
      console.error('Get current user error:', error);
      return null;
    }
  }

  /**
   * Sign out user
   */
  async signOut(): Promise<void> {
    await this.supabase.auth.signOut();
  }

  /**
   * Update user last active timestamp
   */
  async updateLastActive(userId: string): Promise<void> {
    try {
      await this.supabase
        .from('users')
        .update({ last_active: new Date().toISOString() })
        .eq('id', userId);
    } catch (error) {
      console.error('Update last active error:', error);
    }
  }

  /**
   * Get role permissions
   */
  getRolePermissions(role: string): RolePermissions {
    switch (role) {
      case 'admin':
        return {
          can_chat: true,
          can_counsel: true,
          can_moderate: true,
          can_admin: true,
          can_create_rooms: true,
          can_export_data: true
        };
      case 'counselor':
        return {
          can_chat: true,
          can_counsel: true,
          can_moderate: false,
          can_admin: false,
          can_create_rooms: true,
          can_export_data: false
        };
      case 'user':
      default:
        return {
          can_chat: true,
          can_counsel: false,
          can_moderate: false,
          can_admin: false,
          can_create_rooms: false,
          can_export_data: false
        };
    }
  }

  /**
   * Validate user permissions
   */
  async validatePermissions(userId: string, requiredPermissions: Partial<RolePermissions>): Promise<boolean> {
    try {
      const user = await this.getCurrentUser();
      if (!user || user.id !== userId) return false;

      const permissions = this.getRolePermissions(user.role);

      return Object.entries(requiredPermissions).every(
        ([key, required]) => permissions[key as keyof RolePermissions] === required
      );
    } catch (error) {
      console.error('Permission validation error:', error);
      return false;
    }
  }
}