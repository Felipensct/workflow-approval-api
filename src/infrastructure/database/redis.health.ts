import { Injectable } from '@nestjs/common';
import {
  HealthIndicator,
  HealthIndicatorResult,
  HealthCheckError,
} from '@nestjs/terminus';
import Redis from 'ioredis';

@Injectable()
export class RedisHealthIndicator extends HealthIndicator {
  private getClient(): Redis {
    return new Redis({
      host: process.env.REDIS_HOST || 'localhost',
      port: parseInt(process.env.REDIS_PORT || '6379', 10),
      password: process.env.REDIS_PASSWORD || undefined,
      maxRetriesPerRequest: 1,
    });
  }

  async isHealthy(key: string): Promise<HealthIndicatorResult> {
    const client = this.getClient();
    try {
      await client.ping();
      await client.quit();
      return this.getStatus(key, true, { ping: 'pong' });
    } catch (err) {
      await client.quit().catch(() => {});
      throw new HealthCheckError(
        'Redis check failed',
        this.getStatus(key, false, { error: (err as Error).message }),
      );
    }
  }
}
