import { NextResponse } from "next/server"
import { AppError } from "@/lib/api/errors"
import { createId } from "@/lib/ids"
import type { Pagination } from "@/types/domain"

export function apiSuccess<T>(data: T, pagination?: Pagination, status = 200) {
  return NextResponse.json(
    {
      success: true,
      data,
      ...(pagination ? { pagination } : {}),
      meta: { requestId: createId("req"), timestamp: new Date().toISOString() },
    },
    { status },
  )
}

export function apiFailure(error: unknown) {
  if (error instanceof AppError) {
    return NextResponse.json(
      {
        success: false,
        error: {
          code: error.code,
          message: error.message,
          ...(error.fields ? { fields: error.fields } : {}),
        },
        meta: { requestId: createId("req") },
      },
      { status: error.status },
    )
  }
  console.error(error)
  return NextResponse.json(
    {
      success: false,
      error: { code: "INTERNAL", message: "Something went wrong. Please try again." },
      meta: { requestId: createId("req") },
    },
    { status: 500 },
  )
}

export async function runRoute(handler: () => Promise<Response>) {
  try {
    return await handler()
  } catch (error) {
    return apiFailure(error)
  }
}
