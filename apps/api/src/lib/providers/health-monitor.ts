import type { ProviderConfig, ProviderCredentials } from '../providers/types';
import { DefaultProviderFactory } from '../providers/factory';

export interface ProviderHealthStatus {
  providerId: string;
  isHealthy: boolean;
  lastChecked: Date;
  latencyMs?: number;
  error?: string;
}

export interface HealthMonitorConfig {
  checkIntervalMs: number;
  timeoutMs: number;
  maxRetries: number;
  retryDelayMs: number;
}

export class ProviderHealthMonitor {
  private healthStatus = new Map<string, ProviderHealthStatus>();
  private checkInterval?: NodeJS.Timeout;
  private readonly factory = DefaultProviderFactory.getInstance();

  constructor(
    private providers: Array<{ config: ProviderConfig; credentials: ProviderCredentials }>,
    private config: HealthMonitorConfig = {
      checkIntervalMs: 60000, // 1 minute
      timeoutMs: 5000, // 5 seconds
      maxRetries: 3,
      retryDelayMs: 1000, // 1 second
    },
  ) {
    // Initialize health status for all providers
    this.providers.forEach(({ config }) => {
      this.healthStatus.set(config.id, {
        providerId: config.id,
        isHealthy: false,
        lastChecked: new Date(),
      });
    });
  }

  start(): void {
    if (this.checkInterval) {
      return; // Already started
    }

    // Perform initial health check
    this.performHealthChecks();

    // Set up recurring health checks
    this.checkInterval = setInterval(() => {
      this.performHealthChecks();
    }, this.config.checkIntervalMs);
  }

  stop(): void {
    if (this.checkInterval) {
      clearInterval(this.checkInterval);
      this.checkInterval = undefined;
    }
  }

  getHealthStatus(providerId: string): ProviderHealthStatus | undefined {
    return this.healthStatus.get(providerId);
  }

  getAllHealthStatuses(): ProviderHealthStatus[] {
    return Array.from(this.healthStatus.values());
  }

  getHealthyProviders(): ProviderHealthStatus[] {
    return this.getAllHealthStatuses().filter((status) => status.isHealthy);
  }

  getUnhealthyProviders(): ProviderHealthStatus[] {
    return this.getAllHealthStatuses().filter((status) => !status.isHealthy);
  }

  private async performHealthChecks(): Promise<void> {
    const healthCheckPromises = this.providers.map(({ config, credentials }) =>
      this.checkProviderHealth(config, credentials),
    );

    await Promise.allSettled(healthCheckPromises);
  }

  private async checkProviderHealth(
    config: ProviderConfig,
    credentials: ProviderCredentials,
  ): Promise<void> {
    const startTime = performance.now();
    let attempts = 0;

    while (attempts < this.config.maxRetries) {
      try {
        const client = this.factory.createClient(config, credentials);
        const isHealthy = await this.performHealthCheckWithTimeout(client);
        const latencyMs = performance.now() - startTime;

        this.updateHealthStatus(config.id, {
          providerId: config.id,
          isHealthy,
          lastChecked: new Date(),
          latencyMs,
          error: undefined,
        });

        return; // Success, exit retry loop
      } catch (error) {
        attempts++;

        if (attempts >= this.config.maxRetries) {
          // Final attempt failed
          const latencyMs = performance.now() - startTime;
          this.updateHealthStatus(config.id, {
            providerId: config.id,
            isHealthy: false,
            lastChecked: new Date(),
            latencyMs,
            error: error instanceof Error ? error.message : 'Unknown error',
          });
        } else {
          // Wait before retrying
          await this.delay(this.config.retryDelayMs);
        }
      }
    }
  }

  private async performHealthCheckWithTimeout(client: any): Promise<boolean> {
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error('Health check timeout'));
      }, this.config.timeoutMs);

      client
        .healthCheck()
        .then((result: boolean) => {
          clearTimeout(timeout);
          resolve(result);
        })
        .catch((error: Error) => {
          clearTimeout(timeout);
          reject(error);
        });
    });
  }

  private updateHealthStatus(providerId: string, status: ProviderHealthStatus): void {
    this.healthStatus.set(providerId, status);

    // Log status changes
    const previousStatus = this.healthStatus.get(providerId);
    if (previousStatus && previousStatus.isHealthy !== status.isHealthy) {
      console.log(
        `Provider ${providerId} health status changed: ${previousStatus.isHealthy ? 'healthy' : 'unhealthy'} -> ${status.isHealthy ? 'healthy' : 'unhealthy'}`,
      );

      if (status.error) {
        console.error(`Provider ${providerId} error:`, status.error);
      }
    }
  }

  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  // Method to manually trigger a health check for a specific provider
  async checkProvider(providerId: string): Promise<ProviderHealthStatus | undefined> {
    const provider = this.providers.find((p) => p.config.id === providerId);
    if (!provider) {
      return undefined;
    }

    await this.checkProviderHealth(provider.config, provider.credentials);
    return this.getHealthStatus(providerId);
  }

  // Method to get providers sorted by health and latency (for routing decisions)
  getProvidersForRouting(): ProviderHealthStatus[] {
    return this.getHealthyProviders().sort((a, b) => {
      // Sort healthy providers by latency (ascending)
      const latencyA = a.latencyMs || Number.MAX_SAFE_INTEGER;
      const latencyB = b.latencyMs || Number.MAX_SAFE_INTEGER;
      return latencyA - latencyB;
    });
  }
}
