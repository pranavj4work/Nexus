import { Suspense } from "react"
import { RegisterForm } from "@/features/auth/auth-forms"

export default function RegisterPage() {
  return (
    <Suspense>
      <RegisterForm />
    </Suspense>
  )
}
