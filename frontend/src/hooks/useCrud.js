import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { api } from '../lib/api';

function toArray(payload) {
  if (Array.isArray(payload)) {
    return payload;
  }

  if (payload && Array.isArray(payload.rows)) {
    return payload.rows;
  }

  return [];
}

function toSingle(payload) {
  if (Array.isArray(payload)) {
    return payload[0] ?? null;
  }

  return payload ?? null;
}

function sanitizeEntity(entityName) {
  return entityName.replace(/^\/+|\/+$/g, '');
}

export function useCrud(entityName, config = {}) {
  const queryClient = useQueryClient();
  const entity = sanitizeEntity(entityName);
  const baseKey = [entity];
  const getListPath = config.listPath || (() => `/${entity}`);
  const getOnePath = config.getOnePath || ((id) => `/${entity}/${id}`);
  const getCreatePath = config.createPath || (() => `/${entity}`);
  const getUpdatePath = config.updatePath || ((id) => `/${entity}/${id}`);
  const getDeletePath = config.deletePath || ((id) => `/${entity}/${id}`);
  const mapCreatePayload = config.mapCreatePayload || ((payload) => payload);
  const mapUpdatePayload = config.mapUpdatePayload || ((payload) => payload);

  const list = (params = {}, options = {}) =>
    useQuery({
      queryKey: [...baseKey, 'list', params],
      queryFn: async () => {
        const response = await api.get(getListPath(params), { params });
        return toArray(response.payload);
      },
      ...options,
    });

  const getOne = (id, options = {}) =>
    useQuery({
      queryKey: [...baseKey, 'one', id],
      enabled: Boolean(id) && (options.enabled ?? true),
      queryFn: async () => {
        const response = await api.get(getOnePath(id));
        return toSingle(response.payload);
      },
      ...options,
    });

  const invalidateEntity = () => {
    queryClient.invalidateQueries({ queryKey: baseKey });
  };

  const create = () =>
    useMutation({
      mutationFn: async (payload) => {
        const response = await api.post(getCreatePath(payload), mapCreatePayload(payload));
        return response;
      },
      onSuccess: (response) => {
        toast.success(response.message || 'Created successfully');
        invalidateEntity();
      },
      onError: (error) => {
        toast.error(error.message || 'Create failed');
      },
    });

  const update = () =>
    useMutation({
      mutationFn: async ({ id, payload, method = 'patch' }) => {
        const endpoint = getUpdatePath(id, payload);
        const mappedPayload = mapUpdatePayload(payload);
        const response =
          method.toLowerCase() === 'put'
            ? await api.put(endpoint, mappedPayload)
            : await api.patch(endpoint, mappedPayload);

        return response;
      },
      onSuccess: (response) => {
        toast.success(response.message || 'Updated successfully');
        invalidateEntity();
      },
      onError: (error) => {
        toast.error(error.message || 'Update failed');
      },
    });

  const remove = () =>
    useMutation({
      mutationFn: async (id) => {
        const response = await api.delete(getDeletePath(id));
        return response;
      },
      onSuccess: (response) => {
        toast.success(response.message || 'Deleted successfully');
        invalidateEntity();
      },
      onError: (error) => {
        toast.error(error.message || 'Delete failed');
      },
    });

  return {
    list,
    getOne,
    create,
    update,
    remove,
  };
}
