import { Link } from "react-router";
import { jt, t } from "ttag";

import ExternalLink from "metabase/core/components/ExternalLink";
import { Anchor, Card, Group, Stack, Tabs, Text, Title } from "metabase/ui";

import { InteractiveTabContent } from "./InteractiveTabContent";
import { StaticTabContent } from "./StaticTabContent";

export type EmbedHomepageViewProps = {
  embeddingAutoEnabled: boolean;
  exampleDashboardId?: number;
  licenseActiveAtSetup: boolean;
  defaultTab: "interactive" | "static";
  // links
  interactiveEmbeddingQuickstartUrl: string;
  embeddingDocsUrl: string;
  analyticsDocsUrl: string;
  learnMoreStaticEmbedUrl: string;
  learnMoreInteractiveEmbedUrl: string;
};

export const EmbedHomepageView = (props: EmbedHomepageViewProps) => {
  const {
    embeddingAutoEnabled,
    defaultTab,
    embeddingDocsUrl,
    analyticsDocsUrl,
  } = props;
  return (
    <Stack maw={550}>
      <Group>
        {/*  eslint-disable-next-line no-literal-metabase-strings -- only visible to admins */}
        <Text fw="bold">{t`Get started with Embedding Metabase in your app`}</Text>
      </Group>
      <Card px="xl" py="lg">
        {/* eslint-disable-next-line no-literal-metabase-strings -- only visible to admins */}
        <Title order={2} mb="md">{t`Embedding Metabase`}</Title>
        <Tabs defaultValue={defaultTab}>
          <Tabs.List>
            <Tabs.Tab value="interactive">{t`Interactive`}</Tabs.Tab>
            <Tabs.Tab value="static">{t`Static`}</Tabs.Tab>
          </Tabs.List>

          <Tabs.Panel value="interactive" pt="md">
            <InteractiveTabContent {...props} />
          </Tabs.Panel>

          <Tabs.Panel value="static" pt="md">
            <StaticTabContent {...props} />
          </Tabs.Panel>
        </Tabs>
      </Card>

      {embeddingAutoEnabled && (
        <Card>
          <Text
            color="text-dark"
            fw="bold"
          >{t`Embedding has been automatically enabled for you`}</Text>
          <Text color="text-light" size="sm">
            {/* eslint-disable-next-line no-literal-metabase-strings -- only visible to admins */}
            {jt`Because you expressed interest in embedding Metabase, we took this step for you so that you can more easily try it out. You can turn it off anytime in ${(
              <Anchor
                size="sm"
                component={Link}
                to="/admin/settings/embedding-in-other-applications"
                key="link"
              >
                admin/settings/embedding-in-other-applications
              </Anchor>
            )}.`}
          </Text>
        </Card>
      )}

      <Card>
        <Text color="text-dark" fw="bold">{t`Need more information?`}</Text>
        <Text color="text-light" size="sm">
          {/* eslint-disable-next-line no-literal-metabase-strings -- only visible to admins */}
          {jt`Explore the ${(
            <ExternalLink
              key="embedding-docs"
              href={embeddingDocsUrl}
            >{t`embedding documentation`}</ExternalLink>
          )} and ${(
            <ExternalLink
              key="customer-facing-analytics-docs"
              href={analyticsDocsUrl}
            >{t`customer-facing analytics articles`}</ExternalLink>
          )} to learn more about what Metabase offers.`}
        </Text>
      </Card>
    </Stack>
  );
};
