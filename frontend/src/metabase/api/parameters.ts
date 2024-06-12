import { getNonVirtualFields } from "metabase-lib/v1/parameters/utils/parameter-fields";
import { normalizeParameter } from "metabase-lib/v1/parameters/utils/parameter-values";
import type { Parameter, ParameterValues } from "metabase-types/api";

import { Api } from "./api";
import { idTag } from "./tags";

type NormalizedParameter = ReturnType<typeof normalizeParameter>;

export type LoadParameterValuesParams = {
  parameter: Parameter;
};

export type LoadParameterValuesInternalParams = {
  parameter: NormalizedParameter;
  field_ids: number[];
};

export type SearchParameterValuesParams = {
  parameter: Parameter;
  query: string;
};

export type SearchParameterValuesInternalParams = {
  parameter: NormalizedParameter;
  field_ids: number[];
  query: string;
};

function expandParameters({
  parameter,
  ...rest
}: LoadParameterValuesParams | SearchParameterValuesParams) {
  return {
    ...rest,
    parameter: normalizeParameter(parameter),
    field_ids: getNonVirtualFields(parameter).map(field => Number(field.id)),
  };
}

const parametersApi = Api.injectEndpoints({
  endpoints: builder => ({
    loadParameterValues: builder.query<
      ParameterValues,
      LoadParameterValuesInternalParams
    >({
      query: params => ({
        method: "POST",
        url: `/api/dataset/parameter/values`,
        params,
      }),
      providesTags: (_values, _error, params) => [
        idTag("parameter-values", params.parameter.id),
      ],
    }),
    searchParameterValues: builder.query<
      ParameterValues,
      SearchParameterValuesInternalParams
    >({
      query: params => ({
        method: "POST",
        url: `/api/dataset/parameter/search/${params.query}`,
        params,
      }),
      // TODO: can we provide tags for this?
    }),
  }),
});

export function useLoadParameterValuesQuery(
  { parameter }: LoadParameterValuesParams,
  options,
) {
  return parametersApi.useLoadParameterValuesQuery(
    expandParameters({ parameter }),
    options,
  );
}

export function useSearchParameterValuesQuery(
  { parameter, query }: SearchParameterValuesParams,
  options,
) {
  return parametersApi.useSearchParameterValuesQuery(
    expandParameters({ parameter, query }),
    options,
  );
}
