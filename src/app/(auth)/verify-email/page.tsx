import { Suspense } from "react"
import { VerifyForm } from "@/features/auth/auth-forms"

export default function VerifyPage() {
  return (
    <Suspense>
      <VerifyForm />
    </Suspense>
  )
}
