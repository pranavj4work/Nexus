"use client"

import { useTranslations } from "next-intl"
import { Badge } from "@/components/ui/badge"

export function StatusBadge({ value }: { value: string }) {
  const t = useTranslations("statuses")
  return <Badge variant="outline">{t(value)}</Badge>
}

export function PriorityBadge({ value }: { value: string }) {
  const t = useTranslations("priorities")
  return <Badge variant={value === "URGENT" || value === "HIGH" ? "default" : "secondary"}>{t(value)}</Badge>
}
