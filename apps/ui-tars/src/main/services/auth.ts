/**
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 * 
 * HaloClaw Auth Service - Supabase User Authentication
 * 电商AI助手用户认证服务
 */

import { createClient, SupabaseClient, User, AuthError } from '@supabase/supabase-js';
import { logger } from '@main/logger';
import { store } from '@main/store/create';

// Supabase 配置 - 从环境变量或配置文件获取
const SUPABASE_URL = process.env.SUPABASE_URL || 'https://kekmppsuiiokdckdeolv.supabase.co';
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY || '';

interface AuthState {
  user: User | null;
  session: string | null;
  isAuthenticated: boolean;
}

interface LoginCredentials {
  email: string;
  password: string;
}

interface RegisterData {
  email: string;
  password: string;
  username?: string;
}

interface AuthResponse {
  success: boolean;
  data?: User;
  error?: string;
}

class HaloClawAuthService {
  private supabase: SupabaseClient | null = null;
  private currentUser: User | null = null;
  private currentSession: string | null = null;

  constructor() {
    this.initializeClient();
  }

  /**
   * 初始化 Supabase 客户端
   */
  private initializeClient(): void {
    if (!SUPABASE_ANON_KEY) {
      logger.warn('[Auth] SUPABASE_ANON_KEY not configured, using demo mode');
      return;
    }

    try {
      this.supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
        auth: {
          persistSession: true,
          autoRefreshToken: true,
          storage: {
            getItem: (key) => {
              return store.get(key) as string | null;
            },
            setItem: (key, value) => {
              store.set(key, value);
            },
            removeItem: (key) => {
              store.delete(key);
            },
          },
        },
      });
      logger.info('[Auth] Supabase client initialized');
    } catch (error) {
      logger.error('[Auth] Failed to initialize Supabase client:', error);
    }
  }

  /**
   * 用户登录
   */
  async login(credentials: LoginCredentials): Promise<AuthResponse> {
    if (!this.supabase) {
      return { success: false, error: '认证服务未初始化' };
    }

    try {
      const { data, error } = await this.supabase.auth.signInWithPassword({
        email: credentials.email,
        password: credentials.password,
      });

      if (error) {
        logger.error('[Auth] Login failed:', error.message);
        return { success: false, error: error.message };
      }

      this.currentUser = data.user;
      this.currentSession = data.session?.access_token || null;

      // 登录成功后同步到 NewAPI
      await this.syncToNewAPI(data.user);

      logger.info('[Auth] Login successful:', data.user.email);
      return { success: true, data: data.user };
    } catch (error) {
      const message = error instanceof Error ? error.message : '登录失败';
      logger.error('[Auth] Login error:', message);
      return { success: false, error: message };
    }
  }

  /**
   * 用户注册
   */
  async register(data: RegisterData): Promise<AuthResponse> {
    if (!this.supabase) {
      return { success: false, error: '认证服务未初始化' };
    }

    try {
      const { data: authData, error } = await this.supabase.auth.signUp({
        email: data.email,
        password: data.password,
        options: {
          data: {
            username: data.username || data.email.split('@')[0],
            created_at: new Date().toISOString(),
          },
        },
      });

      if (error) {
        logger.error('[Auth] Registration failed:', error.message);
        return { success: false, error: error.message };
      }

      if (authData.user) {
        this.currentUser = authData.user;
        this.currentSession = authData.session?.access_token || null;

        // 注册成功后创建用户配额记录
        await this.createUserQuota(authData.user.id);

        // 同步到 NewAPI
        await this.syncToNewAPI(authData.user);

        logger.info('[Auth] Registration successful:', authData.user.email);
        return { success: true, data: authData.user };
      }

      return { success: false, error: '注册未完成，请查收验证邮件' };
    } catch (error) {
      const message = error instanceof Error ? error.message : '注册失败';
      logger.error('[Auth] Registration error:', message);
      return { success: false, error: message };
    }
  }

  /**
   * 用户登出
   */
  async logout(): Promise<AuthResponse> {
    if (!this.supabase) {
      return { success: false, error: '认证服务未初始化' };
    }

    try {
      const { error } = await this.supabase.auth.signOut();

      if (error) {
        logger.error('[Auth] Logout failed:', error.message);
        return { success: false, error: error.message };
      }

      this.currentUser = null;
      this.currentSession = null;

      logger.info('[Auth] Logout successful');
      return { success: true };
    } catch (error) {
      const message = error instanceof Error ? error.message : '登出失败';
      logger.error('[Auth] Logout error:', message);
      return { success: false, error: message };
    }
  }

  /**
   * 获取当前用户
   */
  async getCurrentUser(): Promise<User | null> {
    if (!this.supabase) {
      return null;
    }

    try {
      const { data: { user }, error } = await this.supabase.auth.getUser();

      if (error) {
        logger.error('[Auth] Get current user failed:', error.message);
        return null;
      }

      this.currentUser = user;
      return user;
    } catch (error) {
      logger.error('[Auth] Get current user error:', error);
      return null;
    }
  }

  /**
   * 检查认证状态
   */
  async checkAuthStatus(): Promise<AuthState> {
    if (!this.supabase) {
      return { user: null, session: null, isAuthenticated: false };
    }

    try {
      const { data: { session }, error } = await this.supabase.auth.getSession();

      if (error || !session) {
        return { user: null, session: null, isAuthenticated: false };
      }

      this.currentSession = session.access_token;

      const { data: { user } } = await this.supabase.auth.getUser();
      this.currentUser = user;

      return {
        user,
        session: session.access_token,
        isAuthenticated: !!user,
      };
    } catch (error) {
      logger.error('[Auth] Check auth status error:', error);
      return { user: null, session: null, isAuthenticated: false };
    }
  }

  /**
   * 重置密码
   */
  async resetPassword(email: string): Promise<AuthResponse> {
    if (!this.supabase) {
      return { success: false, error: '认证服务未初始化' };
    }

    try {
      const { error } = await this.supabase.auth.resetPasswordForEmail(email, {
        redirectTo: 'haloclaw://auth/reset-password',
      });

      if (error) {
        return { success: false, error: error.message };
      }

      logger.info('[Auth] Password reset email sent to:', email);
      return { success: true };
    } catch (error) {
      const message = error instanceof Error ? error.message : '重置密码失败';
      return { success: false, error: message };
    }
  }

  /**
   * 更新用户资料
   */
  async updateProfile(data: { username?: string; full_name?: string }): Promise<AuthResponse> {
    if (!this.supabase || !this.currentUser) {
      return { success: false, error: '未登录' };
    }

    try {
      const { data: updatedUser, error } = await this.supabase.auth.updateUser({
        data: {
          username: data.username,
          full_name: data.full_name,
        },
      });

      if (error) {
        return { success: false, error: error.message };
      }

      this.currentUser = updatedUser.user;
      return { success: true, data: updatedUser.user };
    } catch (error) {
      const message = error instanceof Error ? error.message : '更新资料失败';
      return { success: false, error: message };
    }
  }

  /**
   * 获取用户配额信息
   */
  async getUserQuota(): Promise<{ quota: number; used: number } | null> {
    if (!this.supabase || !this.currentUser) {
      return null;
    }

    try {
      const { data, error } = await this.supabase
        .from('user_quotas')
        .select('quota, used')
        .eq('user_id', this.currentUser.id)
        .single();

      if (error || !data) {
        // 如果表不存在，返回默认配额
        return { quota: 1000, used: 0 };
      }

      return { quota: data.quota, used: data.used };
    } catch (error) {
      logger.error('[Auth] Get user quota error:', error);
      return { quota: 1000, used: 0 };
    }
  }

  /**
   * 创建用户配额记录
   */
  private async createUserQuota(userId: string): Promise<void> {
    if (!this.supabase) return;

    try {
      await this.supabase.from('user_quotas').upsert({
        user_id: userId,
        quota: 1000, // 默认1000 Quota
        used: 0,
        created_at: new Date().toISOString(),
      });
    } catch (error) {
      logger.error('[Auth] Create user quota error:', error);
    }
  }

  /**
   * 同步用户到 NewAPI
   * 用户注册/登录后自动同步到 NewAPI 进行计费
   */
  private async syncToNewAPI(user: User): Promise<void> {
    if (!user.email) return;

    const newApiUrl = process.env.NEW_API_URL;
    const newApiKey = process.env.NEW_API_ADMIN_KEY;

    if (!newApiUrl || !newApiKey) {
      logger.warn('[Auth] NewAPI not configured, skipping sync');
      return;
    }

    try {
      // 调用 NewAPI 创建/更新用户
      const response = await fetch(`${newApiUrl}/users`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${newApiKey}`,
        },
        body: JSON.stringify({
          email: user.email,
          user_id: user.id,
          name: user.user_metadata?.username || user.email.split('@')[0],
        }),
      });

      if (!response.ok) {
        logger.warn('[Auth] Failed to sync user to NewAPI:', response.status);
        return;
      }

      logger.info('[Auth] User synced to NewAPI:', user.email);
    } catch (error) {
      logger.error('[Auth] NewAPI sync error:', error);
    }
  }

  /**
   * 获取访问令牌（用于 API 调用）
   */
  getAccessToken(): string | null {
    return this.currentSession;
  }

  /**
   * 获取用户 ID
   */
  getUserId(): string | null {
    return this.currentUser?.id || null;
  }

  /**
   * 检查是否已登录
   */
  isLoggedIn(): boolean {
    return !!this.currentUser && !!this.currentSession;
  }
}

// 导出单例
export const authService = new HaloClawAuthService();

// IPC 处理器注册
export function registerAuthHandlers(): void {
  const { ipcMain } = require('electron');

  ipcMain.handle('auth:login', async (_, credentials: LoginCredentials) => {
    return authService.login(credentials);
  });

  ipcMain.handle('auth:register', async (_, data: RegisterData) => {
    return authService.register(data);
  });

  ipcMain.handle('auth:logout', async () => {
    return authService.logout();
  });

  ipcMain.handle('auth:getCurrentUser', async () => {
    return authService.getCurrentUser();
  });

  ipcMain.handle('auth:checkStatus', async () => {
    return authService.checkAuthStatus();
  });

  ipcMain.handle('auth:resetPassword', async (_, email: string) => {
    return authService.resetPassword(email);
  });

  ipcMain.handle('auth:updateProfile', async (_, data) => {
    return authService.updateProfile(data);
  });

  ipcMain.handle('auth:getQuota', async () => {
    return authService.getUserQuota();
  });

  ipcMain.handle('auth:isLoggedIn', async () => {
    return authService.isLoggedIn();
  });

  logger.info('[Auth] Auth handlers registered');
}
