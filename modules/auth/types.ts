// Auth Module Types
export interface AuthUser {
  id: string;
  role: 'user' | 'counselor' | 'admin';
  is_active: boolean;
  created_at: string;
  last_active: string;
}

export interface AuthSession {
  user: AuthUser;
  access_token: string;
  refresh_token: string;
  expires_at: number;
}

export interface AuthResult {
  success: boolean;
  user?: AuthUser;
  error?: string;
}

export interface RolePermissions {
  can_chat: boolean;
  can_counsel: boolean;
  can_moderate: boolean;
  can_admin: boolean;
  can_create_rooms: boolean;
  can_export_data: boolean;
}