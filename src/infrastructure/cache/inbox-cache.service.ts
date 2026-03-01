import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';
import type { GetInboxResult } from '../../application/approvals/get-inbox.port';

const KEY_PREFIX = 'inbox:';
const DEFAULT_TTL_SEC = 30;

@Injectable()
export class InboxCacheService implements OnModuleDestroy {
  private readonly logger = new Logger(InboxCacheService.name);
  private readonly client: Redis | null;
  private readonly ttlSec: number;

  constructor(private readonly config: ConfigService) {
    const host = this.config.get<string>('REDIS_HOST', 'localhost');
    const port = this.config.get<number>('REDIS_PORT', 6379);
    const password = this.config.get<string>('REDIS_PASSWORD') || undefined;
    try {
      this.client = new Redis({
        host,
        port,
        password: password || undefined,
        maxRetriesPerRequest: 2,
        retryStrategy: () => null,
        lazyConnect: true,
      });
      this.ttlSec = DEFAULT_TTL_SEC;
    } catch (err) {
      this.logger.warn('Redis cache não disponível; inbox sem cache.', (err as Error)?.message);
      this.client = null;
      this.ttlSec = 0;
    }
  }

  async onModuleDestroy(): Promise<void> {
    if (this.client) {
      await this.client.quit().catch(() => {});
    }
  }

  private key(companyId: string, userId: string, page: number, limit: number): string {
    return `${KEY_PREFIX}${companyId}:${userId}:${page}:${limit}`;
  }

  async get(
    companyId: string,
    userId: string,
    page: number,
    limit: number,
  ): Promise<GetInboxResult | null> {
    if (!this.client) return null;
    try {
      const raw = await this.client.get(this.key(companyId, userId, page, limit));
      if (!raw) return null;
      const parsed = JSON.parse(raw) as GetInboxResult;
      if (parsed.items && Array.isArray(parsed.items)) {
        parsed.items = parsed.items.map((item) => ({
          ...item,
          instanceSubmittedAt: item.instanceSubmittedAt
            ? new Date(item.instanceSubmittedAt as unknown as string)
            : null,
        }));
      }
      return parsed;
    } catch {
      return null;
    }
  }

  async set(
    companyId: string,
    userId: string,
    page: number,
    limit: number,
    result: GetInboxResult,
  ): Promise<void> {
    if (!this.client || this.ttlSec <= 0) return;
    try {
      const serialized = JSON.stringify(result);
      await this.client.setex(
        this.key(companyId, userId, page, limit),
        this.ttlSec,
        serialized,
      );
    } catch {
      // cache miss on next request
    }
  }
}
