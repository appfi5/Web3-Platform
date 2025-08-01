import { createHash, randomBytes } from 'node:crypto';

import { and, eq } from 'drizzle-orm';

import { type Logger } from '~/aggregator/types';
import { db } from '~/server/db';
import { accountApiKey } from '~/server/db/schema';
import { asserts } from '~/utils/asserts';

import { type Pagination } from '../../types';

const MINIMUM_AVAILABLE_CREDITS = 100;
// stands for "API Key"
const API_KEY_PREFIX = 'ak';

export function createPaymentService({
  paymentServiceUrl,
  logger = console,
}: {
  paymentServiceUrl?: string;
  logger: Logger;
}) {
  const safeCall = <T>({
    path,
    xSubjectId,
    method = 'GET',
    query,
    body,
  }: {
    path: string;
    method?: 'GET' | 'POST' | 'DELETE' | 'PUT';
    query?: Record<string, string | undefined>;
    body?: Record<string, unknown>;
    xSubjectId?: string;
  }): Promise<PaymentServiceResponse<T>> => {
    if (!paymentServiceUrl) {
      throw new Error('The "paymentServiceUrl" is not set');
    }
    const q = query ? (Object.entries(query).filter(([_, v]) => v != null) as [string, string][]) : [];
    const queryString = q.length > 0 ? `?${new URLSearchParams(q).toString()}` : '';

    const url = new URL(path, paymentServiceUrl).toString() + queryString;

    const headers = new Headers();
    headers.append('Content-Type', 'application/json');
    if (xSubjectId) {
      headers.append('X-Subject-Id', xSubjectId);
    }
    const bodyJson = body ? JSON.stringify(body) : undefined;

    return fetch(url, { method, headers, body: bodyJson }).then<PaymentServiceResponse<T>>((res) => res.json());
  };

  const call = <T>({
    path,
    xSubjectId,
    method,
    body,
    query,
  }: {
    path: string;
    method?: 'GET' | 'POST' | 'DELETE' | 'PUT';
    query?: Record<string, string | undefined>;
    body?: Record<string, unknown>;
    xSubjectId?: string;
  }): Promise<T> => {
    return safeCall<T>({ path, xSubjectId, method, query, body }).then(
      (res) => {
        if (!isSuccessResponse(res)) {
          logger.warn(`💳 Payment service error: ${path}`, JSON.stringify(res));
          throw new Error(`Request failed from the payment service, code: ${res.code}, status: ${res.status}`);
        }
        return res.data;
      },
      (err) => {
        logger.error(`💳 Payment service error: ${path}, ${JSON.stringify(err)}`);
        throw err;
      },
    );
  };

  function getRemainingCredits({ accountId }: { accountId: string }): Promise<number> {
    return call<PaymentUserInfo>({
      path: '/user_info',
      method: 'GET',
      xSubjectId: accountId,
    }).then((res) => res.attributes.remaining_credits);
  }

  function checkoutSession({
    accountId,
    priceId,
    successUrl,
    cancelUrl,
  }: {
    accountId: string;
    priceId: string;
    successUrl?: string;
    cancelUrl?: string;
  }): Promise<{ url: string }> {
    return call<PaymentCheckoutSession>({
      path: '/stripe/checkout_sessions',
      xSubjectId: accountId,
      method: 'POST',
      query: { price: priceId, success_url: successUrl, cancel_url: cancelUrl },
    }).then((res) => ({ url: res.attributes.url }));
  }

  function listProducts() {
    return call<PaymentProduct>({ path: '/stripe/products' });
  }

  async function getUserSubscriptionInfo({ accountId }: { accountId: string }): Promise<{
    remainingCredits: number;
    totalCredits: number;
    periodStart: Date;
    periodEnd: Date;
    plan: {
      name: string;
      description: string;
      productId: string;
      priceId: string;
      interval: string;
      price: string;
      currency: string;
      totalCredits: number;
      rateLimit: number;
    };
  } | null> {
    const [subscription, userInfo] = await Promise.all([
      call<PaymentSubscription | null>({ path: '/stripe/subscription', xSubjectId: accountId }).catch(() => null),
      call<PaymentUserInfo | null>({ path: '/user_info', xSubjectId: accountId }).catch(() => null),
    ]);

    if (!subscription || !userInfo) {
      return null;
    }

    return {
      remainingCredits: userInfo.attributes.remaining_credits,
      totalCredits: userInfo.attributes.total_credits,
      periodStart: new Date(Number(subscription.attributes.current_period_start) * 1000),
      periodEnd: new Date(Number(subscription.attributes.current_period_end) * 1000),
      plan: {
        name: subscription.attributes.stripe_product.name,
        description: subscription.attributes.stripe_product.description,
        productId: String(subscription.attributes.stripe_price.product_uid),
        priceId: String(subscription.attributes.stripe_price.price_uid),
        interval: subscription.attributes.stripe_price.recurring.interval,
        price: subscription.attributes.stripe_price.unit_amount_decimal,
        currency: subscription.attributes.stripe_price.currency,
        totalCredits: Number(subscription.attributes.stripe_price.metadata.credit_quota),
        rateLimit: Number(subscription.attributes.stripe_price.metadata.rate_limit),
      },
    };
  }

  /**
   * Reports an API call to the payment service, if the API key is valid and the account has enough credits.
   * @param param0
   * @returns
   */
  async function startReportApiCall({
    apiKey,
    route,
    inputData,
  }: {
    apiKey: string;
    route: string;
    inputData?: unknown;
  }) {
    if (!isValidApiKeyFormat(apiKey)) {
      throw new Error(`Invalid API key format`);
    }

    const accountId = await getActiveApiKeyOwner({ apiKey });
    if (!accountId) {
      throw new Error(`API key not found`);
    }

    const remainingCredits = await getRemainingCredits({ accountId });
    if (remainingCredits <= MINIMUM_AVAILABLE_CREDITS) {
      throw new Error(`Not enough credits`);
    }

    const start = Date.now();

    return function reportApiCall(): Promise<void> {
      const end = new Date();

      return call({
        path: '/api_calls',
        method: 'POST',
        xSubjectId: accountId,
        body: {
          api_key: maskApiKey(apiKey),
          route,
          created: end.toJSON(),
          response_time_ms: end.valueOf() - start,
          source: 'web3-platform',
          input_data: inputData,
        },
      });
    };
  }

  async function generateApiKey({
    accountId,
    name,
  }: {
    accountId: string;
    name: string;
  }): Promise<{ apiKey: string; name: string; createdAt: Date; id: number }> {
    const apiKey = `${API_KEY_PREFIX}${Buffer.from(randomBytes(20)).toString('hex')}`;
    const maskedApiKey = maskApiKey(apiKey);
    const apiKeyHash = createHash('sha256').update(apiKey).digest('hex');

    const inserted = await db
      .insert(accountApiKey)
      .values({ accountId, maskedApiKey, apiKeyHash, name: name })
      .returning({ id: accountApiKey.id, createdAt: accountApiKey.createdAt });

    asserts(inserted.length === 1 && inserted[0]);

    const res = inserted[0];
    return { apiKey, name, createdAt: res.createdAt, id: res.id };
  }

  async function modifyApiKey({
    apiKeyId,
    name,
    accountId,
  }: {
    apiKeyId: string;
    name: string;
    accountId: string;
  }): Promise<boolean> {
    const res = await db
      .update(accountApiKey)
      .set({ name })
      .where(and(eq(accountApiKey.id, Number(apiKeyId)), eq(accountApiKey.accountId, accountId)))
      .returning({ id: accountApiKey.id });

    return res.length > 0;
  }

  async function listApiKeys({
    accountId,
    page = 1,
    pageSize = 10,
  }: {
    accountId: string;
    page?: number;
    pageSize?: number;
  }): Promise<Pagination<{ id: string; apiKey: string; name: string; createdAt: Date }>> {
    const list = await db.query.accountApiKey.findMany({
      columns: { id: true, maskedApiKey: true, name: true, createdAt: true },
      where: and(eq(accountApiKey.accountId, accountId), eq(accountApiKey.isActive, true)),
      limit: pageSize,
      offset: (page - 1) * pageSize,
    });

    const rowCount = await db.$count(
      db
        .select()
        .from(accountApiKey)
        .where(and(eq(accountApiKey.accountId, accountId), eq(accountApiKey.isActive, true))),
    );

    return {
      data: list.map((d) => ({ id: String(d.id), apiKey: d.maskedApiKey, name: d.name, createdAt: d.createdAt })),
      pagination: { rowCount },
    };
  }

  async function getActiveApiKeyOwner({ apiKey }: { apiKey: string }): Promise<string | null> {
    const apiKeyHash = createHash('sha256').update(apiKey).digest('hex');
    const res = await db.query.accountApiKey.findFirst({
      columns: { accountId: true },
      where: and(eq(accountApiKey.apiKeyHash, apiKeyHash), eq(accountApiKey.isActive, true)),
    });

    return res?.accountId ?? null;
  }

  async function revokeApiKey({ apiKeyId, accountId }: { apiKeyId: string; accountId: string }): Promise<number> {
    const res = await db
      .update(accountApiKey)
      .set({ isActive: false })
      .where(and(eq(accountApiKey.id, Number(apiKeyId)), eq(accountApiKey.accountId, accountId)));

    return res.length;
  }

  function isValidApiKeyFormat(val: unknown): val is `ak${string}` {
    return typeof val === 'string' && val.startsWith(API_KEY_PREFIX);
  }

  async function changePlan({ accountId, priceId }: { accountId: string; priceId: string }): Promise<boolean> {
    return call<{ success: boolean }>({
      path: '/stripe/subscription',
      method: 'PUT',
      xSubjectId: accountId,
      body: { price: priceId },
    }).then((res) => res.success);
  }

  return {
    getRemainingCredits,
    checkoutSession,
    listProducts,
    startReportApiCall,
    generateApiKey,
    modifyApiKey,
    listApiKeys,
    getUserSubscriptionInfo,
    revokeApiKey,
    changePlan,

    isValidApiKeyFormat,
    call,
  };
}

type PaymentServiceResponse<T> =
  // success response
  | { data: T }
  // error response
  | { code: number; status: number; message: string };

type PaymentUserInfo = {
  id: string;
  type: string;
  attributes: {
    total_credits: number;
    remaining_credits: number;
    stripe_customers: Array<{ id: string; email: string; created: number }>;
  };
};

type PaymentProduct = Array<{
  id: string;
  type: string;
  attributes: {
    name: string;
    description: string;
    metadata: {
      index: string;
      price_on?: string;
    };
    stripe_prices?: Array<{
      id: string;
      billing_type: string;
      currency: string;
      metadata: {
        rate_limit: string;
        credit_quota: string;
      };
      nickname: unknown;
      recurring: {
        meter: unknown;
        interval: string;
        usage_type: string;
        interval_count: number;
        trial_period_days: unknown;
      };
      unit_amount: number;
      unit_amount_decimal: string;
    }>;
  };
}>;

type PaymentCheckoutSession = {
  id: string;
  type: string;
  attributes: {
    amount_subtotal: number;
    amount_total: number;
    created: number;
    expires_at: number;
    url: string;
    status: string;
    subscription_uid: unknown;
    customer_uid: unknown;
  };
};

type PaymentSubscription = {
  id: string;
  type: string;
  attributes: {
    customer_uid: string;
    current_period_start: number;
    current_period_end: number;
    cancel_at: string | null;
    canceled_at: string | null;
    cancel_at_period_end: boolean;
    status: string;
    stripe_price: {
      id: number;
      nickname: string | null;
      price_uid: string;
      product_uid: string;
      active: boolean;
      created: number;
      currency: string;
      metadata: {
        credit_quota: string;
        rate_limit: string;
      };
      unit_amount: number;
      unit_amount_decimal: string;
      billing_type: string;
      livemode: boolean;
      recurring: {
        meter: unknown;
        interval: string;
        usage_type: string;
        interval_count: number;
        trial_period_days: unknown;
      };
      created_at: string;
      updated_at: string;
    };
    stripe_product: {
      id: number;
      name: string;
      description: string;
      product_uid: string;
      active: boolean;
      default_price_uid: string;
      livemode: boolean;
      created: number;
      updated: number;
      metadata: unknown;
      created_at: string;
      updated_at: string;
    };
  };
};

function isSuccessResponse<T>(res: PaymentServiceResponse<T>): res is { data: T } {
  return 'data' in res;
}

function maskApiKey(apiKey: string): string {
  return apiKey.slice(0, 4) + '...' + apiKey.slice(-4);
}
