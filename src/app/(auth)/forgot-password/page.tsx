import { Suspense } from "react"
import { ForgotForm } from "@/features/auth/auth-forms"

export default function ForgotPage() {
  return (
    <Suspense>
      <ForgotForm />
    </Suspense>
  )
}
