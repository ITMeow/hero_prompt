import {
  CheckoutSession,
  PaymentConfigs,
  PaymentEvent,
  PaymentOrder,
  PaymentProvider,
  PaymentSession,
  PaymentStatus,
  PaymentType,
} from './types';

/**
 * PayPal payment provider configs
 * @docs https://developer.paypal.com/docs/
 */
export interface PayPalConfigs extends PaymentConfigs {
  clientId: string;
  clientSecret: string;
  webhookSecret?: string;
  environment?: 'sandbox' | 'production';
}

/**
 * PayPal payment provider implementation
 * @website https://www.paypal.com/
 */
export class PayPalProvider implements PaymentProvider {
  readonly name = 'paypal';
  configs: PayPalConfigs;

  private baseUrl: string;
  private accessToken?: string;
  private tokenExpiry?: number;

  constructor(configs: PayPalConfigs) {
    this.configs = configs;
    this.baseUrl =
      configs.environment === 'production'
        ? 'https://api-m.paypal.com'
        : 'https://api-m.sandbox.paypal.com';
  }

  // create payment
  async createPayment({
    order,
  }: {
    order: PaymentOrder;
  }): Promise<CheckoutSession> {
    try {
      await this.ensureAccessToken();

      if (!order.price) {
        throw new Error('price is required');
      }

      const items = [
        {
          name: order.description || 'Payment',
          unit_amount: {
            currency_code: order.price.currency.toUpperCase(),
            value: (order.price.amount / 100).toFixed(2), // unit: dollars
          },
          quantity: '1',
        },
      ];

      const totalAmount = items.reduce(
        (sum, item) => sum + parseFloat(item.unit_amount.value),
        0
      );

      const payload = {
        intent: 'CAPTURE',
        purchase_units: [
          {
            items,
            amount: {
              currency_code: order.price.currency.toUpperCase(),
              value: totalAmount.toFixed(2),
              breakdown: {
                item_total: {
                  currency_code: order.price.currency.toUpperCase(),
                  value: totalAmount.toFixed(2),
                },
              },
            },
          },
        ],
        application_context: {
          return_url: order.successUrl,
          cancel_url: order.cancelUrl,
          user_action: 'PAY_NOW',
        },
      };

      const result = await this.makeRequest(
        '/v2/checkout/orders',
        'POST',
        payload
      );

      if (result.error) {
        throw new Error(
          result.error.message || 'PayPal payment creation failed'
        );
      }

      const approvalUrl = result.links?.find(
        (link: any) => link.rel === 'approve'
      )?.href;

      return {
        provider: this.name,
        checkoutParams: payload,
        checkoutInfo: {
          sessionId: result.id,
          checkoutUrl: approvalUrl,
        },
        checkoutResult: result,
        metadata: order.metadata || {},
      };
    } catch (error) {
      throw error;
    }
  }

  async createSubscriptionPayment(
    order: PaymentOrder
  ): Promise<CheckoutSession> {
    try {
      await this.ensureAccessToken();

      if (!order.plan) {
        throw new Error('plan is required');
      }

      // First create a product
      const productPayload = {
        name: order.plan.name,
        description: order.plan.description,
        type: 'SERVICE',
        category: 'SOFTWARE',
      };

      const productResponse = await this.makeRequest(
        '/v1/catalogs/products',
        'POST',
        productPayload
      );

      if (productResponse.error) {
        throw new Error(
          productResponse.error.message || 'PayPal product creation failed'
        );
      }

      // Create a billing plan
      const planPayload = {
        product_id: productResponse.id,
        name: order.plan.name,
        description: order.plan.description,
        billing_cycles: [
          {
            frequency: {
              interval_unit: order.plan.interval.toUpperCase(),
              interval_count: order.plan.intervalCount || 1,
            },
            tenure_type: 'REGULAR',
            sequence: 1,
            total_cycles: 0, // Infinite
            pricing_scheme: {
              fixed_price: {
                value: order.price?.amount.toFixed(2),
                currency_code: order.price?.currency.toUpperCase(),
              },
            },
          },
        ],
        payment_preferences: {
          auto_bill_outstanding: true,
          setup_fee_failure_action: 'CONTINUE',
          payment_failure_threshold: 3,
        },
      };

      // Add trial period if specified
      if (order.plan?.trialPeriodDays) {
        planPayload.billing_cycles.unshift({
          frequency: {
            interval_unit: 'DAY',
            interval_count: 1,
          },
          tenure_type: 'TRIAL',
          sequence: 0,
          total_cycles: order.plan?.trialPeriodDays || 0,
          pricing_scheme: {
            fixed_price: {
              value: '0.00',
              currency_code: order.price?.currency.toUpperCase(),
            },
          },
        });
      }

      const planResponse = await this.makeRequest(
        '/v1/billing/plans',
        'POST',
        planPayload
      );

      if (planResponse.error) {
        throw new Error(
          planResponse.error.message || 'PayPal plan creation failed'
        );
      }

      // Create subscription
      const subscriptionPayload = {
        plan_id: planResponse.id,
        subscriber: {
          email_address: order.customer?.email,
          name: order.customer?.name
            ? {
                given_name: order.customer?.name.split(' ')[0],
                surname: order.customer?.name.split(' ').slice(1).join(' '),
              }
            : undefined,
        },
        application_context: {
          brand_name: 'Your Brand',
          locale: 'en-US',
          shipping_preference: 'NO_SHIPPING',
          user_action: 'SUBSCRIBE_NOW',
          payment_method: {
            payer_selected: 'PAYPAL',
            payee_preferred: 'IMMEDIATE_PAYMENT_REQUIRED',
          },
          return_url: order.successUrl,
          cancel_url: order.cancelUrl,
        },
      };

      const subscriptionResponse = await this.makeRequest(
        '/v1/billing/subscriptions',
        'POST',
        subscriptionPayload
      );

      if (subscriptionResponse.error) {
        throw new Error(
          subscriptionResponse.error.message ||
            'PayPal subscription creation failed'
        );
      }

      const approvalUrl = subscriptionResponse.links?.find(
        (link: any) => link.rel === 'approve'
      )?.href;

      return {
        provider: this.name,
        checkoutParams: subscriptionPayload,
        checkoutInfo: {
          sessionId: subscriptionResponse.id,
          checkoutUrl: approvalUrl,
        },
        checkoutResult: subscriptionResponse,
        metadata: order.metadata || {},
      };
    } catch (error) {
      throw error;
    }
  }

  async getPaymentSession({
    sessionId,
  }: {
    sessionId?: string;
  }): Promise<PaymentSession> {
    try {
      if (!sessionId) {
        throw new Error('sessionId is required');
      }

      await this.ensureAccessToken();

      // Try to get as order first, then as subscription
      let result = await this.makeRequest(
        `/v2/checkout/orders/${sessionId}`,
        'GET'
      );

      if (result.error && result.error.name === 'RESOURCE_NOT_FOUND') {
        // Try as subscription
        result = await this.makeRequest(
          `/v1/billing/subscriptions/${sessionId}`,
          'GET'
        );
      }

      if (result.error) {
        throw new Error(result.error.message || 'get payment failed');
      }

      return {
        provider: this.name,
        paymentStatus: this.mapPayPalStatus(result.status),
        paymentInfo: {
          discountCode: '',
          discountAmount: undefined,
          discountCurrency: undefined,
          paymentAmount: result.amount,
          paymentCurrency: result.currency,
          paymentEmail: result.customer_email,
          paidAt: new Date(),
        },
        paymentResult: result,
        metadata: result.metadata,
      };
    } catch (error) {
      throw error;
    }
  }

  async getPaymentEvent({ req }: { req: Request }): Promise<PaymentEvent> {
    try {
      const rawBody = await req.text();
      const signature = req.headers.get('paypal-signature') as string;
      const headers = Object.fromEntries(req.headers.entries());

      if (!this.configs.webhookSecret) {
        throw new Error('webhookSecret not configured');
      }

      const event = JSON.parse(rawBody);
      if (!event || !event.event_type) {
        throw new Error('Invalid webhook payload');
      }

      // verify webhook with PayPal (simplified verification)
      await this.ensureAccessToken();

      const verifyPayload = {
        auth_algo: headers?.['paypal-auth-algo'],
        cert_id: headers?.['paypal-cert-id'],
        transmission_id: headers?.['paypal-transmission-id'],
        transmission_sig: headers?.['paypal-transmission-sig'],
        transmission_time: headers?.['paypal-transmission-time'],
        webhook_id: this.configs.webhookSecret,
        webhook_event: event,
      };

      const verifyResponse = await this.makeRequest(
        '/v1/notifications/verify-webhook-signature',
        'POST',
        verifyPayload
      );

      if (verifyResponse.verification_status !== 'SUCCESS') {
        throw new Error('Invalid webhook signature');
      }

      // Process the webhook event
      console.log(`PayPal webhook event: ${event.event_type}`, event.resource);

      return {
        eventType: event.event_type,
        eventResult: event,
        paymentSession: undefined,
      };
    } catch (error) {
      throw error;
    }
  }

  private async ensureAccessToken() {
    if (this.accessToken && this.tokenExpiry && Date.now() < this.tokenExpiry) {
      return;
    }

    const credentials = Buffer.from(
      `${this.configs.clientId}:${this.configs.clientSecret}`
    ).toString('base64');

    const response = await fetch(`${this.baseUrl}/v1/oauth2/token`, {
      method: 'POST',
      headers: {
        Authorization: `Basic ${credentials}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: 'grant_type=client_credentials',
    });

    const data = await response.json();

    if (data.error) {
      throw new Error(
        `PayPal authentication failed: ${data.error_description}`
      );
    }

    this.accessToken = data.access_token;
    this.tokenExpiry = Date.now() + data.expires_in * 1000;
  }

  private async makeRequest(endpoint: string, method: string, data?: any) {
    const url = `${this.baseUrl}${endpoint}`;
    const headers: Record<string, string> = {
      Authorization: `Bearer ${this.accessToken}`,
      'Content-Type': 'application/json',
    };

    const config: RequestInit = {
      method,
      headers,
    };

    if (data) {
      config.body = JSON.stringify(data);
    }

    const response = await fetch(url, config);
    if (!response.ok) {
      const result = await response.json();
      let errorMessage = result.name;
      if (result.details) {
        errorMessage += `: ${result.details
          .map((detail: any) => detail.issue)
          .join(', ')}`;
      }
      throw new Error(`PayPal request failed: ${errorMessage}`);
    }

    return await response.json();
  }

  private mapPayPalStatus(status: string): PaymentStatus {
    switch (status) {
      case 'CREATED':
      case 'SAVED':
      case 'APPROVED':
        return PaymentStatus.PROCESSING;
      case 'COMPLETED':
      case 'ACTIVE':
        return PaymentStatus.SUCCESS;
      case 'CANCELED':
      case 'EXPIRED':
        return PaymentStatus.CANCELED;
      case 'SUSPENDED':
        return PaymentStatus.FAILED;
      default:
        return PaymentStatus.PROCESSING;
    }
  }
}

/**
 * Create PayPal provider with configs
 */
export function createPayPalProvider(configs: PayPalConfigs): PayPalProvider {
  return new PayPalProvider(configs);
}
