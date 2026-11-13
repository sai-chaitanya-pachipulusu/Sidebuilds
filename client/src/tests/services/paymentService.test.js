import axios from 'axios';
import toast from 'react-hot-toast';
import { PaymentService } from '../../services/paymentService';

jest.mock('axios', () => ({
  __esModule: true,
  default: {
    create: jest.fn(() => ({
      interceptors: {
        request: { use: jest.fn() },
        response: { use: jest.fn() },
      },
      get: jest.fn().mockResolvedValue({ data: {} }),
      post: jest.fn(),
      request: jest.fn(),
    })),
  },
}));

jest.mock('react-hot-toast', () => ({
  __esModule: true,
  default: {
    loading: jest.fn(),
    success: jest.fn(),
    error: jest.fn(),
    dismiss: jest.fn(),
  },
}));

describe('PaymentService', () => {
  let service;

  beforeEach(() => {
    axios.create.mockReturnValue({
      interceptors: {
        request: { use: jest.fn() },
        response: { use: jest.fn() },
      },
      get: jest.fn().mockResolvedValue({ data: {} }),
      post: jest.fn(),
      request: jest.fn(),
    });
    service = new PaymentService();
  });

  it('creates an API client with a finite payment timeout', () => {
    expect(axios.create).toHaveBeenCalledWith(expect.objectContaining({ timeout: 30000 }));
    expect(service.apiClient).toBeDefined();
  });

  it('only advertises providers the server implements', () => {
    expect(Object.keys(service.providers)).toEqual(['STRIPE']);
  });

  it('updates provider health from the server response', async () => {
    service.apiClient.get.mockResolvedValueOnce({
      data: { providers: { stripe: { status: 'maintenance', responseTime: 250 } } },
    });
    await service.performHealthCheck();
    expect(service.providers.STRIPE).toEqual(expect.objectContaining({
      status: 'maintenance',
      responseTime: 250,
    }));
  });

  it('rejects unavailable payment providers before checkout', async () => {
    service.providers.STRIPE.status = 'maintenance';
    await expect(service.validateCheckoutRequest('42', 'stripe'))
      .rejects.toThrow('stripe is currently unavailable');
  });

  it('requires a purchase request id for checkout', async () => {
    await expect(service.validateCheckoutRequest(undefined, 'stripe'))
      .rejects.toThrow('Purchase request ID is required');
  });

  it('creates a Stripe checkout session against the real endpoint', async () => {
    global.crypto = { randomUUID: jest.fn(() => 'test-uuid') };
    service.apiClient.post.mockResolvedValueOnce({
      data: { url: 'https://checkout.stripe.com/c/pay/test', sessionId: 'cs_test_1' },
    });
    const result = await service.createStripeCheckout('42', { agreementId: 'approved-version' });
    expect(service.apiClient.post).toHaveBeenCalledWith(
      '/payments/create-checkout-session',
      expect.objectContaining({ purchase_request_id: '42', agreement_id: 'approved-version' }),
      expect.objectContaining({ headers: expect.objectContaining({ 'Idempotency-Key': expect.any(String) }) }),
    );
    expect(result).toEqual(expect.objectContaining({
      provider: 'stripe',
      checkout_url: expect.stringContaining('checkout.stripe.com'),
    }));
    expect(toast.dismiss).toHaveBeenCalled();
  });

  it('normalizes legacy checkout_url responses', async () => {
    global.crypto = { randomUUID: jest.fn(() => 'test-uuid') };
    service.apiClient.post.mockResolvedValueOnce({
      data: { checkout_url: 'https://checkout.stripe.com/c/pay/legacy' },
    });
    const result = await service.createStripeCheckout('42', { agreementId: 'approved-version' });
    expect(result.checkout_url).toBe('https://checkout.stripe.com/c/pay/legacy');
  });

  it('requires an approved agreement before any checkout network call', async () => {
    await expect(service.createStripeCheckout('42')).rejects.toThrow('purchase agreement');
    await expect(service.createCheckout({ projectId: 'project-a' })).rejects.toThrow('purchase agreement');
    expect(service.apiClient.post).not.toHaveBeenCalled();
  });

  it('does not retry checkout session creation that could create duplicate payments', () => {
    expect(service.shouldRetryRequest(
      { response: { status: 503 } },
      { url: '/payments/create-checkout-session', attempt: 1 },
    )).toBe(false);
    expect(service.shouldRetryRequest(
      { response: { status: 503 } },
      { url: '/purchase-requests/projects/1/initiate-checkout', attempt: 1 },
    )).toBe(false);
  });

  it('surfaces server error messages to users', () => {
    expect(service.getStripeErrorMessage({
      response: { data: { code: 'card_declined' } },
    })).toContain('card was declined');
    expect(service.getStripeErrorMessage({
      response: { status: 400, data: { error: 'This project is currently on hold.' } },
    })).toContain('currently on hold');
    expect(service.getStripeErrorMessage({ response: { status: 503 } }))
      .toContain('temporarily unavailable');
  });

  it('formats transaction amounts consistently', () => {
    expect(service.formatAmount(1250)).toBe('$1,250.00');
  });
});
