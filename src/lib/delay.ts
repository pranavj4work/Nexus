export async function simulateLatency() {
  const override = process.env.MOCK_API_DELAY_MS
  if (override === "0") return
  const fixed = override ? Number(override) : Number.NaN
  const ms = Number.isFinite(fixed) ? fixed : 100 + Math.floor(Math.random() * 601)
  if (ms <= 0) return
  await new Promise((resolve) => setTimeout(resolve, ms))
}
