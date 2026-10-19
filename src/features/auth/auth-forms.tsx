"use client"

import { zodResolver } from "@hookform/resolvers/zod"
import { useMutation, useQuery } from "@tanstack/react-query"
import Link from "next/link"
import { useRouter, useSearchParams } from "next/navigation"
import { useState } from "react"
import { useForm } from "react-hook-form"
import { useTranslations } from "next-intl"
import { toast } from "sonner"
import type { z } from "zod"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { api, ApiError } from "@/lib/api/client"
import { loadPage } from "@/lib/load-page"
import { errorText, fieldText } from "@/lib/ui/errors"
import { forgotSchema, loginSchema, registerSchema, resetSchema } from "@/schemas"

const DEMOS = [
  ["admin@nexus.demo", "Super admin"],
  ["manager@nexus.demo", "Org admin"],
  ["pm@nexus.demo", "Project manager"],
  ["developer@nexus.demo", "Developer"],
  ["viewer@nexus.demo", "Viewer"],
]

function continueTo(next: string | null) {
  loadPage(next && next.startsWith("/") && !next.startsWith("//") ? next : "/dashboard")
}

export function LoginForm() {
  const t = useTranslations("auth")
  const errors = useTranslations("errors")
  const validation = useTranslations("validation")
  const params = useSearchParams()
  const [mfa, setMfa] = useState<string | null>(null)
  const [code, setCode] = useState("")
  const form = useForm<z.infer<typeof loginSchema>>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: "", password: "" },
  })
  const mutation = useMutation({
    mutationFn: (values: z.infer<typeof loginSchema>) =>
      api<{ mfaRequired: boolean; challengeToken?: string }>("/api/v1/auth/login", {
        method: "POST",
        body: JSON.stringify(values),
      }),
    onSuccess: (result) => {
      if (result.data.mfaRequired && result.data.challengeToken) {
        setMfa(result.data.challengeToken)
        return
      }
      continueTo(params.get("next"))
    },
    onError: (error) => toast.error(errorText(errors, error)),
  })
  const mfaMutation = useMutation({
    mutationFn: () =>
      api("/api/v1/auth/mfa", { method: "POST", body: JSON.stringify({ challengeToken: mfa, code }) }),
    onSuccess: () => {
      continueTo("/dashboard")
    },
    onError: (error) => toast.error(errorText(errors, error)),
  })

  return (
    <AuthCard title={t("welcome")}>
      {mfa ? (
        <form
          className="grid gap-3"
          onSubmit={(event) => {
            event.preventDefault()
            mfaMutation.mutate()
          }}
        >
          <p className="text-sm text-muted-foreground">{t("mfaHint")}</p>
          <Input value={code} onChange={(event) => setCode(event.target.value)} aria-label={t("mfa")} inputMode="numeric" />
          <Button type="submit" disabled={mfaMutation.isPending}>
            {t("submitLogin")}
          </Button>
        </form>
      ) : (
        <form className="grid gap-3" onSubmit={form.handleSubmit((values) => mutation.mutate(values))}>
          <label className="grid gap-1 text-sm">
            {t("email")}
            <Input type="email" autoComplete="email" {...form.register("email")} />
            {form.formState.errors.email ? <span className="text-xs text-destructive">{fieldText(validation, form.formState.errors.email.message)}</span> : null}
          </label>
          <label className="grid gap-1 text-sm">
            {t("password")}
            <Input type="password" autoComplete="current-password" {...form.register("password")} />
          </label>
          <Button type="submit" disabled={mutation.isPending} data-testid="login-submit">
            {t("submitLogin")}
          </Button>
        </form>
      )}
      <div className="mt-4 flex justify-between text-sm">
        <Link href="/forgot-password" className="text-muted-foreground hover:text-foreground">
          {t("forgotLink")}
        </Link>
        <Link href="/register" className="hover:underline">
          {t("noAccount")}
        </Link>
      </div>
      <details className="mt-6 rounded-lg border p-3 text-sm">
        <summary className="cursor-pointer font-medium">{t("demoTitle")}</summary>
        <p className="mt-2 text-muted-foreground">{t("demoHint")}</p>
        <p className="mt-1">{t("demoPassword")}</p>
        <div className="mt-3 grid gap-2">
          {DEMOS.map(([email, label]) => (
            <button
              key={email}
              type="button"
              className="rounded-md border px-2 py-1 text-start hover:bg-muted"
              onClick={() => {
                form.setValue("email", email)
                form.setValue("password", "NexusDemo!2026")
              }}
            >
              {label} · {email}
            </button>
          ))}
        </div>
      </details>
    </AuthCard>
  )
}

export function RegisterForm() {
  const t = useTranslations("auth")
  const validation = useTranslations("validation")
  const errors = useTranslations("errors")
  const config = useQuery({
    queryKey: ["public-config"],
    queryFn: async () => (await api<{ passwordMinLength: number }>("/api/v1/public/config")).data,
  })
  const min = config.data?.passwordMinLength ?? 8
  const form = useForm<z.infer<ReturnType<typeof registerSchema>>>({
    resolver: zodResolver(registerSchema(min)),
    defaultValues: { name: "", email: "", password: "", organizationName: "" },
  })
  const [link, setLink] = useState<string | null>(null)
  const mutation = useMutation({
    mutationFn: (values: z.infer<ReturnType<typeof registerSchema>>) =>
      api<{ devVerificationPath: string }>("/api/v1/auth/register", { method: "POST", body: JSON.stringify(values) }),
    onSuccess: (result) => setLink(result.data.devVerificationPath),
    onError: (error) => toast.error(error instanceof ApiError ? errorText(errors, error) : errors("generic")),
  })
  return (
    <AuthCard title={t("register")}>
      <form className="grid gap-3" onSubmit={form.handleSubmit((values) => mutation.mutate(values))}>
        <Input placeholder={t("name")} aria-label={t("name")} {...form.register("name")} />
        <Input placeholder={t("email")} aria-label={t("email")} {...form.register("email")} />
        <Input placeholder={t("password")} aria-label={t("password")} type="password" {...form.register("password")} />
        {form.formState.errors.password ? <span className="text-xs text-destructive">{fieldText(validation, form.formState.errors.password.message)}</span> : null}
        <Input placeholder={t("organization")} aria-label={t("organization")} {...form.register("organizationName")} />
        <Button type="submit" disabled={mutation.isPending}>
          {t("submitRegister")}
        </Button>
      </form>
      {link ? (
        <p className="mt-3 text-sm">
          {t("devLink")}: <Link href={link}>{link}</Link>
        </p>
      ) : null}
      <Link href="/login" className="mt-4 block text-sm">
        {t("hasAccount")}
      </Link>
    </AuthCard>
  )
}

export function ForgotForm() {
  const t = useTranslations("auth")
  const errors = useTranslations("errors")
  const form = useForm<z.infer<typeof forgotSchema>>({ resolver: zodResolver(forgotSchema), defaultValues: { email: "" } })
  const [link, setLink] = useState<string | null>(null)
  const mutation = useMutation({
    mutationFn: (values: z.infer<typeof forgotSchema>) =>
      api<{ sent: boolean; devResetPath?: string }>("/api/v1/auth/forgot-password", {
        method: "POST",
        body: JSON.stringify(values),
      }),
    onSuccess: (result) => {
      toast.success(t("sent"))
      setLink(result.data.devResetPath ?? null)
    },
    onError: (error) => toast.error(errorText(errors, error)),
  })
  return (
    <AuthCard title={t("forgot")}>
      <form className="grid gap-3" onSubmit={form.handleSubmit((values) => mutation.mutate(values))}>
        <Input type="email" aria-label={t("email")} {...form.register("email")} />
        <Button type="submit" disabled={mutation.isPending}>
          {t("submitForgot")}
        </Button>
      </form>
      {link ? (
        <Link className="mt-3 block text-sm" href={link}>
          {t("devLink")}
        </Link>
      ) : null}
    </AuthCard>
  )
}

export function ResetForm() {
  const t = useTranslations("auth")
  const errors = useTranslations("errors")
  const params = useSearchParams()
  const router = useRouter()
  const form = useForm({ resolver: zodResolver(resetSchema(8)), defaultValues: { token: params.get("token") ?? "", password: "" } })
  const mutation = useMutation({
    mutationFn: (values: { token: string; password: string }) =>
      api("/api/v1/auth/reset-password", { method: "POST", body: JSON.stringify(values) }),
    onSuccess: () => {
      toast.success(t("resetDone"))
      router.push("/login")
    },
    onError: (error) => toast.error(errorText(errors, error)),
  })
  return (
    <AuthCard title={t("reset")}>
      <form className="grid gap-3" onSubmit={form.handleSubmit((values) => mutation.mutate(values))}>
        <Input type="password" aria-label={t("password")} {...form.register("password")} />
        <Button type="submit" disabled={mutation.isPending}>
          {t("submitReset")}
        </Button>
      </form>
    </AuthCard>
  )
}

export function VerifyForm() {
  const t = useTranslations("auth")
  const errors = useTranslations("errors")
  const params = useSearchParams()
  const mutation = useMutation({
    mutationFn: () => api("/api/v1/auth/verify-email", { method: "POST", body: JSON.stringify({ token: params.get("token") }) }),
    onSuccess: () => toast.success(t("verified")),
    onError: (error) => toast.error(errorText(errors, error)),
  })
  return (
    <AuthCard title={t("verify")}>
      <Button onClick={() => mutation.mutate()} disabled={mutation.isPending || mutation.isSuccess}>
        {t("submitVerify")}
      </Button>
      {mutation.isSuccess ? (
        <Link href="/login" className="mt-4 block text-sm">
          {t("login")}
        </Link>
      ) : null}
    </AuthCard>
  )
}

function AuthCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <main className="mx-auto flex min-h-screen w-full max-w-md flex-col justify-center px-4 py-10">
      <p className="mb-2 text-sm font-medium text-muted-foreground">Nexus</p>
      <h1 className="mb-6 text-2xl font-semibold tracking-tight">{title}</h1>
      {children}
    </main>
  )
}
