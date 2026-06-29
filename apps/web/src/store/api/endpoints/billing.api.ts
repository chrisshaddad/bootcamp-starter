import { baseApi } from '@/store/api/base-api';
import type {
  ApiEnvelope,
  CheckoutSessionResponse,
  ConfirmCheckoutResponse,
  PortalSessionResponse,
  SubscriptionResponse,
} from '@/types/api';
import type { PlanKey } from '@/app/[lang]/(public)/_sections/pricing-section';

function unwrap<TData>(response: TData | ApiEnvelope<TData>): TData {
  return response && typeof response === 'object' && 'data' in response
    ? (response as ApiEnvelope<TData>).data
    : (response as TData);
}

export const billingApi = baseApi.injectEndpoints({
  endpoints: (build) => ({
    getSubscription: build.query<SubscriptionResponse, void>({
      query: () => ({ url: '/billing/subscription', method: 'GET' }),
      transformResponse: (
        response: SubscriptionResponse | ApiEnvelope<SubscriptionResponse>,
      ) => unwrap(response),
      providesTags: ['Subscription'],
    }),

    /**
     * Create a Stripe embedded-checkout session.
     * Body: { planKey } — backend resolves Stripe price and stores planKey in metadata.
     * Returns { clientSecret } — pass to EmbeddedCheckout.
     */
    createCheckoutSession: build.mutation<
      CheckoutSessionResponse,
      { planKey: PlanKey; locale?: string }
    >({
      query: (body) => ({
        url: '/billing/checkout-session',
        method: 'POST',
        body,
      }),
      transformResponse: (
        response:
          CheckoutSessionResponse | ApiEnvelope<CheckoutSessionResponse>,
      ) => unwrap(response),
      invalidatesTags: ['Subscription', 'Org', 'Payment', 'Timeline'],
    }),

    /**
     * Confirm a completed Stripe checkout session.
     * Body: { sessionId } — backend verifies payment, activates org, assigns realm role.
     * Returns { status: "active", planKey, role: "org_admin" }.
     */
    confirmCheckoutSession: build.mutation<
      ConfirmCheckoutResponse,
      { sessionId: string }
    >({
      query: (body) => ({ url: '/billing/confirm', method: 'POST', body }),
      transformResponse: (
        response:
          ConfirmCheckoutResponse | ApiEnvelope<ConfirmCheckoutResponse>,
      ) => unwrap(response),
      invalidatesTags: ['Subscription', 'Org', 'Payment', 'Timeline'],
    }),

    /**
     * Create a Stripe Billing Portal session.
     * Returns { url } — redirect the user to it.
     */
    createPortalSession: build.mutation<PortalSessionResponse, void>({
      query: () => ({ url: '/billing/portal-session', method: 'POST' }),
      transformResponse: (
        response: PortalSessionResponse | ApiEnvelope<PortalSessionResponse>,
      ) => unwrap(response),
      invalidatesTags: ['Subscription', 'Org', 'Payment', 'Timeline'],
    }),
  }),
});

export const {
  useGetSubscriptionQuery,
  useCreateCheckoutSessionMutation,
  useConfirmCheckoutSessionMutation,
  useCreatePortalSessionMutation,
} = billingApi;
