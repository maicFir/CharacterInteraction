'use client';
import { useCallback } from 'react';
import useSWR, { type SWRConfiguration } from 'swr';
import useSWRMutation from 'swr/mutation';
import { httpClient } from './http-client';

export function useFetch<T>(path: string | null, options: SWRConfiguration<T> = {}) {
  const query = useSWR<T, Error>(path, (url) => httpClient.json<T>(url), {
    revalidateOnFocus: false,
    shouldRetryOnError: false,
    ...options,
  });
  return { ...query, refresh: query.mutate };
}

/** Manual operations never run on mount/focus and never cache audio or tokens. */
export function useMutation<Argument, Result>(
  key: string,
  action: (argument: Argument) => Promise<Result>,
) {
  const {
    trigger: mutate,
    isMutating,
    error,
  } = useSWRMutation<Result, Error, string, { input: Argument }>(
    key,
    (_, { arg }) => action(arg.input),
    { populateCache: false, throwOnError: true },
  );
  const trigger = useCallback(
    (argument: Argument) => mutate({ input: argument }, { throwOnError: true }),
    [mutate],
  );
  return { trigger, loading: isMutating, error };
}
