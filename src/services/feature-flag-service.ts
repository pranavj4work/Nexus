import { isFeatureEnabled } from "@/repositories/access"
import { listFlags, updateFlag } from "@/services/organization-service"
import type { FeatureFlagKey } from "@/types/domain"

export function isFeatureEnabledForOrg(organizationId: string, key: FeatureFlagKey) {
  return isFeatureEnabled(organizationId, key)
}

export const featureFlagService = {
  isEnabled: isFeatureEnabledForOrg,
  list: listFlags,
  update: updateFlag,
}
