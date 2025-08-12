import type { ProviderCredentials } from '../providers/types';

export interface EncryptedCredentials {
  id: string;
  providerId: string;
  type: 'api-key' | 'oauth' | 'aws' | 'custom';
  encryptedValue: string;
  region?: string;
  orgExternalId?: string;
  createdAt: Date;
  updatedAt: Date;
  expiresAt?: Date;
  isActive: boolean;
  teamId: string;
  environmentId: string;
}

export interface CredentialRotationConfig {
  enabled: boolean;
  rotationIntervalDays: number;
  warningDays: number;
  autoRotate: boolean;
}

export class ProviderCredentialManager {
  private credentialsCache = new Map<string, ProviderCredentials>();
  private rotationConfig = new Map<string, CredentialRotationConfig>();
  private encryptionKey: string;

  constructor(encryptionKey: string) {
    this.encryptionKey = encryptionKey;
  }

  // Store encrypted credentials
  async storeCredentials(
    id: string,
    providerId: string,
    teamId: string,
    environmentId: string,
    credentials: Omit<ProviderCredentials, 'metadata'>,
    rotationConfig?: CredentialRotationConfig,
  ): Promise<void> {
    try {
      const encryptedValue = await this.encrypt(credentials.value);

      const encryptedCredentials: EncryptedCredentials = {
        id,
        providerId,
        type: credentials.type,
        encryptedValue,
        region: credentials.region,
        orgExternalId: credentials.orgExternalId,
        createdAt: new Date(),
        updatedAt: new Date(),
        isActive: true,
        teamId,
        environmentId,
      };

      // In a real implementation, this would be stored in the database
      // For now, we'll just cache it
      const cacheKey = this.getCacheKey(providerId, teamId, environmentId);
      this.credentialsCache.set(cacheKey, {
        ...credentials,
        metadata: { id, teamId, environmentId },
      });

      if (rotationConfig) {
        this.rotationConfig.set(id, rotationConfig);
      }

      console.log(
        `Stored credentials for provider ${providerId} in team ${teamId}, environment ${environmentId}`,
      );
    } catch (error) {
      throw new Error(
        `Failed to store credentials: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    }
  }

  // Retrieve and decrypt credentials
  async getCredentials(
    providerId: string,
    teamId: string,
    environmentId: string,
  ): Promise<ProviderCredentials | undefined> {
    const cacheKey = this.getCacheKey(providerId, teamId, environmentId);

    // Check cache first
    const cached = this.credentialsCache.get(cacheKey);
    if (cached) {
      return cached;
    }

    // In a real implementation, this would query the database
    // and decrypt the credentials
    return undefined;
  }

  // Delete credentials
  async deleteCredentials(
    providerId: string,
    teamId: string,
    environmentId: string,
  ): Promise<boolean> {
    try {
      const cacheKey = this.getCacheKey(providerId, teamId, environmentId);
      const deleted = this.credentialsCache.delete(cacheKey);

      if (deleted) {
        console.log(
          `Deleted credentials for provider ${providerId} in team ${teamId}, environment ${environmentId}`,
        );
      }

      return deleted;
    } catch (error) {
      console.error(
        `Failed to delete credentials: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
      return false;
    }
  }

  // Update credentials
  async updateCredentials(
    providerId: string,
    teamId: string,
    environmentId: string,
    credentials: Omit<ProviderCredentials, 'metadata'>,
  ): Promise<boolean> {
    try {
      const cacheKey = this.getCacheKey(providerId, teamId, environmentId);
      const existing = this.credentialsCache.get(cacheKey);

      if (!existing) {
        return false;
      }

      this.credentialsCache.set(cacheKey, {
        ...credentials,
        metadata: existing.metadata,
      });

      console.log(
        `Updated credentials for provider ${providerId} in team ${teamId}, environment ${environmentId}`,
      );
      return true;
    } catch (error) {
      console.error(
        `Failed to update credentials: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
      return false;
    }
  }

  // List all credentials for a team/environment
  async listCredentials(
    teamId: string,
    environmentId: string,
  ): Promise<
    Array<{
      providerId: string;
      type: string;
      hasCredentials: boolean;
      createdAt?: Date;
      expiresAt?: Date;
    }>
  > {
    const credentials: Array<{
      providerId: string;
      type: string;
      hasCredentials: boolean;
      createdAt?: Date;
      expiresAt?: Date;
    }> = [];

    for (const [key, cred] of this.credentialsCache.entries()) {
      if (key.includes(`${teamId}:${environmentId}`)) {
        const providerId = key.split(':')[0] || 'unknown';
        credentials.push({
          providerId,
          type: cred.type,
          hasCredentials: true,
          createdAt: new Date(), // Would come from database in real implementation
        });
      }
    }
    return credentials;
  }

  // Check if credentials exist and are valid
  async validateCredentials(
    providerId: string,
    teamId: string,
    environmentId: string,
  ): Promise<{ isValid: boolean; error?: string }> {
    try {
      const credentials = await this.getCredentials(providerId, teamId, environmentId);

      if (!credentials) {
        return { isValid: false, error: 'No credentials found' };
      }

      if (!credentials.value) {
        return { isValid: false, error: 'Credentials value is empty' };
      }

      // Additional validation based on credential type
      switch (credentials.type) {
        case 'api-key':
          if (credentials.value.length < 10) {
            return { isValid: false, error: 'API key too short' };
          }
          break;
        case 'oauth':
          if (!credentials.value.startsWith('Bearer ') && !credentials.value.includes('token')) {
            return { isValid: false, error: 'Invalid OAuth token format' };
          }
          break;
        case 'aws':
          if (!credentials.region) {
            return { isValid: false, error: 'AWS region required' };
          }
          break;
      }

      return { isValid: true };
    } catch (error) {
      return {
        isValid: false,
        error: `Validation failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      };
    }
  }

  // Check for credentials that need rotation
  async getCredentialsNeedingRotation(): Promise<
    Array<{
      id: string;
      providerId: string;
      teamId: string;
      environmentId: string;
      daysUntilExpiry: number;
    }>
  > {
    const needingRotation: Array<{
      id: string;
      providerId: string;
      teamId: string;
      environmentId: string;
      daysUntilExpiry: number;
    }> = [];

    // In a real implementation, this would query the database for credentials
    // that are approaching their expiration date based on rotation config
    return needingRotation;
  }

  // Rotate credentials
  async rotateCredentials(
    providerId: string,
    teamId: string,
    environmentId: string,
    newCredentials: Omit<ProviderCredentials, 'metadata'>,
  ): Promise<boolean> {
    try {
      // Store new credentials
      const rotationId = `${providerId}-${Date.now()}`;
      await this.storeCredentials(rotationId, providerId, teamId, environmentId, newCredentials);

      // Deactivate old credentials (in real implementation)
      // Would update database to mark old credentials as inactive

      console.log(
        `Rotated credentials for provider ${providerId} in team ${teamId}, environment ${environmentId}`,
      );
      return true;
    } catch (error) {
      console.error(
        `Failed to rotate credentials: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
      return false;
    }
  }

  private getCacheKey(providerId: string, teamId: string, environmentId: string): string {
    return `${providerId}:${teamId}:${environmentId}`;
  }

  private async encrypt(value: string): Promise<string> {
    // In a real implementation, this would use proper encryption
    // For now, we'll just base64 encode it (NOT SECURE - for demo only)
    return Buffer.from(value).toString('base64');
  }

  private async decrypt(encryptedValue: string): Promise<string> {
    // In a real implementation, this would use proper decryption
    // For now, we'll just base64 decode it (NOT SECURE - for demo only)
    return Buffer.from(encryptedValue, 'base64').toString();
  }

  // Clear cache (useful for testing or when credentials are updated externally)
  clearCache(): void {
    this.credentialsCache.clear();
    console.log('Credentials cache cleared');
  }

  // Get cache stats
  getCacheStats(): { size: number; keys: string[] } {
    return {
      size: this.credentialsCache.size,
      keys: Array.from(this.credentialsCache.keys()),
    };
  }
}
