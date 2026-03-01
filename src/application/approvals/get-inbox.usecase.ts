import { Inject, Injectable } from '@nestjs/common';
import type { GetInboxPort, GetInboxResult } from './get-inbox.port';
import { GET_INBOX_PORT } from './tokens';

export interface GetInboxInput {
  companyId: string;
  userId: string;
  page: number;
  limit: number;
}

@Injectable()
export class GetInboxUseCase {
  constructor(
    @Inject(GET_INBOX_PORT)
    private readonly getInboxPort: GetInboxPort,
  ) {}

  async execute(input: GetInboxInput): Promise<GetInboxResult> {
    return this.getInboxPort.getInbox(
      input.companyId,
      input.userId,
      input.page,
      input.limit,
    );
  }
}
