import { getConfigBoolean, getConfigNumber, getConfigString, getConfigValue } from "@/repositories/access"
import { listConfig, updateConfig } from "@/services/organization-service"

export const configurationService = {
  get: getConfigValue,
  number: getConfigNumber,
  boolean: getConfigBoolean,
  string: getConfigString,
  list: listConfig,
  update: updateConfig,
}
