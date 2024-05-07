import { denormalize, normalize } from "normalizr";

import { IS_EMBED_PREVIEW } from "metabase/lib/embed";
import { defer } from "metabase/lib/promise";
import { createAsyncThunk } from "metabase/lib/redux";
import { getDashboardUiParameters } from "metabase/parameters/utils/dashboards";
import { getParameterValuesByIdFromQueryParams } from "metabase/parameters/utils/parameter-values";
import { addFields, addParamValues } from "metabase/redux/metadata";
import { getMetadata } from "metabase/selectors/metadata";
import { AutoApi, DashboardApi, EmbedApi, PublicApi } from "metabase/services";

import {
  getDashboardById,
  getDashCardById,
  getParameterValues,
  getQuestions,
  getSelectedTabId,
} from "../selectors";
import { expandInlineDashboard, getDashboardType } from "../utils";

import { dashboard } from "./data-fetching";
import { loadMetadataForDashboard } from "./metadata";

let fetchDashboardCancellation: any;

export const fetchDashboard = createAsyncThunk(
  "metabase/dashboard/FETCH_DASHBOARD",
  async (
    {
      dashId,
      queryParams,
      options: { preserveParameters = false, clearCache = true } = {},
    }: {
      dashId: string;
      queryParams: any;
      options?: {
        preserveParameters?: boolean;
        clearCache?: boolean;
      };
    },
    { dispatch, getState, rejectWithValue },
  ) => {
    if (fetchDashboardCancellation) {
      fetchDashboardCancellation.resolve();
    }
    fetchDashboardCancellation = defer();

    try {
      let entities;
      let result;

      const dashboardType = getDashboardType(dashId);
      const loadedDashboard = getDashboardById(getState(), dashId);

      if (!clearCache && loadedDashboard) {
        entities = {
          dashboard: { [dashId]: loadedDashboard },
          dashcard: Object.fromEntries(
            loadedDashboard.dashcards.map(id => [
              id,
              getDashCardById(getState(), id),
            ]),
          ),
        };
        result = denormalize(dashId, dashboard, entities);
      } else if (dashboardType === "public") {
        result = await PublicApi.dashboard(
          { uuid: dashId },
          { cancelled: fetchDashboardCancellation.promise },
        );
        result = {
          ...result,
          id: dashId,
          dashcards: result.dashcards.map((dc: any) => ({
            ...dc,
            dashboard_id: dashId,
          })),
        };
      } else if (dashboardType === "embed") {
        result = await EmbedApi.dashboard(
          { token: dashId },
          { cancelled: fetchDashboardCancellation.promise },
        );
        result = {
          ...result,
          id: IS_EMBED_PREVIEW ? result.id : dashId,
          dashcards: result.dashcards.map((dc: any) => ({
            ...dc,
            dashboard_id: dashId,
          })),
        };
      } else if (dashboardType === "transient") {
        const subPath = dashId.split("/").slice(3).join("/");
        result = await AutoApi.dashboard(
          { subPath },
          { cancelled: fetchDashboardCancellation.promise },
        );
        result = {
          ...result,
          id: dashId,
          dashcards: result.dashcards.map((dc: any) => ({
            ...dc,
            dashboard_id: dashId,
          })),
        };
      } else if (dashboardType === "inline") {
        // HACK: this is horrible but the easiest way to get "inline" dashboards up and running
        // pass the dashboard in as dashboardId, and replace the id with [object Object] because
        // that's what it will be when cast to a string
        // @ts-expect-error - see above comment
        result = expandInlineDashboard(dashId);
        dashId = result.id = String(dashId);
      } else {
        result = await DashboardApi.get(
          { dashId: dashId },
          { cancelled: fetchDashboardCancellation.promise },
        );
      }

      fetchDashboardCancellation = null;

      if (dashboardType === "normal" || dashboardType === "transient") {
        const selectedTabId = getSelectedTabId(getState());

        const cards =
          selectedTabId === undefined
            ? result.dashcards
            : result.dashcards.filter(
                (c: any) => c.dashboard_tab_id === selectedTabId,
              );

        await dispatch(loadMetadataForDashboard(cards));
      }

      const isUsingCachedResults = entities != null;
      if (!isUsingCachedResults) {
        // copy over any virtual cards from the dashcard to the underlying card/question
        result.dashcards.forEach(
          (card: {
            visualization_settings: { virtual_card: any };
            card: any;
          }) => {
            if (card.visualization_settings.virtual_card) {
              card.card = Object.assign(
                card.card || {},
                card.visualization_settings.virtual_card,
              );
            }
          },
        );
      }

      if (result.param_values) {
        dispatch(addParamValues(result.param_values));
      }
      if (result.param_fields) {
        dispatch(addFields(result.param_fields));
      }

      const metadata = getMetadata(getState());
      const questions = getQuestions(getState());
      const parameters = getDashboardUiParameters(
        result.dashcards,
        result.parameters,
        metadata,
        questions,
      );

      const parameterValuesById = preserveParameters
        ? getParameterValues(getState())
        : getParameterValuesByIdFromQueryParams(parameters, queryParams);

      entities = entities ?? normalize(result, dashboard).entities;

      return {
        entities,
        dashboard: result,
        dashboardId: result.id,
        parameterValues: parameterValuesById,
        preserveParameters,
      };
    } catch (error: any) {
      if (!error.isCancelled) {
        console.error(error);
      }
      return rejectWithValue(error);
    }
  },
);