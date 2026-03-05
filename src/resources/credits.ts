import type { HttpClient } from '../http.js';
import type {
  CreditBalance,
  CreditTransaction,
  ListCreditTransactionsParams,
  CreditCheckoutResult,
  PaginatedList,
} from '../types.js';

export class CreditsResource {
  constructor(private readonly http: HttpClient) {}

  async balance(): Promise<CreditBalance> {
    return this.http.get('/credits');
  }

  async transactions(params?: ListCreditTransactionsParams): Promise<PaginatedList<CreditTransaction>> {
    return this.http.get('/credits/transactions', { query: params as Record<string, string | number | boolean | undefined> });
  }

  async checkout(pack: 'starter' | 'growth' | 'scale'): Promise<CreditCheckoutResult> {
    return this.http.post('/credits/checkout', { body: { pack } });
  }
}
