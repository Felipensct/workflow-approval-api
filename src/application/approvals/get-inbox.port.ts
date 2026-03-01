export interface InboxItem {
  stepId: string;
  instanceId: string;
  stepRef: string;
  orderIndex: number;
  instanceSubmittedAt: Date | null;
}

export interface GetInboxResult {
  items: InboxItem[];
  total: number;
  page: number;
  limit: number;
}

export interface GetInboxPort {
  getInbox(
    companyId: string,
    userId: string,
    page: number,
    limit: number,
  ): Promise<GetInboxResult>;
}
