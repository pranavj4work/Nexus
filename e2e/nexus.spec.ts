import { expect, test, type Page } from "@playwright/test"

async function login(page: Page, email: string) {
  await page.goto("/login", { waitUntil: "networkidle" })
  const emailField = page.getByLabel("Email")
  await emailField.fill(email)
  await expect(emailField).toHaveValue(email)
  await page.getByLabel("Password").fill("NexusDemo!2026")
  await page.getByTestId("login-submit").click()
  await expect(page).toHaveURL(/\/dashboard/, { timeout: 15_000 })
}

test("login reaches the dashboard", async ({ page }) => {
  await login(page, "developer@nexus.demo")
  await expect(page.getByRole("heading", { name: "Dashboard" })).toBeVisible()
})

test("creates a project and a task, then changes status", async ({ page }) => {
  await login(page, "pm@nexus.demo")
  await page.getByRole("navigation", { name: "Main" }).getByRole("link", { name: "Projects" }).click()
  await page.getByTestId("create-project").click()
  const dialog = page.getByRole("dialog")
  await dialog.getByLabel("Name").fill("Interview Workspace")
  await dialog.getByLabel("Description").fill("A project created during the end-to-end test.")
  await dialog.getByRole("button", { name: "Create" }).click()
  await expect(page.getByRole("link", { name: "Interview Workspace" })).toBeVisible()
  await page.getByRole("link", { name: "Interview Workspace" }).click()
  await page.getByRole("navigation", { name: "Project sections" }).getByRole("link", { name: "Tasks" }).click()
  await page.getByTestId("create-task").click()
  const taskDialog = page.getByRole("dialog")
  await taskDialog.getByLabel("Title").fill("Write the status test")
  await taskDialog.getByLabel("Description").fill("Change this task status from the sheet.")
  await taskDialog.getByRole("button", { name: "Create" }).click()
  await page.getByRole("button", { name: "Write the status test" }).click()
  const sheet = page.locator("[data-slot=sheet-content]")
  await sheet.getByLabel("Status").click()
  await page.getByRole("option", { name: "In review" }).click()
  await expect(sheet.getByLabel("Status")).toContainText("In review")
})

test("viewer cannot create a project", async ({ page }) => {
  await login(page, "viewer@nexus.demo")
  await page.goto("/projects")
  await expect(page.getByTestId("create-project")).toHaveCount(0)
})

test("switches theme and language", async ({ page }) => {
  await login(page, "developer@nexus.demo")
  await page.getByTestId("theme-trigger").click()
  await page.getByRole("menuitem", { name: "Dark" }).click()
  await expect(page.locator("html")).toHaveClass(/dark/)
  await page.getByTestId("locale-trigger").click()
  await page.getByRole("menuitem", { name: "HI" }).click()
  await expect(page.getByRole("link", { name: "परियोजनाएँ" })).toBeVisible()
})
