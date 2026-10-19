"use client"

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

export function EnumSelect({
  id,
  value,
  onChange,
  options,
  placeholder,
  "aria-label": ariaLabel,
}: {
  id?: string
  value: string
  onChange: (value: string) => void
  options: { value: string; label: string }[]
  placeholder?: string
  "aria-label"?: string
}) {
  return (
    <Select
      value={value}
      onValueChange={(next) => {
        if (next) onChange(next)
      }}
      items={Object.fromEntries(options.map((option) => [option.value, option.label]))}
    >
      <SelectTrigger id={id} className="w-full min-w-36" aria-label={ariaLabel}>
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent>
        {options.map((option) => (
          <SelectItem key={option.value} value={option.value}>
            {option.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}
