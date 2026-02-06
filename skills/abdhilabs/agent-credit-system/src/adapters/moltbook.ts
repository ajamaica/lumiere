/**
 * Moltbook API Adapter
 * 
 * Fetches agent profiles and karma data from Moltbook API
 */

import axios, { AxiosError,AxiosInstance } from 'axios';

// Type definitions - matching actual API response
export interface MoltbookProfile {
  id: string;
  name: string;
  description?: string;
  created_at: string;
  last_active: string | null;
  karma: number;
  is_claimed?: boolean;
  is_active?: boolean;
  follower_count?: number;
  following_count?: number;
  avatar_url?: string | null;
  metadata?: Record<string, unknown>;
  claimed_at?: string;
  owner_id?: string;
  owner?: {
    x_handle?: string;
    x_name?: string;
    x_avatar?: string;
    x_bio?: string;
    x_follower_count?: number;
    x_following_count?: number;
    x_verified?: boolean;
  };
  stats?: {
    posts: number;
    comments: number;
    subscriptions: number;
  };
}

export interface MoltbookIdentityToken {
  success: boolean;
  identity_token: string;
  expires_in: number;
  expires_at: string;
  audience: string;
}

export interface MoltbookIdentityVerify {
  success: boolean;
  valid: boolean;
  agent: MoltbookProfile;
}

export interface MoltbookError {
  success: false;
  error: string;
  hint?: string;
}

export type MoltbookResponse<T> = T | MoltbookError;

// Configuration
export interface MoltbookConfig {
  apiKey: string;
  baseUrl?: string;
  timeout?: number;
}

export const DEFAULT_CONFIG: Partial<MoltbookConfig> = {
  baseUrl: 'https://www.moltbook.com/api/v1',
  timeout: 10000,
};

/**
 * Moltbook API Client
 */
export class MoltbookClient {
  private client: AxiosInstance;
  private config: MoltbookConfig;

  constructor(config: MoltbookConfig) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    
    this.client = axios.create({
      baseURL: this.config.baseUrl,
      timeout: this.config.timeout,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.config.apiKey}`,
      },
    });
  }

  /**
   * Get current agent profile
   */
  async getMyProfile(): Promise<MoltbookProfile | MoltbookError> {
    try {
      const response = await this.client.get<{ success: boolean; agent: MoltbookProfile }>('/agents/me');
      if (response.data.success && response.data.agent) {
        return this.mapToProfile(response.data.agent);
      }
      return { success: false, error: 'Agent not found' };
    } catch (error) {
      return this.handleError(error);
    }
  }

  /**
   * Get agent profile by name
   */
  async getAgentProfile(name: string): Promise<MoltbookProfile | MoltbookError> {
    try {
      const response = await this.client.get<{ success: boolean; agent: MoltbookProfile }>(
        `/agents/profile?name=${encodeURIComponent(name)}`
      );
      if (response.data.success && response.data.agent) {
        return this.mapToProfile(response.data.agent);
      }
      return { success: false, error: 'Agent not found' };
    } catch (error) {
      return this.handleError(error);
    }
  }

  /**
   * Map API response to MoltbookProfile
   */
  private mapToProfile(apiAgent: any): MoltbookProfile {
    return {
      id: apiAgent.id || '',
      name: apiAgent.name || '',
      description: apiAgent.description || '',
      created_at: apiAgent.created_at || new Date().toISOString(),
      last_active: apiAgent.last_active || null,
      karma: apiAgent.karma || 0,
      is_claimed: apiAgent.is_claimed || false,
      is_active: apiAgent.is_active || false,
      follower_count: apiAgent.follower_count || 0,
      following_count: apiAgent.following_count || 0,
      avatar_url: apiAgent.avatar_url || null,
      metadata: apiAgent.metadata || {},
      claimed_at: apiAgent.claimed_at || '',
      owner_id: apiAgent.owner_id || '',
      owner: {
        x_handle: apiAgent.owner?.x_handle || '',
        x_name: apiAgent.owner?.x_name || '',
        x_avatar: apiAgent.owner?.x_avatar || '',
        x_bio: apiAgent.owner?.x_bio || '',
        x_follower_count: apiAgent.owner?.x_follower_count || 0,
        x_following_count: apiAgent.owner?.x_following_count || 0,
        x_verified: apiAgent.owner?.x_verified || false,
      },
      stats: apiAgent.stats || undefined,
    };
  }

  /**
   * Generate identity token for agent verification
   */
  async generateIdentityToken(audience: string): Promise<MoltbookIdentityToken | MoltbookError> {
    try {
      const response = await this.client.post<MoltbookResponse<MoltbookIdentityToken>>(
        '/agents/me/identity-token',
        { audience }
      );
      return response.data as MoltbookIdentityToken;
    } catch (error) {
      return this.handleError(error);
    }
  }

  /**
   * Verify identity token
   */
  async verifyIdentity(token: string, audience: string): Promise<MoltbookIdentityVerify | MoltbookError> {
    try {
      const response = await this.client.post<MoltbookResponse<MoltbookIdentityVerify>>(
        '/agents/verify-identity',
        { token, audience }
      );
      return response.data as MoltbookIdentityVerify;
    } catch (error) {
      return this.handleError(error);
    }
  }

  /**
   * Check claim status
   */
  async getClaimStatus(): Promise<{ status: string } | MoltbookError> {
    try {
      const response = await this.client.get('/agents/status');
      return response.data as { status: string };
    } catch (error) {
      return this.handleError(error);
    }
  }

  /**
   * Handle Axios errors
   */
  private handleError(error: unknown): MoltbookError {
    if (axios.isAxiosError(error)) {
      const axiosError = error as AxiosError<{ error?: string; hint?: string }>;
      return {
        success: false,
        error: axiosError.response?.data?.error || axiosError.message,
        hint: axiosError.response?.data?.hint,
      };
    }
    return {
      success: false,
      error: 'Unknown error occurred',
    };
  }
}

/**
 * Factory function to create Moltbook client
 */
export function createMoltbookClient(apiKey: string): MoltbookClient {
  return new MoltbookClient({ apiKey });
}

/**
 * Get agent profile by name (standalone function)
 */
export async function getMoltbookProfile(
  name: string,
  apiKey?: string
): Promise<MoltbookProfile> {
  const key = apiKey || process.env.MOLTBOOK_API_KEY;
  if (!key) {
    throw new Error('MOLTBOOK_API_KEY not set');
  }
  const client = createMoltbookClient(key);
  const profile = await client.getAgentProfile(name);
  if ('success' in profile && !profile.success) {
    throw new Error(profile.error || 'Failed to fetch profile');
  }
  return profile as MoltbookProfile;
}

/**
 * Quick check if API key is valid
 */
export async function validateApiKey(apiKey: string): Promise<boolean> {
  const client = createMoltbookClient(apiKey);
  const profile = await client.getMyProfile();
  return 'success' in profile ? profile.success : true;
}
