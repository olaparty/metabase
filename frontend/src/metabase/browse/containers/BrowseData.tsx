import _ from "underscore";
import { t } from "ttag";

import { push } from "react-router-redux";
import * as Urls from "metabase/lib/urls";
import { color } from "metabase/lib/colors";

import { Divider, Tabs, Icon, Box } from "metabase/ui";
import { Grid } from "metabase/components/Grid";
import Link from "metabase/core/components/Link";
import LoadingAndErrorWrapper from "metabase/components/LoadingAndErrorWrapper";

import {
  useDatabaseListQuery,
  useSearchListQuery,
} from "metabase/common/hooks";

import NoResults from "assets/img/no_results.svg";
import type { SearchResult } from "metabase-types/api";
import { useDispatch } from "metabase/lib/redux";
import BrowseHeader from "../components/BrowseHeader";
import {
  DatabaseCard,
  DatabaseGridItem,
  BrowseContainer,
  BrowseTabs,
  BrowseTabsPanel,
  CenteredEmptyState,
} from "./BrowseData.styled";
import { BrowseModels } from "./BrowseModels";

export type BrowseTabId = "models" | "databases";

export const BrowseDataPage = ({ tab = "models" }: { tab: BrowseTabId }) => {
  const dispatch = useDispatch();

  const models = useSearchListQuery<SearchResult>({
    query: {
      models: ["dataset"],
      filter_items_in_personal_collection: "exclude",
    },
  });

  const databases = useDatabaseListQuery();

  // TODO: Put the BrowseTabs into the BrowseHeader so that these tabs appear on all the pages that use the browseheader. EXCEPT there might be some contexts where BrowseHeader is used but
  return (
    <BrowseContainer data-testid="data-browser">
      <BrowseHeader />
      <BrowseTabs
        value={tab}
        onTabChange={value => dispatch(push(`/browse-${value}`))}
      >
        <Tabs.List>
          <Tabs.Tab key={"models"} value={"models"}>
            {t`Models`}
          </Tabs.Tab>
          <Tabs.Tab key={"databases"} value={"databases"}>
            {t`Databases`}
          </Tabs.Tab>
        </Tabs.List>
        <Divider />
        <BrowseTabsPanel key={tab} value={tab ?? ""}>
          {tab === "models" ? (
            <BrowseModels key="models" {...models} />
          ) : (
            <BrowseDatabases key="databases" {...databases} />
          )}
        </BrowseTabsPanel>
      </BrowseTabs>
    </BrowseContainer>
  );
};

const BrowseDatabases = ({
  data: databases = [],
  error,
  isLoading,
}: ReturnType<typeof useDatabaseListQuery>) => {
  if (error) {
    return <LoadingAndErrorWrapper error />;
  }
  if (isLoading) {
    return <LoadingAndErrorWrapper loading />;
  }

  return databases.length ? (
    <Grid data-testid="database-browser">
      {databases.map(database => (
        <DatabaseGridItem key={database.id}>
          <Link to={Urls.browseDatabase(database)}>
            <DatabaseCard>
              <Icon
                name="database"
                color={color("accent2")}
                className="mb3"
                size={32}
              />
              <h3 className="text-wrap">{database.name}</h3>
            </DatabaseCard>
          </Link>
        </DatabaseGridItem>
      ))}
    </Grid>
  ) : (
    <CenteredEmptyState
      title={<Box mb=".5rem">{t`No databases here yet`}</Box>}
      illustrationElement={
        <Box mb=".5rem">
          <img src={NoResults} />
        </Box>
      }
    />
  );
};
