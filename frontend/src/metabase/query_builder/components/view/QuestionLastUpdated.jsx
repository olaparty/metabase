/* eslint-disable react/prop-types */
import moment from "moment-timezone"; // eslint-disable-line no-restricted-imports -- deprecated usage
import { t } from "ttag";

import CS from "metabase/css/core/index.css";
import { Icon } from "metabase/ui";

import { SectionRoot } from "./QuestionLastUpdated.styled";

export default function QuestionLastUpdated({ updatedAt, ...props }) {
  return updatedAt ? (
    <SectionRoot {...props}>
      <Icon name="clock" className={CS.mr1} />
      {t`Updated ${moment(updatedAt).fromNow()}`}
    </SectionRoot>
  ) : null;
}

QuestionLastUpdated.shouldRender = ({ result }) => result && result.cached;
