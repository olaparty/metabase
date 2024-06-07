import { WebClient } from '@slack/web-api';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';

dayjs.extend(relativeTime);
import _githubSlackMap from "../github-slack-map.json";

const githubSlackMap: Record<string, string> = _githubSlackMap;

import { findMilestone } from "./github";
import type { Issue , ReleaseProps } from './types';
import { getGenericVersion } from "./version-helpers";

const slack = new WebClient(process.env.SLACK_BOT_TOKEN);
const SLACK_CHANNEL_NAME = process.env.SLACK_RELEASE_CHANNEL ?? "bot-testing";

export function mentionUserByGithubLogin(githubLogin?: string | null) {
  if (githubLogin && githubLogin in githubSlackMap) {
    return `<@${githubSlackMap[githubLogin]}>`;
  }
  return '@unassigned';
}

export function getChannelTopic(channelName: string) {
  return slack.conversations.list({
    types: 'public_channel',
  }).then(response => {
    const channel = response?.channels?.find(channel => channel.name === channelName);
    return channel?.topic?.value;
  });
}

function formatBackportItem(issue: Omit<Issue, 'labels'>,) {
  const age = dayjs(issue.created_at).fromNow();
  return `${mentionUserByGithubLogin(issue.assignee?.login)} - ${slackLink(issue.title, issue.html_url)} - ${age}`;
}

export async function sendBackportReminder({
  channelName, backports,
}: {
  channelName: string,
  backports: Omit<Issue, 'labels'>[],
}) {
  const text = backports
    .reverse()
    .map(formatBackportItem).join("\n");

    const blocks = [
      {
        "type": "header",
        "text": {
          "type": "plain_text",
          "text": `:shame-conga: ${backports.length} Open Backports :shame-conga:`,
          "emoji": true
        }
      },
      {
        "type": "section",
        "text": {
          "type": "mrkdwn",
          "text": `_${
            slackLink('See all open backports','https://github.com/metabase/metabase/pulls?q=is%3Aopen+is%3Apr+label%3Awas-backported')} | ${
            slackLink('Should I backport this?', 'https://www.notion.so/metabase/Metabase-Branching-Strategy-6eb577d5f61142aa960a626d6bbdfeb3?pvs=4#89f80d6f17714a0198aeb66c0efd1b71')}_`,
        }
      },
    ];

    const attachments = [
      {
        "color": "#F9841A",
        "blocks": [{
          "type": "section",
          "text": {
            "type": "mrkdwn",
            "text": text,
          }
        }],
      },
    ];

    return slack.chat.postMessage({
      channel: channelName,
      blocks,
      attachments,
      text: `${backports.length} open backports`,
    });
}

export async function sendPreReleaseStatus({
  channelName, version, date, openIssues, closedIssueCount, milestoneId
}: {
  channelName: string,
  version: string,
  date: string,
  openIssues: Issue[],
  closedIssueCount: number,
  milestoneId: number,
}) {
  const blockerText = `* ${openIssues.length } Blockers*
    ${openIssues.map(issue => `  • <${issue.html_url}|#${issue.number} - ${issue.title}> - ${mentionUserByGithubLogin(issue.assignee?.login)}`).join("\n")}`;

  const blocks = [
    {
			"type": "header",
			"text": {
				"type": "plain_text",
				"text": `:rocket:  Upcoming ${version} Release Status`,
				"emoji": true
			}
		},
    {
			"type": "section",
			"text": {
				"type": "mrkdwn",
				"text": `_<https://github.com/metabase/metabase/milestone/${milestoneId}|:direction-sign: Milestone> targeted for release on ${date}_`,
			}
		},
  ];

  const attachments = [
    {
      "color": "#32a852",
      "blocks": [{
        "type": "section",
        "text": {
          "type": "mrkdwn",
          "text": `*${closedIssueCount} Closed Issues*`,
        }
      }],
    },
    {
      "color": "#a83632",
      "blocks": [{
        "type": "section",
        "text": {
          "type": "mrkdwn",
          "text": blockerText,
        }
      }],
    },
  ];

  return slack.chat.postMessage({
    channel: channelName,
    blocks,
    attachments,
    text: `${version} is scheduled for release on ${date}`,
  });
}

type BuildStage =
  | "build-start"
  | "build-done"
  | "test-start"
  | "test-done"
  | "publish-start"
  | "publish-done";

function sendSlackMessage({ channelName = SLACK_CHANNEL_NAME, message }: { channelName?: string, message: string }) {
  return slack.chat.postMessage({
    channel: channelName,
    text: message,
  });
}

const getReleaseTitle = (version: string) =>
  `:rocket: *${getGenericVersion(version)} Release* :rocket:`;

export function slackLink(text: string, url: string) {
  return `<${url}|${text}>`;
}

function githubRunLink(
  text: string,
  runId: string,
  owner: string,
  repo: string,
) {
  return slackLink(
    text,
    `https://github.com/${owner}/${repo}/actions/runs/${runId}`,
  );
}

export async function sendReleaseMessage({
  github,
  owner,
  repo,
  stage,
  version,
  runId,
  releaseSha,
}: ReleaseProps & {
  stage: BuildStage;
  version: string;
  runId: string;
  releaseSha: string;
}) {

  const title = getReleaseTitle(version);
  const space = "\n";
  let message = "";

  if (stage === "build-start") {
    const milestone = await findMilestone({ version, github, owner, repo });
    console.log("Milestone", milestone);
    const milestoneLink = milestone?.number
      ? slackLink(
          `_:direction-sign: Milestone_`,
          `https://github.com/${owner}/${repo}/milestone/${milestone.number}?closed=1`,
        )
      : "";

    const releaseCommitLink = slackLink(
      `_:merged: Release Commit_`,
      `https://github.com/${owner}/${repo}/commit/${releaseSha}`,
    );

    const githubBuildLink = githubRunLink("_🏗️ CI Build_", runId, owner, repo);

    const preReleaseMessage = [
      releaseCommitLink,
      milestoneLink,
      githubBuildLink,
    ].filter(Boolean).join(" - ");

    message = [
      title,
      preReleaseMessage,
    ].join(space);
  }

  if (message) {
    await sendSlackMessage({ message });
    return;
  }

  console.error(`No message to send for ${stage}`);
}

export async function sendFlakeStatusReport({
  channelName, openFlakeInfo, closedFlakeInfo,
}: {
  channelName: string,
  openFlakeInfo: string,
  closedFlakeInfo: string,
}) {
    const blocks = [
      {
        "type": "header",
        "text": {
          "type": "plain_text",
          "text": `:croissant: Flaky Tests Status :croissant:`,
          "emoji": true
        }
      },
    ];

    const attachments = [
      {
        "color": "#46ad1a",
        "blocks": [{
          "type": "section",
          "text": {
            "type": "mrkdwn",
            "text": `:muscle: *Recently Closed Flakes*\n ${closedFlakeInfo}`,
          }
        }],
      },
      {
        "color": "#d9bb34",
        "blocks": [{
          "type": "section",
          "text": {
            "type": "mrkdwn",
            "text": `:clipboard: *Open Flakes*\n ${openFlakeInfo}`,
          }
        }],
      },
    ];

    return slack.chat.postMessage({
      channel: channelName,
      blocks,
      attachments,
      text: `Flaky issue summary`,
    });
}
