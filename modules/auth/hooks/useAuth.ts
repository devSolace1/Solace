import { useState, useEffect, useContext, createContext, ReactNode } from 'react';
import { AuthService } from '../services/AuthService';
import type { AuthUser, AuthResult } from '../types';

interface AuthContextType {
  user: AuthUser | null;
  loading: boolean;
  signInAnonymously: () => Promise<AuthResult>;
  signInCounselor: (email: string, password: string) => Promise<AuthResult>;
  signInAdmin: (email: string, password: string) => Promise<AuthResult>;
  signOut: () => Promise<void>;
  hasPermission: (permission: keyof typeof permissions) => boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const authService = new AuthService();

const permissions = {
  canChat: 'can_chat',
  canCounsel: 'can_counsel',
  canModerate: 'can_moderate',
  canAdmin: 'can_admin',
  canCreateRooms: 'can_create_rooms',
  canExportData: 'can_export_data'
} as const;

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check for existing session on mount
    checkAuthState();
  }, []);

  const checkAuthState = async () => {
    try {
      const currentUser = await authService.getCurrentUser();
      setUser(currentUser);
    } catch (error) {
      console.error('Auth state check error:', error);
    } finally {
      setLoading(false);
    }
  };

  const signInAnonymously = async (): Promise<AuthResult> => {
    setLoading(true);
    try {
      const result = await authService.createAnonymousSession();
      if (result.success && result.user) {
        setUser(result.user);
      }
      return result;
    } finally {
      setLoading(false);
    }
  };

  const signInCounselor = async (email: string, password: string): Promise<AuthResult> => {
    setLoading(true);
    try {
      const result = await authService.createCounselorSession(email, password);
      if (result.success && result.user) {
        setUser(result.user);
      }
      return result;
    } finally {
      setLoading(false);
    }
  };

  const signInAdmin = async (email: string, password: string): Promise<AuthResult> => {
    setLoading(true);
    try {
      const result = await authService.createAdminSession(email, password);
      if (result.success && result.user) {
        setUser(result.user);
      }
      return result;
    } finally {
      setLoading(false);
    }
  };

  const signOut = async (): Promise<void> => {
    setLoading(true);
    try {
      await authService.signOut();
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  const hasPermission = (permission: keyof typeof permissions): boolean => {
    if (!user) return false;
    const userPermissions = authService.getRolePermissions(user.role);
    return userPermissions[permissions[permission] as keyof typeof userPermissions] === true;
  };

  const value: AuthContextType = {
    user,
    loading,
    signInAnonymously,
    signInCounselor,
    signInAdmin,
    signOut,
    hasPermission
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

// Convenience hooks
export function useUser() {
  const { user } = useAuth();
  return user;
}

export function useAuthLoading() {
  const { loading } = useAuth();
  return loading;
}

export function usePermissions() {
  const { hasPermission } = useAuth();
  return {
    canChat: hasPermission('canChat'),
    canCounsel: hasPermission('canCounsel'),
    canModerate: hasPermission('canModerate'),
    canAdmin: hasPermission('canAdmin'),
    canCreateRooms: hasPermission('canCreateRooms'),
    canExportData: hasPermission('canExportData')
  };
}