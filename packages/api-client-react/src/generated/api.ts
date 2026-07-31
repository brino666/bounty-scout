/**
 * React Query hooks for the HackerOne Scout API.
 * Hand-maintained in the same shape orval's react-query client produces;
 * mirrors workspace-api-spec/openapi.yaml's bounty paths.
 */
import {
  useMutation,
  useQuery
} from '@tanstack/react-query';
import type {
  MutationFunction,
  QueryFunction,
  QueryKey,
  UseMutationOptions,
  UseMutationResult,
  UseQueryOptions,
  UseQueryResult
} from '@tanstack/react-query';

import type {
  AnalyseStatus,
  BountyStats,
  DraftStatus,
  ErrorResponse,
  Finding,
  FindingInput,
  FindingUpdate,
  OkResult,
  Program,
  ProgramInput,
  ScoutStatus
} from './api.schemas';

import { customFetch } from '../custom-fetch';
import type { ErrorType, BodyType } from '../custom-fetch';

type AwaitedInput<T> = PromiseLike<T> | T;
type Awaited<O> = O extends AwaitedInput<infer T> ? T : never;
type SecondParameter<T extends (...args: never) => unknown> = Parameters<T>[1];

const withQueryKey = <T extends object, K>(query: T, queryKey: K): T & { queryKey: K } => {
  const result = { queryKey } as T & { queryKey: K };
  for (const key of Object.keys(query)) {
    if (key === 'queryKey') continue;
    Object.defineProperty(result, key, {
      enumerable: true,
      configurable: true,
      get: () => (query as Record<string, unknown>)[key],
    });
  }
  return result;
};

// ---------------------------------------------------------------------------
// GET /bounty/stats
// ---------------------------------------------------------------------------

export const getGetBountyStatsUrl = () => `/api/bounty/stats`;

export const getBountyStats = async (options?: RequestInit): Promise<BountyStats> =>
  customFetch<BountyStats>(getGetBountyStatsUrl(), { ...options, method: 'GET' });

export const getGetBountyStatsQueryKey = () => [`/api/bounty/stats`] as const;

export const getGetBountyStatsQueryOptions = <TData = Awaited<ReturnType<typeof getBountyStats>>, TError = ErrorType<unknown>>(
  options?: { query?: Partial<UseQueryOptions<Awaited<ReturnType<typeof getBountyStats>>, TError, TData>>, request?: SecondParameter<typeof customFetch> }
) => {
  const { query: queryOptions, request: requestOptions } = options ?? {};
  const queryKey = queryOptions?.queryKey ?? getGetBountyStatsQueryKey();
  const queryFn: QueryFunction<Awaited<ReturnType<typeof getBountyStats>>> = ({ signal }) => getBountyStats({ signal, ...requestOptions });
  return { queryKey, queryFn, ...queryOptions } as UseQueryOptions<Awaited<ReturnType<typeof getBountyStats>>, TError, TData> & { queryKey: QueryKey };
};

export function useGetBountyStats<TData = Awaited<ReturnType<typeof getBountyStats>>, TError = ErrorType<unknown>>(
  options?: { query?: Partial<UseQueryOptions<Awaited<ReturnType<typeof getBountyStats>>, TError, TData>>, request?: SecondParameter<typeof customFetch> }
): UseQueryResult<TData, TError> & { queryKey: QueryKey } {
  const queryOptions = getGetBountyStatsQueryOptions(options);
  const query = useQuery(queryOptions) as UseQueryResult<TData, TError> & { queryKey: QueryKey };
  return withQueryKey(query, queryOptions.queryKey);
}

// ---------------------------------------------------------------------------
// GET /bounty/analyse-status
// ---------------------------------------------------------------------------

export const getGetAnalyseStatusUrl = () => `/api/bounty/analyse-status`;

export const getAnalyseStatus = async (options?: RequestInit): Promise<AnalyseStatus> =>
  customFetch<AnalyseStatus>(getGetAnalyseStatusUrl(), { ...options, method: 'GET' });

export const getGetAnalyseStatusQueryKey = () => [`/api/bounty/analyse-status`] as const;

export const getGetAnalyseStatusQueryOptions = <TData = Awaited<ReturnType<typeof getAnalyseStatus>>, TError = ErrorType<unknown>>(
  options?: { query?: Partial<UseQueryOptions<Awaited<ReturnType<typeof getAnalyseStatus>>, TError, TData>>, request?: SecondParameter<typeof customFetch> }
) => {
  const { query: queryOptions, request: requestOptions } = options ?? {};
  const queryKey = queryOptions?.queryKey ?? getGetAnalyseStatusQueryKey();
  const queryFn: QueryFunction<Awaited<ReturnType<typeof getAnalyseStatus>>> = ({ signal }) => getAnalyseStatus({ signal, ...requestOptions });
  return { queryKey, queryFn, ...queryOptions } as UseQueryOptions<Awaited<ReturnType<typeof getAnalyseStatus>>, TError, TData> & { queryKey: QueryKey };
};

export function useGetAnalyseStatus<TData = Awaited<ReturnType<typeof getAnalyseStatus>>, TError = ErrorType<unknown>>(
  options?: { query?: Partial<UseQueryOptions<Awaited<ReturnType<typeof getAnalyseStatus>>, TError, TData>>, request?: SecondParameter<typeof customFetch> }
): UseQueryResult<TData, TError> & { queryKey: QueryKey } {
  const queryOptions = getGetAnalyseStatusQueryOptions(options);
  const query = useQuery(queryOptions) as UseQueryResult<TData, TError> & { queryKey: QueryKey };
  return withQueryKey(query, queryOptions.queryKey);
}

// ---------------------------------------------------------------------------
// GET /bounty/draft-status
// ---------------------------------------------------------------------------

export const getGetDraftStatusUrl = () => `/api/bounty/draft-status`;

export const getDraftStatus = async (options?: RequestInit): Promise<DraftStatus> =>
  customFetch<DraftStatus>(getGetDraftStatusUrl(), { ...options, method: 'GET' });

export const getGetDraftStatusQueryKey = () => [`/api/bounty/draft-status`] as const;

export const getGetDraftStatusQueryOptions = <TData = Awaited<ReturnType<typeof getDraftStatus>>, TError = ErrorType<unknown>>(
  options?: { query?: Partial<UseQueryOptions<Awaited<ReturnType<typeof getDraftStatus>>, TError, TData>>, request?: SecondParameter<typeof customFetch> }
) => {
  const { query: queryOptions, request: requestOptions } = options ?? {};
  const queryKey = queryOptions?.queryKey ?? getGetDraftStatusQueryKey();
  const queryFn: QueryFunction<Awaited<ReturnType<typeof getDraftStatus>>> = ({ signal }) => getDraftStatus({ signal, ...requestOptions });
  return { queryKey, queryFn, ...queryOptions } as UseQueryOptions<Awaited<ReturnType<typeof getDraftStatus>>, TError, TData> & { queryKey: QueryKey };
};

export function useGetDraftStatus<TData = Awaited<ReturnType<typeof getDraftStatus>>, TError = ErrorType<unknown>>(
  options?: { query?: Partial<UseQueryOptions<Awaited<ReturnType<typeof getDraftStatus>>, TError, TData>>, request?: SecondParameter<typeof customFetch> }
): UseQueryResult<TData, TError> & { queryKey: QueryKey } {
  const queryOptions = getGetDraftStatusQueryOptions(options);
  const query = useQuery(queryOptions) as UseQueryResult<TData, TError> & { queryKey: QueryKey };
  return withQueryKey(query, queryOptions.queryKey);
}

// ---------------------------------------------------------------------------
// GET /bounty/scout/status, POST /bounty/scout/run
// ---------------------------------------------------------------------------

export const getGetScoutStatusUrl = () => `/api/bounty/scout/status`;

export const getScoutStatus = async (options?: RequestInit): Promise<ScoutStatus> =>
  customFetch<ScoutStatus>(getGetScoutStatusUrl(), { ...options, method: 'GET' });

export const getGetScoutStatusQueryKey = () => [`/api/bounty/scout/status`] as const;

export const getGetScoutStatusQueryOptions = <TData = Awaited<ReturnType<typeof getScoutStatus>>, TError = ErrorType<unknown>>(
  options?: { query?: Partial<UseQueryOptions<Awaited<ReturnType<typeof getScoutStatus>>, TError, TData>>, request?: SecondParameter<typeof customFetch> }
) => {
  const { query: queryOptions, request: requestOptions } = options ?? {};
  const queryKey = queryOptions?.queryKey ?? getGetScoutStatusQueryKey();
  const queryFn: QueryFunction<Awaited<ReturnType<typeof getScoutStatus>>> = ({ signal }) => getScoutStatus({ signal, ...requestOptions });
  return { queryKey, queryFn, ...queryOptions } as UseQueryOptions<Awaited<ReturnType<typeof getScoutStatus>>, TError, TData> & { queryKey: QueryKey };
};

export function useGetScoutStatus<TData = Awaited<ReturnType<typeof getScoutStatus>>, TError = ErrorType<unknown>>(
  options?: { query?: Partial<UseQueryOptions<Awaited<ReturnType<typeof getScoutStatus>>, TError, TData>>, request?: SecondParameter<typeof customFetch> }
): UseQueryResult<TData, TError> & { queryKey: QueryKey } {
  const queryOptions = getGetScoutStatusQueryOptions(options);
  const query = useQuery(queryOptions) as UseQueryResult<TData, TError> & { queryKey: QueryKey };
  return withQueryKey(query, queryOptions.queryKey);
}

export const getRunScoutUrl = () => `/api/bounty/scout/run`;

export const runScout = async (options?: RequestInit): Promise<OkResult> =>
  customFetch<OkResult>(getRunScoutUrl(), { ...options, method: 'POST' });

export const getRunScoutMutationOptions = <TError = ErrorType<ErrorResponse>, TContext = unknown>(
  options?: { mutation?: UseMutationOptions<Awaited<ReturnType<typeof runScout>>, TError, void, TContext>, request?: SecondParameter<typeof customFetch> }
): UseMutationOptions<Awaited<ReturnType<typeof runScout>>, TError, void, TContext> => {
  const mutationKey = ['runScout'];
  const { mutation: mutationOptions, request: requestOptions } = options
    ? options.mutation && 'mutationKey' in options.mutation && options.mutation.mutationKey
      ? options
      : { ...options, mutation: { ...options.mutation, mutationKey } }
    : { mutation: { mutationKey }, request: undefined };
  const mutationFn: MutationFunction<Awaited<ReturnType<typeof runScout>>, void> = () => runScout(requestOptions);
  return { mutationFn, ...mutationOptions };
};

export const useRunScout = <TError = ErrorType<ErrorResponse>, TContext = unknown>(
  options?: { mutation?: UseMutationOptions<Awaited<ReturnType<typeof runScout>>, TError, void, TContext>, request?: SecondParameter<typeof customFetch> }
): UseMutationResult<Awaited<ReturnType<typeof runScout>>, TError, void, TContext> => {
  return useMutation(getRunScoutMutationOptions(options));
};

// ---------------------------------------------------------------------------
// GET /bounty/programs/pending, /bounty/programs, POST /bounty/programs
// ---------------------------------------------------------------------------

export const getListPendingProgramsUrl = () => `/api/bounty/programs/pending`;

export const listPendingPrograms = async (options?: RequestInit): Promise<Program[]> =>
  customFetch<Program[]>(getListPendingProgramsUrl(), { ...options, method: 'GET' });

export const getListPendingProgramsQueryKey = () => [`/api/bounty/programs/pending`] as const;

export const getListPendingProgramsQueryOptions = <TData = Awaited<ReturnType<typeof listPendingPrograms>>, TError = ErrorType<unknown>>(
  options?: { query?: Partial<UseQueryOptions<Awaited<ReturnType<typeof listPendingPrograms>>, TError, TData>>, request?: SecondParameter<typeof customFetch> }
) => {
  const { query: queryOptions, request: requestOptions } = options ?? {};
  const queryKey = queryOptions?.queryKey ?? getListPendingProgramsQueryKey();
  const queryFn: QueryFunction<Awaited<ReturnType<typeof listPendingPrograms>>> = ({ signal }) => listPendingPrograms({ signal, ...requestOptions });
  return { queryKey, queryFn, ...queryOptions } as UseQueryOptions<Awaited<ReturnType<typeof listPendingPrograms>>, TError, TData> & { queryKey: QueryKey };
};

export function useListPendingPrograms<TData = Awaited<ReturnType<typeof listPendingPrograms>>, TError = ErrorType<unknown>>(
  options?: { query?: Partial<UseQueryOptions<Awaited<ReturnType<typeof listPendingPrograms>>, TError, TData>>, request?: SecondParameter<typeof customFetch> }
): UseQueryResult<TData, TError> & { queryKey: QueryKey } {
  const queryOptions = getListPendingProgramsQueryOptions(options);
  const query = useQuery(queryOptions) as UseQueryResult<TData, TError> & { queryKey: QueryKey };
  return withQueryKey(query, queryOptions.queryKey);
}

export const getListProgramsUrl = () => `/api/bounty/programs`;

export const listPrograms = async (options?: RequestInit): Promise<Program[]> =>
  customFetch<Program[]>(getListProgramsUrl(), { ...options, method: 'GET' });

export const getListProgramsQueryKey = () => [`/api/bounty/programs`] as const;

export const getListProgramsQueryOptions = <TData = Awaited<ReturnType<typeof listPrograms>>, TError = ErrorType<unknown>>(
  options?: { query?: Partial<UseQueryOptions<Awaited<ReturnType<typeof listPrograms>>, TError, TData>>, request?: SecondParameter<typeof customFetch> }
) => {
  const { query: queryOptions, request: requestOptions } = options ?? {};
  const queryKey = queryOptions?.queryKey ?? getListProgramsQueryKey();
  const queryFn: QueryFunction<Awaited<ReturnType<typeof listPrograms>>> = ({ signal }) => listPrograms({ signal, ...requestOptions });
  return { queryKey, queryFn, ...queryOptions } as UseQueryOptions<Awaited<ReturnType<typeof listPrograms>>, TError, TData> & { queryKey: QueryKey };
};

export function useListPrograms<TData = Awaited<ReturnType<typeof listPrograms>>, TError = ErrorType<unknown>>(
  options?: { query?: Partial<UseQueryOptions<Awaited<ReturnType<typeof listPrograms>>, TError, TData>>, request?: SecondParameter<typeof customFetch> }
): UseQueryResult<TData, TError> & { queryKey: QueryKey } {
  const queryOptions = getListProgramsQueryOptions(options);
  const query = useQuery(queryOptions) as UseQueryResult<TData, TError> & { queryKey: QueryKey };
  return withQueryKey(query, queryOptions.queryKey);
}

export const addProgram = async (programInput: BodyType<ProgramInput>, options?: RequestInit): Promise<Program> =>
  customFetch<Program>(getListProgramsUrl(), {
    ...options,
    method: 'POST',
    body: JSON.stringify(programInput),
  });

export const getAddProgramMutationOptions = <TError = ErrorType<ErrorResponse>, TContext = unknown>(
  options?: { mutation?: UseMutationOptions<Awaited<ReturnType<typeof addProgram>>, TError, { data: BodyType<ProgramInput> }, TContext>, request?: SecondParameter<typeof customFetch> }
): UseMutationOptions<Awaited<ReturnType<typeof addProgram>>, TError, { data: BodyType<ProgramInput> }, TContext> => {
  const mutationKey = ['addProgram'];
  const { mutation: mutationOptions, request: requestOptions } = options
    ? options.mutation && 'mutationKey' in options.mutation && options.mutation.mutationKey
      ? options
      : { ...options, mutation: { ...options.mutation, mutationKey } }
    : { mutation: { mutationKey }, request: undefined };
  const mutationFn: MutationFunction<Awaited<ReturnType<typeof addProgram>>, { data: BodyType<ProgramInput> }> = (props) => {
    const { data } = props ?? {};
    return addProgram(data, requestOptions);
  };
  return { mutationFn, ...mutationOptions };
};

export const useAddProgram = <TError = ErrorType<ErrorResponse>, TContext = unknown>(
  options?: { mutation?: UseMutationOptions<Awaited<ReturnType<typeof addProgram>>, TError, { data: BodyType<ProgramInput> }, TContext>, request?: SecondParameter<typeof customFetch> }
): UseMutationResult<Awaited<ReturnType<typeof addProgram>>, TError, { data: BodyType<ProgramInput> }, TContext> => {
  return useMutation(getAddProgramMutationOptions(options));
};

// ---------------------------------------------------------------------------
// GET/DELETE /bounty/programs/{id}, POST approve/reject
// ---------------------------------------------------------------------------

export const getGetProgramUrl = (id: number) => `/api/bounty/programs/${id}`;

export const getProgram = async (id: number, options?: RequestInit): Promise<Program> =>
  customFetch<Program>(getGetProgramUrl(id), { ...options, method: 'GET' });

export const getGetProgramQueryKey = (id: number) => [`/api/bounty/programs/${id}`] as const;

export const getGetProgramQueryOptions = <TData = Awaited<ReturnType<typeof getProgram>>, TError = ErrorType<ErrorResponse>>(
  id: number,
  options?: { query?: Partial<UseQueryOptions<Awaited<ReturnType<typeof getProgram>>, TError, TData>>, request?: SecondParameter<typeof customFetch> }
) => {
  const { query: queryOptions, request: requestOptions } = options ?? {};
  const queryKey = queryOptions?.queryKey ?? getGetProgramQueryKey(id);
  const queryFn: QueryFunction<Awaited<ReturnType<typeof getProgram>>> = ({ signal }) => getProgram(id, { signal, ...requestOptions });
  return { queryKey, queryFn, enabled: id !== null && id !== undefined, ...queryOptions } as UseQueryOptions<Awaited<ReturnType<typeof getProgram>>, TError, TData> & { queryKey: QueryKey };
};

export function useGetProgram<TData = Awaited<ReturnType<typeof getProgram>>, TError = ErrorType<ErrorResponse>>(
  id: number,
  options?: { query?: Partial<UseQueryOptions<Awaited<ReturnType<typeof getProgram>>, TError, TData>>, request?: SecondParameter<typeof customFetch> }
): UseQueryResult<TData, TError> & { queryKey: QueryKey } {
  const queryOptions = getGetProgramQueryOptions(id, options);
  const query = useQuery(queryOptions) as UseQueryResult<TData, TError> & { queryKey: QueryKey };
  return withQueryKey(query, queryOptions.queryKey);
}

export const deleteProgram = async (id: number, options?: RequestInit): Promise<OkResult> =>
  customFetch<OkResult>(getGetProgramUrl(id), { ...options, method: 'DELETE' });

export const getDeleteProgramMutationOptions = <TError = ErrorType<ErrorResponse>, TContext = unknown>(
  options?: { mutation?: UseMutationOptions<Awaited<ReturnType<typeof deleteProgram>>, TError, { id: number }, TContext>, request?: SecondParameter<typeof customFetch> }
): UseMutationOptions<Awaited<ReturnType<typeof deleteProgram>>, TError, { id: number }, TContext> => {
  const mutationKey = ['deleteProgram'];
  const { mutation: mutationOptions, request: requestOptions } = options
    ? options.mutation && 'mutationKey' in options.mutation && options.mutation.mutationKey
      ? options
      : { ...options, mutation: { ...options.mutation, mutationKey } }
    : { mutation: { mutationKey }, request: undefined };
  const mutationFn: MutationFunction<Awaited<ReturnType<typeof deleteProgram>>, { id: number }> = (props) => {
    const { id } = props ?? {};
    return deleteProgram(id, requestOptions);
  };
  return { mutationFn, ...mutationOptions };
};

export const useDeleteProgram = <TError = ErrorType<ErrorResponse>, TContext = unknown>(
  options?: { mutation?: UseMutationOptions<Awaited<ReturnType<typeof deleteProgram>>, TError, { id: number }, TContext>, request?: SecondParameter<typeof customFetch> }
): UseMutationResult<Awaited<ReturnType<typeof deleteProgram>>, TError, { id: number }, TContext> => {
  return useMutation(getDeleteProgramMutationOptions(options));
};

function makeIdOnlyPostHook<TResp>(urlSuffix: string, mutationKeyName: string) {
  const getUrl = (id: number) => `/api/bounty/programs/${id}${urlSuffix}`;
  const fn = async (id: number, options?: RequestInit): Promise<TResp> =>
    customFetch<TResp>(getUrl(id), { ...options, method: 'POST' });

  const getMutationOptions = <TError = ErrorType<ErrorResponse>, TContext = unknown>(
    options?: { mutation?: UseMutationOptions<TResp, TError, { id: number }, TContext>, request?: SecondParameter<typeof customFetch> }
  ): UseMutationOptions<TResp, TError, { id: number }, TContext> => {
    const mutationKey = [mutationKeyName];
    const { mutation: mutationOptions, request: requestOptions } = options
      ? options.mutation && 'mutationKey' in options.mutation && options.mutation.mutationKey
        ? options
        : { ...options, mutation: { ...options.mutation, mutationKey } }
      : { mutation: { mutationKey }, request: undefined };
    const mutationFn: MutationFunction<TResp, { id: number }> = (props) => {
      const { id } = props ?? {};
      return fn(id, requestOptions);
    };
    return { mutationFn, ...mutationOptions };
  };

  const useHook = <TError = ErrorType<ErrorResponse>, TContext = unknown>(
    options?: { mutation?: UseMutationOptions<TResp, TError, { id: number }, TContext>, request?: SecondParameter<typeof customFetch> }
  ): UseMutationResult<TResp, TError, { id: number }, TContext> => useMutation(getMutationOptions(options));

  return useHook;
}

export const useApproveProgram = makeIdOnlyPostHook<Program>('/approve', 'approveProgram');
export const useRejectProgram = makeIdOnlyPostHook<Program>('/reject', 'rejectProgram');

// ---------------------------------------------------------------------------
// GET /bounty/findings, POST /bounty/findings
// ---------------------------------------------------------------------------

export const getListFindingsUrl = () => `/api/bounty/findings`;

export const listFindings = async (options?: RequestInit): Promise<Finding[]> =>
  customFetch<Finding[]>(getListFindingsUrl(), { ...options, method: 'GET' });

export const getListFindingsQueryKey = () => [`/api/bounty/findings`] as const;

export const getListFindingsQueryOptions = <TData = Awaited<ReturnType<typeof listFindings>>, TError = ErrorType<unknown>>(
  options?: { query?: Partial<UseQueryOptions<Awaited<ReturnType<typeof listFindings>>, TError, TData>>, request?: SecondParameter<typeof customFetch> }
) => {
  const { query: queryOptions, request: requestOptions } = options ?? {};
  const queryKey = queryOptions?.queryKey ?? getListFindingsQueryKey();
  const queryFn: QueryFunction<Awaited<ReturnType<typeof listFindings>>> = ({ signal }) => listFindings({ signal, ...requestOptions });
  return { queryKey, queryFn, ...queryOptions } as UseQueryOptions<Awaited<ReturnType<typeof listFindings>>, TError, TData> & { queryKey: QueryKey };
};

export function useListFindings<TData = Awaited<ReturnType<typeof listFindings>>, TError = ErrorType<unknown>>(
  options?: { query?: Partial<UseQueryOptions<Awaited<ReturnType<typeof listFindings>>, TError, TData>>, request?: SecondParameter<typeof customFetch> }
): UseQueryResult<TData, TError> & { queryKey: QueryKey } {
  const queryOptions = getListFindingsQueryOptions(options);
  const query = useQuery(queryOptions) as UseQueryResult<TData, TError> & { queryKey: QueryKey };
  return withQueryKey(query, queryOptions.queryKey);
}

export const addFinding = async (findingInput: BodyType<FindingInput>, options?: RequestInit): Promise<Finding> =>
  customFetch<Finding>(getListFindingsUrl(), {
    ...options,
    method: 'POST',
    body: JSON.stringify(findingInput),
  });

export const getAddFindingMutationOptions = <TError = ErrorType<ErrorResponse>, TContext = unknown>(
  options?: { mutation?: UseMutationOptions<Awaited<ReturnType<typeof addFinding>>, TError, { data: BodyType<FindingInput> }, TContext>, request?: SecondParameter<typeof customFetch> }
): UseMutationOptions<Awaited<ReturnType<typeof addFinding>>, TError, { data: BodyType<FindingInput> }, TContext> => {
  const mutationKey = ['addFinding'];
  const { mutation: mutationOptions, request: requestOptions } = options
    ? options.mutation && 'mutationKey' in options.mutation && options.mutation.mutationKey
      ? options
      : { ...options, mutation: { ...options.mutation, mutationKey } }
    : { mutation: { mutationKey }, request: undefined };
  const mutationFn: MutationFunction<Awaited<ReturnType<typeof addFinding>>, { data: BodyType<FindingInput> }> = (props) => {
    const { data } = props ?? {};
    return addFinding(data, requestOptions);
  };
  return { mutationFn, ...mutationOptions };
};

export const useAddFinding = <TError = ErrorType<ErrorResponse>, TContext = unknown>(
  options?: { mutation?: UseMutationOptions<Awaited<ReturnType<typeof addFinding>>, TError, { data: BodyType<FindingInput> }, TContext>, request?: SecondParameter<typeof customFetch> }
): UseMutationResult<Awaited<ReturnType<typeof addFinding>>, TError, { data: BodyType<FindingInput> }, TContext> => {
  return useMutation(getAddFindingMutationOptions(options));
};

// ---------------------------------------------------------------------------
// GET/PATCH/DELETE /bounty/findings/{id}
// ---------------------------------------------------------------------------

export const getGetFindingUrl = (id: number) => `/api/bounty/findings/${id}`;

export const getFinding = async (id: number, options?: RequestInit): Promise<Finding> =>
  customFetch<Finding>(getGetFindingUrl(id), { ...options, method: 'GET' });

export const getGetFindingQueryKey = (id: number) => [`/api/bounty/findings/${id}`] as const;

export const getGetFindingQueryOptions = <TData = Awaited<ReturnType<typeof getFinding>>, TError = ErrorType<ErrorResponse>>(
  id: number,
  options?: { query?: Partial<UseQueryOptions<Awaited<ReturnType<typeof getFinding>>, TError, TData>>, request?: SecondParameter<typeof customFetch> }
) => {
  const { query: queryOptions, request: requestOptions } = options ?? {};
  const queryKey = queryOptions?.queryKey ?? getGetFindingQueryKey(id);
  const queryFn: QueryFunction<Awaited<ReturnType<typeof getFinding>>> = ({ signal }) => getFinding(id, { signal, ...requestOptions });
  return { queryKey, queryFn, enabled: id !== null && id !== undefined, ...queryOptions } as UseQueryOptions<Awaited<ReturnType<typeof getFinding>>, TError, TData> & { queryKey: QueryKey };
};

export function useGetFinding<TData = Awaited<ReturnType<typeof getFinding>>, TError = ErrorType<ErrorResponse>>(
  id: number,
  options?: { query?: Partial<UseQueryOptions<Awaited<ReturnType<typeof getFinding>>, TError, TData>>, request?: SecondParameter<typeof customFetch> }
): UseQueryResult<TData, TError> & { queryKey: QueryKey } {
  const queryOptions = getGetFindingQueryOptions(id, options);
  const query = useQuery(queryOptions) as UseQueryResult<TData, TError> & { queryKey: QueryKey };
  return withQueryKey(query, queryOptions.queryKey);
}

export const updateFindingStatus = async (id: number, findingUpdate: BodyType<FindingUpdate>, options?: RequestInit): Promise<Finding> =>
  customFetch<Finding>(getGetFindingUrl(id), {
    ...options,
    method: 'PATCH',
    body: JSON.stringify(findingUpdate),
  });

export const getUpdateFindingStatusMutationOptions = <TError = ErrorType<ErrorResponse>, TContext = unknown>(
  options?: { mutation?: UseMutationOptions<Awaited<ReturnType<typeof updateFindingStatus>>, TError, { id: number, data: BodyType<FindingUpdate> }, TContext>, request?: SecondParameter<typeof customFetch> }
): UseMutationOptions<Awaited<ReturnType<typeof updateFindingStatus>>, TError, { id: number, data: BodyType<FindingUpdate> }, TContext> => {
  const mutationKey = ['updateFindingStatus'];
  const { mutation: mutationOptions, request: requestOptions } = options
    ? options.mutation && 'mutationKey' in options.mutation && options.mutation.mutationKey
      ? options
      : { ...options, mutation: { ...options.mutation, mutationKey } }
    : { mutation: { mutationKey }, request: undefined };
  const mutationFn: MutationFunction<Awaited<ReturnType<typeof updateFindingStatus>>, { id: number, data: BodyType<FindingUpdate> }> = (props) => {
    const { id, data } = props ?? {};
    return updateFindingStatus(id, data, requestOptions);
  };
  return { mutationFn, ...mutationOptions };
};

export const useUpdateFindingStatus = <TError = ErrorType<ErrorResponse>, TContext = unknown>(
  options?: { mutation?: UseMutationOptions<Awaited<ReturnType<typeof updateFindingStatus>>, TError, { id: number, data: BodyType<FindingUpdate> }, TContext>, request?: SecondParameter<typeof customFetch> }
): UseMutationResult<Awaited<ReturnType<typeof updateFindingStatus>>, TError, { id: number, data: BodyType<FindingUpdate> }, TContext> => {
  return useMutation(getUpdateFindingStatusMutationOptions(options));
};

export const deleteFinding = async (id: number, options?: RequestInit): Promise<OkResult> =>
  customFetch<OkResult>(getGetFindingUrl(id), { ...options, method: 'DELETE' });

export const getDeleteFindingMutationOptions = <TError = ErrorType<ErrorResponse>, TContext = unknown>(
  options?: { mutation?: UseMutationOptions<Awaited<ReturnType<typeof deleteFinding>>, TError, { id: number }, TContext>, request?: SecondParameter<typeof customFetch> }
): UseMutationOptions<Awaited<ReturnType<typeof deleteFinding>>, TError, { id: number }, TContext> => {
  const mutationKey = ['deleteFinding'];
  const { mutation: mutationOptions, request: requestOptions } = options
    ? options.mutation && 'mutationKey' in options.mutation && options.mutation.mutationKey
      ? options
      : { ...options, mutation: { ...options.mutation, mutationKey } }
    : { mutation: { mutationKey }, request: undefined };
  const mutationFn: MutationFunction<Awaited<ReturnType<typeof deleteFinding>>, { id: number }> = (props) => {
    const { id } = props ?? {};
    return deleteFinding(id, requestOptions);
  };
  return { mutationFn, ...mutationOptions };
};

export const useDeleteFinding = <TError = ErrorType<ErrorResponse>, TContext = unknown>(
  options?: { mutation?: UseMutationOptions<Awaited<ReturnType<typeof deleteFinding>>, TError, { id: number }, TContext>, request?: SecondParameter<typeof customFetch> }
): UseMutationResult<Awaited<ReturnType<typeof deleteFinding>>, TError, { id: number }, TContext> => {
  return useMutation(getDeleteFindingMutationOptions(options));
};
