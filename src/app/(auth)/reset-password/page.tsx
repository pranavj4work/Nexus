import { Suspense } from "react"
import { ResetForm } from "@/features/auth/auth-forms"

export default function ResetPage() {
  return (
    <Suspense>
      <ResetForm />
    </Suspense>
  )
}
