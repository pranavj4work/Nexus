"use client"

import { useTranslations } from "next-intl"
import { EmptyState } from "@/components/data/states"
import { useAuth } from "@/providers/auth-provider"

export default function AssistantPage() {
  const t = useTranslations("assistant")
  const { session } = useAuth()
  if (!session.features.FEATURE_AI_ASSISTANT) {
    return <EmptyState title={t("title")} description={t("description")} />
  }
  return <EmptyState title={t("title")} description={t("description")} />
}
