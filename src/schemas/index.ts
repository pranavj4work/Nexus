import { z } from "zod"
import { AppError } from "@/lib/api/errors"
import {
  LOCALES,
  PERMISSIONS,
  PRIORITIES,
  PROJECT_STATUSES,
  TASK_STATUSES,
  THEME_MODES,
  USER_STATUSES,
} from "@/types/domain"

export const loginSchema = z.object({
  email: z.string().trim().email("validation.email"),
  password: z.string().min(1, "validation.required"),
})

export const mfaSchema = z.object({
  challengeToken: z.string().min(1, "validation.required"),
  code: z.string().trim().min(6, "validation.mfa").max(6, "validation.mfa"),
})

export function registerSchema(minLength: number) {
  return z.object({
    name: z.string().trim().min(2, "validation.name"),
    email: z.string().trim().email("validation.email"),
    password: z.string().min(minLength, "validation.passwordMin"),
    organizationName: z.string().trim().min(2, "validation.organization"),
  })
}

export const forgotSchema = z.object({
  email: z.string().trim().email("validation.email"),
})

export function resetSchema(minLength: number) {
  return z.object({
    token: z.string().min(1, "validation.required"),
    password: z.string().min(minLength, "validation.passwordMin"),
  })
}

export const verifySchema = z.object({
  token: z.string().min(1, "validation.required"),
})

export const projectSchema = z.object({
  name: z.string().trim().min(2, "validation.name"),
  description: z.string().trim().min(4, "validation.description"),
  status: z.enum(PROJECT_STATUSES).optional(),
  priority: z.enum(PRIORITIES),
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "validation.date"),
  dueDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "validation.date"),
  memberIds: z.array(z.string()).optional(),
})

export const projectUpdateSchema = projectSchema.partial()

export const taskSchema = z.object({
  projectId: z.string().min(1, "validation.required"),
  title: z.string().trim().min(3, "validation.title"),
  description: z.string().trim().min(4, "validation.description"),
  status: z.enum(TASK_STATUSES).optional(),
  priority: z.enum(PRIORITIES).optional(),
  assigneeId: z.string().nullable().optional(),
  dueDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "validation.date"),
  labels: z.array(z.string().trim().min(1)).optional(),
})

export const taskUpdateSchema = taskSchema.partial().omit({ projectId: true })

export const commentSchema = z.object({
  body: z.string().trim().min(1, "validation.required").max(2000, "validation.tooLong"),
})

export const attachmentSchema = z.object({
  fileName: z.string().trim().min(1, "validation.required").max(120, "validation.tooLong"),
  sizeBytes: z.number().int().positive().max(10_000_000),
})

export const inviteSchema = z.object({
  name: z.string().trim().min(2, "validation.name"),
  email: z.string().trim().email("validation.email"),
  roleId: z.string().min(1, "validation.required"),
})

export const memberUpdateSchema = z.object({
  roleId: z.string().optional(),
  status: z.enum(USER_STATUSES).optional(),
  name: z.string().trim().min(2).optional(),
  title: z.string().trim().min(2).optional(),
})

export const preferencesSchema = z.object({
  locale: z.enum(LOCALES).optional(),
  theme: z.enum(THEME_MODES).optional(),
  highContrast: z.boolean().optional(),
  emailEnabled: z.boolean().optional(),
  inAppEnabled: z.boolean().optional(),
  digestEnabled: z.boolean().optional(),
})

export const switchOrgSchema = z.object({
  organizationId: z.string().min(1),
})

export const rolePermissionsSchema = z.object({
  permissions: z.array(z.enum(PERMISSIONS)),
})

export const flagUpdateSchema = z.object({
  enabled: z.boolean(),
  organizationIds: z.array(z.string()),
})

export const configUpdateSchema = z.object({
  value: z.union([z.string(), z.number(), z.boolean()]),
})

export const projectMemberSchema = z.object({
  userId: z.string().min(1),
})

export function parseInput<T>(schema: z.ZodType<T>, value: unknown): T {
  const result = schema.safeParse(value)
  if (!result.success) {
    const fields: Record<string, string> = {}
    for (const issue of result.error.issues) {
      const key = issue.path.join(".") || "form"
      if (!fields[key]) fields[key] = issue.message
    }
    throw new AppError("VALIDATION", "validation.invalid", fields)
  }
  return result.data
}
