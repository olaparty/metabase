import type { TokenFeatures } from "metabase-types/api";
import { tokenFeatures } from "metabase-types/api";

// Yearly plans are missing
// - starter-yearly
// - starter-with-dwh-yearly
// - pro-self-hosted-yearly
// - pro-cloud-yearly
// - pro-cloud-with-dwh-yearly
export type Plan =
  | "oss"
  | "starter"
  | "starter-with-dwh"
  | "pro-cloud"
  | "pro-cloud-with-dwh"
  | "pro-self-hosted";

export const getPlan = (features?: TokenFeatures | null): Plan => {
  if (!features) {
    return "oss";
  }

  const hasAnyProFeatures = tokenFeatures.some(
    feature => feature !== "hosting" && features[feature],
  );

  if (!hasAnyProFeatures) {
    if (features.hosting) {
      return features.attached_dwh ? "starter-with-dwh" : "starter";
    }

    return "oss";
  }

  if (features.hosting) {
    return features.attached_dwh ? "pro-cloud-with-dwh" : "pro-cloud";
  }

  return "pro-self-hosted";
};

const ssoFeatures = ["sso_google", "sso_jwt", "sso_ldap", "sso_saml"] as const;
export const hasAnySsoFeature = (features?: TokenFeatures | null): boolean =>
  features != null && ssoFeatures.some(ssoFeature => features[ssoFeature]);
