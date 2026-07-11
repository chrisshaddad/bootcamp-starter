import { baseApi } from '@/store/api/base-api';
import type {
  ApiEnvelope,
  CreateWorkOrderBody,
  PatchWorkOrderBody,
  WorkOrderResponse,
} from '@/types/api';

function unwrap<TData>(response: TData | ApiEnvelope<TData>): TData {
  return response && typeof response === 'object' && 'data' in response
    ? (response as ApiEnvelope<TData>).data
    : (response as TData);
}

type MaintenanceRequestScope = { maintenanceRequestId: string };

export const workOrdersApi = baseApi.injectEndpoints({
  endpoints: (build) => ({
    listWorkOrders: build.query<WorkOrderResponse[], MaintenanceRequestScope>({
      query: ({ maintenanceRequestId }) => ({
        url: `/maintenance-requests/${encodeURIComponent(maintenanceRequestId)}/work-orders`,
        method: 'GET',
      }),
      transformResponse: (
        response: WorkOrderResponse[] | ApiEnvelope<WorkOrderResponse[]>,
      ) => unwrap(response),
      providesTags: (result) =>
        result
          ? [
              ...result.map(({ id }) => ({ type: 'WorkOrder' as const, id })),
              { type: 'WorkOrder', id: 'LIST' },
            ]
          : [{ type: 'WorkOrder', id: 'LIST' }],
    }),

    getWorkOrder: build.query<
      WorkOrderResponse,
      MaintenanceRequestScope & { workOrderId: string }
    >({
      query: ({ maintenanceRequestId, workOrderId }) => ({
        url: `/maintenance-requests/${encodeURIComponent(maintenanceRequestId)}/work-orders/${encodeURIComponent(workOrderId)}`,
        method: 'GET',
      }),
      transformResponse: (
        response: WorkOrderResponse | ApiEnvelope<WorkOrderResponse>,
      ) => unwrap(response),
      providesTags: (_result, _error, { workOrderId }) => [
        { type: 'WorkOrder', id: workOrderId },
      ],
    }),

    createWorkOrder: build.mutation<
      WorkOrderResponse,
      MaintenanceRequestScope & { body: CreateWorkOrderBody }
    >({
      query: ({ maintenanceRequestId, body }) => ({
        url: `/maintenance-requests/${encodeURIComponent(maintenanceRequestId)}/work-orders`,
        method: 'POST',
        body,
      }),
      transformResponse: (
        response: WorkOrderResponse | ApiEnvelope<WorkOrderResponse>,
      ) => unwrap(response),
      invalidatesTags: (_result, _error, { maintenanceRequestId }) => [
        { type: 'WorkOrder', id: 'LIST' },
        { type: 'MaintenanceRequest', id: maintenanceRequestId },
        'Timeline',
      ],
    }),

    updateWorkOrder: build.mutation<
      WorkOrderResponse,
      MaintenanceRequestScope & {
        workOrderId: string;
        body: PatchWorkOrderBody;
      }
    >({
      query: ({ maintenanceRequestId, workOrderId, body }) => ({
        url: `/maintenance-requests/${encodeURIComponent(maintenanceRequestId)}/work-orders/${encodeURIComponent(workOrderId)}`,
        method: 'PATCH',
        body,
      }),
      transformResponse: (
        response: WorkOrderResponse | ApiEnvelope<WorkOrderResponse>,
      ) => unwrap(response),
      invalidatesTags: (
        _result,
        _error,
        { maintenanceRequestId, workOrderId },
      ) => [
        { type: 'WorkOrder', id: workOrderId },
        { type: 'WorkOrder', id: 'LIST' },
        { type: 'MaintenanceRequest', id: maintenanceRequestId },
        'Timeline',
      ],
    }),

    deleteWorkOrder: build.mutation<
      { id: string },
      MaintenanceRequestScope & { workOrderId: string }
    >({
      query: ({ maintenanceRequestId, workOrderId }) => ({
        url: `/maintenance-requests/${encodeURIComponent(maintenanceRequestId)}/work-orders/${encodeURIComponent(workOrderId)}`,
        method: 'DELETE',
      }),
      transformResponse: (
        response: { id: string } | ApiEnvelope<{ id: string }>,
      ) => unwrap(response),
      invalidatesTags: (
        _result,
        _error,
        { maintenanceRequestId, workOrderId },
      ) => [
        { type: 'WorkOrder', id: workOrderId },
        { type: 'WorkOrder', id: 'LIST' },
        { type: 'MaintenanceRequest', id: maintenanceRequestId },
        'Timeline',
      ],
    }),
  }),
});

export const {
  useListWorkOrdersQuery,
  useGetWorkOrderQuery,
  useCreateWorkOrderMutation,
  useUpdateWorkOrderMutation,
  useDeleteWorkOrderMutation,
} = workOrdersApi;
