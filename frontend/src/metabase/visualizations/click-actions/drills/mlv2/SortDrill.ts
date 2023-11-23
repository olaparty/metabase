import { t } from "ttag";
import type {
  ClickActionBase,
  Drill,
} from "metabase/visualizations/types/click-actions";
import type * as Lib from "metabase-lib";

const ACTIONS: Record<string, ClickActionBase> = {
  asc: {
    name: "sort-ascending",
    icon: "arrow_up",
    section: "sort",
    buttonType: "sort",
    tooltip: t`Sort ascending`,
  },
  desc: {
    name: "sort-descending",
    icon: "arrow_down",
    section: "sort",
    buttonType: "sort",
    tooltip: t`Sort descending`,
  },
};

export const SortDrill: Drill<Lib.SortDrillThruInfo> = ({
  drill,
  drillDisplayInfo,
  applyDrill,
}) => {
  const { directions } = drillDisplayInfo;

  return directions.map(direction => ({
    ...ACTIONS[direction],
    question: () => applyDrill(drill, direction),
  }));
};
