import { Injectable, inject } from '@angular/core';
import { SupabaseService } from './supabase-service';
import { Database } from '../../../app/types/database.types';
import { v4 as uuidv4 } from 'uuid';

export interface MagicLinkPayload {
  token: string;
  email: string;
  leagueId: number;
  expiresAt: Date;
  createdBy: number;
}

export interface MagicLinkResponse {
  success: boolean;
  token?: string;
  error?: string;
  message?: string;
}

@Injectable({
  providedIn: 'root',
})
export class MagicLinkService {
  private supabaseService = inject(SupabaseService);

  /**
   * Generates a magic link for anonymous user invitation
   * @param email Email of the anonymous user
   * @param leagueId ID of the league to invite to
   * @param createdBy User ID creating the invitation
   * @param expirationHours Hours until link expires (default: 48)
   * @returns MagicLinkResponse with token and details
   */
  async generateMagicLink(
    email: string,
    leagueId: number,
    createdBy: number,
    expirationHours: number = 48,
  ): Promise<MagicLinkResponse> {
    try {
      // Generate unique token using UUID + timestamp
      const token = this.generateToken();
      const now = new Date();
      const expiresAt = new Date(now.getTime() + expirationHours * 60 * 60 * 1000);

      const client = this.supabaseService.getClient();
      if (!client) {
        return {
          success: false,
          error: 'Supabase client not initialized',
        };
      }

      const { data, error } = await client
        .from('MAGIC_LINK')
        .insert({
          token,
          email: email.toLowerCase(),
          league_id: leagueId,
          expires_at: expiresAt.toISOString(),
          status: 'pending',
          created_by: createdBy,
          created_at: now.toISOString(),
        } as any)
        .select();

      if (error) {
        console.error('Error generating magic link:', error);
        return {
          success: false,
          error: error.message,
        };
      }

      return {
        success: true,
        token,
        message: `Magic link sent to ${email}`,
      };
    } catch (error) {
      console.error('Magic link generation error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Validates and consumes a magic link
   * @param token The magic link token
   * @param userId User ID to assign the magic link to
   * @returns Success status and email if valid
   */
  async consumeMagicLink(token: string, userId: number): Promise<MagicLinkResponse> {
    try {
      const client = this.supabaseService.getClient();
      if (!client) {
        return {
          success: false,
          error: 'Supabase client not initialized',
        };
      }

      // Fetch the magic link
      const { data: link, error: fetchError } = await client
        .from('MAGIC_LINK')
        .select('*')
        .eq('token', token)
        .eq('status', 'pending')
        .maybeSingle();

      if (fetchError) {
        console.error('Error fetching magic link:', fetchError);
        return {
          success: false,
          error: fetchError.message,
        };
      }

      if (!link) {
        return {
          success: false,
          error: 'Invalid or expired magic link',
        };
      }

      // Check expiration
      const expiresAt = new Date(link.expires_at);
      if (expiresAt < new Date()) {
        // Mark as expired
        await this.expireMagicLink(link.magic_link_id);
        return {
          success: false,
          error: 'Magic link has expired',
        };
      }

      // Update magic link as used
      const { error: updateError } = await client
        .from('MAGIC_LINK')
        .update({
          status: 'used',
          used_at: new Date().toISOString(),
          used_by: userId,
          updated_at: new Date().toISOString(),
          updated_by: userId,
        } as any)
        .eq('magic_link_id', link.magic_link_id);

      if (updateError) {
        console.error('Error consuming magic link:', updateError);
        return {
          success: false,
          error: updateError.message,
        };
      }

      return {
        success: true,
        message: `Magic link consumed for ${link.email}`,
      };
    } catch (error) {
      console.error('Magic link consumption error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Retrieves a magic link by token (for validation)
   */
  async getMagicLink(token: string) {
    try {
      const client = this.supabaseService.getClient();
      if (!client) return null;

      const { data, error } = await client
        .from('MAGIC_LINK')
        .select('*')
        .eq('token', token)
        .eq('status', 'pending')
        .maybeSingle();

      if (error) {
        console.error('Error fetching magic link:', error);
        return null;
      }

      return data;
    } catch (error) {
      console.error('Error in getMagicLink:', error);
      return null;
    }
  }

  /**
   * Marks magic link as expired
   */
  private async expireMagicLink(magicLinkId: number) {
    try {
      const client = this.supabaseService.getClient();
      if (!client) return;

      await client
        .from('MAGIC_LINK')
        .update({
          status: 'expired',
          updated_at: new Date().toISOString(),
        } as any)
        .eq('magic_link_id', magicLinkId);
    } catch (error) {
      console.error('Error expiring magic link:', error);
    }
  }

  /**
   * Generates a unique token for magic link
   */
  private generateToken(): string {
    const uuid = uuidv4();
    const timestamp = Date.now().toString(36);
    return `mlink_${timestamp}_${uuid.replace(/-/g, '')}`;
  }

  /**
   * Cleans up expired magic links (should be called periodically)
   */
  async cleanupExpiredLinks(): Promise<void> {
    try {
      const client = this.supabaseService.getClient();
      if (!client) return;

      const now = new Date();
      const { error } = await client
        .from('MAGIC_LINK')
        .update({
          status: 'expired',
          updated_at: now.toISOString(),
        } as any)
        .lt('expires_at', now.toISOString())
        .eq('status', 'pending');

      if (error) {
        console.error('Error cleaning up expired magic links:', error);
      }
    } catch (error) {
      console.error('Error in cleanupExpiredLinks:', error);
    }
  }

  /**
   * Gets all pending magic links for a league (admin view)
   */
  async getMagicLinksByLeague(leagueId: number, limit: number = 50) {
    try {
      const client = this.supabaseService.getClient();
      if (!client) return [];

      const { data, error } = await client
        .from('MAGIC_LINK')
        .select('*')
        .eq('league_id', leagueId)
        .eq('is_deleted', false)
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error) {
        console.error('Error fetching magic links:', error);
        return [];
      }

      return data || [];
    } catch (error) {
      console.error('Error in getMagicLinksByLeague:', error);
      return [];
    }
  }
}
