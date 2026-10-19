import { randomBytes, scryptSync } from "node:crypto"
import { mkdirSync, writeFileSync } from "node:fs"
import { dirname, join } from "node:path"
import { fileURLToPath } from "node:url"

const root = join(dirname(fileURLToPath(import.meta.url)), "..", "src", "data")
const NOW = new Date("2026-10-06T08:00:00.000Z")

function iso(date) {
  return new Date(date).toISOString()
}

function addDays(date, days) {
  const next = new Date(date)
  next.setUTCDate(next.getUTCDate() + days)
  return next
}

function hashPassword(password) {
  const salt = randomBytes(16).toString("hex")
  const hash = scryptSync(password, salt, 64).toString("hex")
  return `scrypt$${salt}$${hash}`
}

const passwordHash = hashPassword("NexusDemo!2026")

const PERMISSIONS = [
  ["project:create", "Create projects in the active organization"],
  ["project:read", "View projects and project details"],
  ["project:update", "Edit projects, members, and project settings"],
  ["project:delete", "Delete or archive projects"],
  ["task:create", "Create tasks"],
  ["task:read", "View tasks"],
  ["task:update", "Edit tasks, status, priority, and comments"],
  ["task:delete", "Delete tasks"],
  ["task:assign", "Assign tasks to members"],
  ["user:invite", "Invite people into the organization"],
  ["user:read", "View organization members"],
  ["user:update", "Edit members and change roles"],
  ["user:remove", "Remove or disable members"],
  ["report:view", "View operational reports"],
  ["settings:read", "View organization and account settings"],
  ["settings:update", "Update settings and system configuration"],
  ["audit:view", "View the audit log"],
  ["feature_flag:read", "View feature flags"],
  ["feature_flag:update", "Enable or disable feature flags"],
]

const ALL = PERMISSIONS.map(([key]) => key)

const ROLES = [
  {
    id: "role_super_admin",
    key: "SUPER_ADMIN",
    name: "Super Admin",
    description: "Full access across every organization the account belongs to.",
    permissions: ALL,
  },
  {
    id: "role_org_admin",
    key: "ORG_ADMIN",
    name: "Organization Admin",
    description: "Manages people, projects, and the audit log inside one organization.",
    permissions: ALL.filter((key) => !["settings:update", "feature_flag:read", "feature_flag:update"].includes(key)),
  },
  {
    id: "role_project_manager",
    key: "PROJECT_MANAGER",
    name: "Project Manager",
    description: "Can manage projects and tasks and view reports.",
    permissions: [
      "project:create",
      "project:read",
      "project:update",
      "project:delete",
      "task:create",
      "task:read",
      "task:update",
      "task:delete",
      "task:assign",
      "user:read",
      "report:view",
      "settings:read",
    ],
  },
  {
    id: "role_developer",
    key: "DEVELOPER",
    name: "Developer",
    description: "Can update assigned work and collaborate on tasks.",
    permissions: [
      "project:read",
      "task:create",
      "task:read",
      "task:update",
      "task:assign",
      "user:read",
      "settings:read",
    ],
  },
  {
    id: "role_viewer",
    key: "VIEWER",
    name: "Viewer",
    description: "Read-only access to projects, tasks, and reports.",
    permissions: ["project:read", "task:read", "report:view", "settings:read", "user:read"],
  },
]

const PEOPLE = [
  ["usr_admin", "Avery Chen", "admin@nexus.demo", "Platform Administrator", "AC"],
  ["usr_manager", "Rahul Sharma", "manager@nexus.demo", "Director of Engineering", "RS"],
  ["usr_pm", "Priya Nair", "pm@nexus.demo", "Project Manager", "PN"],
  ["usr_dev", "Jordan Blake", "developer@nexus.demo", "Software Engineer", "JB"],
  ["usr_viewer", "Samir Patel", "viewer@nexus.demo", "Business Analyst", "SP"],
  ["usr_006", "Mei Lin", "mei.lin@acme.example", "Engineering Manager", "ML"],
  ["usr_007", "Diego Alvarez", "diego.alvarez@acme.example", "Backend Engineer", "DA"],
  ["usr_008", "Hannah Berg", "hannah.berg@acme.example", "Frontend Engineer", "HB"],
  ["usr_009", "Kenji Sato", "kenji.sato@acme.example", "QA Lead", "KS"],
  ["usr_010", "Amira Hassan", "amira.hassan@acme.example", "Product Designer", "AH"],
  ["usr_011", "Noah Williams", "noah.williams@globex.example", "Program Manager", "NW"],
  ["usr_012", "Sofia Rossi", "sofia.rossi@globex.example", "Data Engineer", "SR"],
  ["usr_013", "Liam O'Connor", "liam.oconnor@globex.example", "Site Reliability Engineer", "LO"],
  ["usr_014", "Chloe Martin", "chloe.martin@globex.example", "Product Manager", "CM"],
  ["usr_015", "Omar Farouk", "omar.farouk@globex.example", "Security Engineer", "OF"],
  ["usr_016", "Elena Petrova", "elena.petrova@initech.example", "Operations Lead", "EP"],
  ["usr_017", "Thomas Wright", "thomas.wright@initech.example", "Full Stack Engineer", "TW"],
  ["usr_018", "Aisha Khan", "aisha.khan@initech.example", "Support Manager", "AK"],
  ["usr_019", "Lucas Ferreira", "lucas.ferreira@acme.example", "Mobile Engineer", "LF"],
  ["usr_020", "Nora Ibrahim", "nora.ibrahim@acme.example", "Compliance Officer", "NI"],
  ["usr_021", "Hugo Bernard", "hugo.bernard@globex.example", "Solutions Architect", "HB"],
  ["usr_022", "Yuki Tanaka", "yuki.tanaka@initech.example", "Operations Analyst", "YT"],
  ["usr_023", "Grace Adeyemi", "grace.adeyemi@acme.example", "Scrum Master", "GA"],
  ["usr_024", "Felix Novak", "felix.novak@globex.example", "Finance Partner", "FN"],
]

const ORGS = [
  {
    id: "org_acme",
    name: "Acme Corporation",
    slug: "acme",
    plan: "PRO",
    defaultLanguage: "en",
    defaultTheme: "dark",
    timezone: "Asia/Kolkata",
    createdAt: "2026-01-15T10:00:00.000Z",
  },
  {
    id: "org_globex",
    name: "Globex Corporation",
    slug: "globex",
    plan: "ENTERPRISE",
    defaultLanguage: "en",
    defaultTheme: "light",
    timezone: "America/New_York",
    createdAt: "2025-11-02T15:00:00.000Z",
  },
  {
    id: "org_initech",
    name: "Initech",
    slug: "initech",
    plan: "STARTER",
    defaultLanguage: "fr",
    defaultTheme: "system",
    timezone: "Europe/Paris",
    createdAt: "2026-03-20T09:00:00.000Z",
  },
]

const MEMBERSHIPS = [
  ["usr_admin", "org_acme", "role_super_admin"],
  ["usr_admin", "org_globex", "role_super_admin"],
  ["usr_admin", "org_initech", "role_super_admin"],
  ["usr_manager", "org_acme", "role_org_admin"],
  ["usr_manager", "org_globex", "role_viewer"],
  ["usr_pm", "org_acme", "role_project_manager"],
  ["usr_dev", "org_acme", "role_developer"],
  ["usr_dev", "org_globex", "role_developer"],
  ["usr_viewer", "org_acme", "role_viewer"],
  ["usr_006", "org_acme", "role_org_admin"],
  ["usr_007", "org_acme", "role_developer"],
  ["usr_008", "org_acme", "role_developer"],
  ["usr_009", "org_acme", "role_developer"],
  ["usr_010", "org_acme", "role_developer"],
  ["usr_019", "org_acme", "role_developer"],
  ["usr_020", "org_acme", "role_viewer"],
  ["usr_023", "org_acme", "role_project_manager"],
  ["usr_011", "org_globex", "role_project_manager"],
  ["usr_012", "org_globex", "role_developer"],
  ["usr_013", "org_globex", "role_developer"],
  ["usr_014", "org_globex", "role_org_admin"],
  ["usr_015", "org_globex", "role_developer"],
  ["usr_021", "org_globex", "role_project_manager"],
  ["usr_024", "org_globex", "role_viewer"],
  ["usr_016", "org_initech", "role_org_admin"],
  ["usr_017", "org_initech", "role_developer"],
  ["usr_018", "org_initech", "role_project_manager"],
  ["usr_022", "org_initech", "role_viewer"],
]

const PROJECTS = [
  ["prj_001", "org_acme", "Mobile Banking App", "Next generation mobile banking platform for retail customers.", "ACTIVE", "HIGH", "usr_pm", "2026-07-01", "2026-12-15", ["usr_pm", "usr_dev", "usr_manager", "usr_007", "usr_008", "usr_019"]],
  ["prj_002", "org_acme", "Customer Portal Redesign", "Rebuild the authenticated customer portal around the new design system.", "ACTIVE", "MEDIUM", "usr_023", "2026-08-01", "2026-11-30", ["usr_023", "usr_008", "usr_010", "usr_dev"]],
  ["prj_003", "org_acme", "Payments Reconciliation", "Automate ledger matching for card and transfer settlements.", "ON_HOLD", "HIGH", "usr_006", "2026-05-12", "2026-10-31", ["usr_006", "usr_007", "usr_020"]],
  ["prj_004", "org_acme", "Internal Design System", "Shared UI kit, tokens, and accessibility guidelines for product teams.", "COMPLETED", "MEDIUM", "usr_010", "2026-02-01", "2026-08-15", ["usr_010", "usr_008", "usr_pm"]],
  ["prj_005", "org_acme", "Fraud Detection Pipeline", "Streaming rules and case review for suspicious payment activity.", "PLANNING", "URGENT", "usr_manager", "2026-10-01", "2027-02-28", ["usr_manager", "usr_007", "usr_009", "usr_020"]],
  ["prj_006", "org_acme", "Branch Kiosk Rollout", "Retired pilot for in-branch self-service kiosks.", "ARCHIVED", "LOW", "usr_pm", "2025-09-01", "2026-03-31", ["usr_pm", "usr_019"]],
  ["prj_007", "org_globex", "Supply Chain Visibility", "Track shipments, exceptions, and ETAs across regional warehouses.", "ACTIVE", "HIGH", "usr_011", "2026-06-01", "2026-12-20", ["usr_011", "usr_012", "usr_013", "usr_dev"]],
  ["prj_008", "org_globex", "Vendor Portal", "Let suppliers update orders, invoices, and compliance documents.", "ACTIVE", "MEDIUM", "usr_014", "2026-04-15", "2026-11-01", ["usr_014", "usr_015", "usr_021"]],
  ["prj_009", "org_globex", "Warehouse Robotics Pilot", "Evaluate autonomous pick robots in the Newark facility.", "PLANNING", "HIGH", "usr_021", "2026-10-06", "2027-04-01", ["usr_021", "usr_013", "usr_012"]],
  ["prj_010", "org_globex", "ESG Reporting", "Collect emissions and supplier data for the annual report.", "COMPLETED", "LOW", "usr_024", "2026-01-10", "2026-06-30", ["usr_024", "usr_014"]],
  ["prj_011", "org_initech", "HR Self-Service", "Employee profiles, time off, and policy acknowledgements.", "ACTIVE", "MEDIUM", "usr_018", "2026-07-20", "2026-12-01", ["usr_018", "usr_017", "usr_016"]],
  ["prj_012", "org_initech", "Legacy Billing Migration", "Move remaining invoices off the on-prem billing host.", "ON_HOLD", "URGENT", "usr_016", "2026-03-01", "2026-10-30", ["usr_016", "usr_017", "usr_022"]],
  ["prj_013", "org_initech", "Office Intranet Refresh", "Replace the static intranet with searchable internal pages.", "PLANNING", "LOW", "usr_022", "2026-09-15", "2027-01-15", ["usr_022", "usr_018"]],
]

const TEMPLATES = [
  ["Implement JWT authentication", "Implement access and refresh token authentication.", ["authentication", "security"]],
  ["Add session revocation", "Allow a user to revoke one session or every other device.", ["authentication", "security"]],
  ["Design empty states", "Specify empty, loading, and error states for primary lists.", ["design", "ux"]],
  ["Write API contract tests", "Cover success, validation, and permission envelopes.", ["testing", "api"]],
  ["Index audit events", "Make audit search fast enough for a 90 day window.", ["audit", "backend"]],
  ["Tune notification copy", "Rewrite assignment and due-soon messages for clarity.", ["notifications", "content"]],
  ["Build filter query parser", "Keep status, priority, and page in the URL.", ["frontend", "filters"]],
  ["Review access control", "Confirm every mutation checks organization and permission.", ["security", "rbac"]],
  ["Add keyboard shortcuts", "Open search with Command K and move through results.", ["accessibility", "search"]],
  ["Profile dashboard queries", "Avoid refetching chart data on every sidebar click.", ["performance", "dashboard"]],
  ["Localize validation errors", "Return translation keys instead of hardcoded sentences.", ["i18n", "forms"]],
  ["Support right-to-left layout", "Use logical properties so Arabic mirrors the shell.", ["i18n", "rtl"]],
  ["Define design tokens", "Expose brand colors only through CSS variables.", ["design", "theming"]],
  ["Seed realistic fixtures", "Give pagination enough varied rows to be meaningful.", ["data", "testing"]],
  ["Handle optimistic rollback", "Restore the previous card if a status update fails.", ["frontend", "kanban"]],
  ["Document rate limits", "Show a clear message when login or search is limited.", ["security", "api"]],
  ["Map team workload", "Count open tasks per assignee for the dashboard.", ["dashboard", "reporting"]],
  ["Close overdue follow-ups", "Surface tasks past due that are not done.", ["tasks", "reporting"]],
  ["Invite external reviewer", "Send an invitation that stays pending until accepted.", ["users", "admin"]],
  ["Capture feature flag changes", "Write an audit event when a flag is toggled.", ["audit", "flags"]],
  ["Set password policy", "Read minimum length from system configuration.", ["security", "config"]],
  ["Prepare mobile board", "Keep Kanban columns usable in a horizontal scroller.", ["kanban", "mobile"]],
  ["Attach design spec", "Store attachment metadata without a binary upload.", ["tasks", "files"]],
  ["Reconcile project progress", "Derive progress from completed tasks.", ["projects", "reporting"]],
  ["Guard cross-org reads", "Return not found when an id belongs to another tenant.", ["security", "tenancy"]],
  ["Refresh access tokens", "Rotate the refresh token and reject reused hashes.", ["authentication", "api"]],
  ["Add comment mentions", "Notify the mentioned member inside the organization.", ["notifications", "tasks"]],
  ["Sort the member table", "Allow name and role sorting without losing filters.", ["users", "tables"]],
  ["Check contrast tokens", "Keep text readable in high contrast mode.", ["accessibility", "theming"]],
  ["Schedule daily digest", "Respect the organization notification configuration.", ["notifications", "config"]],
  ["Archive stale project", "Move a finished project to archived without deleting history.", ["projects"]],
  ["Split reviewer queue", "Separate in-review tasks from active implementation.", ["kanban", "workflow"]],
  ["Label security work", "Tag authentication tasks so they can be filtered.", ["tasks", "security"]],
  ["Verify email handoff", "Block sign-in until the verification token is used.", ["authentication"]],
  ["Export report snapshot", "Summarize completion for the selected date range.", ["reporting"]],
  ["Reduce layout shift", "Reserve space for skeleton loaders on first paint.", ["frontend", "performance"]],
]

const STATUSES = ["BACKLOG", "TODO", "IN_PROGRESS", "IN_REVIEW", "DONE", "TODO", "IN_PROGRESS", "DONE", "BACKLOG"]
const PRIORITIES = ["LOW", "MEDIUM", "HIGH", "URGENT", "MEDIUM", "HIGH", "LOW", "MEDIUM", "HIGH"]

const users = PEOPLE.map(([id, name, email, title, initials], index) => ({
  id,
  name,
  email,
  passwordHash,
  status: "ACTIVE",
  title,
  initials,
  emailVerified: true,
  locale: id === "usr_022" ? "fr" : id === "usr_018" ? "ar" : "en",
  theme: index % 5 === 0 ? "dark" : "system",
  highContrast: false,
  createdAt: iso(addDays(NOW, -220 + index)),
  updatedAt: iso(addDays(NOW, -index)),
}))

const memberships = MEMBERSHIPS.map(([userId, organizationId, roleId], index) => ({
  id: `mem_${String(index + 1).padStart(3, "0")}`,
  userId,
  organizationId,
  roleIds: [roleId],
  status: "ACTIVE",
  joinedAt: iso(addDays(NOW, -180 + index)),
}))

const tasks = []
const comments = []
let taskNumber = 1
let commentNumber = 1

for (const project of PROJECTS) {
  const [projectId, organizationId, , , , , ownerId, , , memberIds] = project
  const projectIndex = PROJECTS.findIndex((item) => item[0] === projectId)
  for (let slot = 0; slot < 9; slot += 1) {
    const template = TEMPLATES[(projectIndex * 3 + slot) % TEMPLATES.length]
    const special = projectId === "prj_001" && slot === 0
    const status = special ? "IN_PROGRESS" : STATUSES[(slot + projectIndex) % STATUSES.length]
    const priority = special ? "HIGH" : PRIORITIES[(slot + projectIndex) % PRIORITIES.length]
    const assigneeId = special ? "usr_dev" : memberIds[slot % memberIds.length]
    const reporterId = ownerId
    const created = addDays(NOW, -70 + ((taskNumber * 3) % 60))
    const updated = status === "DONE" ? addDays(NOW, -(taskNumber % 45)) : addDays(NOW, -(taskNumber % 8))
    const due = special
      ? new Date("2026-10-15T00:00:00.000Z")
      : status !== "DONE" && slot % 4 === 0
        ? addDays(NOW, -((slot % 6) + 2))
        : addDays(NOW, 4 + slot * 4 + (projectIndex % 5))
    const id = `task_${String(taskNumber).padStart(3, "0")}`
    tasks.push({
      id,
      organizationId,
      projectId,
      title: special ? "Implement JWT authentication" : `${template[0]}`,
      description: special ? "Implement access and refresh token authentication." : template[1],
      status,
      priority,
      assigneeId,
      reporterId,
      labels: special ? ["authentication", "security"] : template[2],
      dueDate: iso(due).slice(0, 10),
      createdAt: iso(created),
      updatedAt: iso(updated),
    })
    if (slot % 3 === 0) {
      const authorId = memberIds[(slot + 1) % memberIds.length]
      comments.push({
        id: `cmt_${String(commentNumber).padStart(3, "0")}`,
        organizationId,
        taskId: id,
        authorId,
        body: slot === 0 && projectId === "prj_001"
          ? "Please keep refresh tokens hashed and rotate them on use."
          : `Reviewed the approach for “${template[0]}”. Leaving notes before we move it forward.`,
        createdAt: iso(addDays(updated, 0)),
      })
      commentNumber += 1
    }
    taskNumber += 1
  }
}

const projects = PROJECTS.map((project) => {
  const [id, organizationId, name, description, status, priority, ownerId, startDate, dueDate, memberIds] = project
  const related = tasks.filter((task) => task.projectId === id)
  const done = related.filter((task) => task.status === "DONE").length
  const progress = Math.round((done / related.length) * 100)
  return {
    id,
    organizationId,
    name,
    description,
    status,
    priority,
    ownerId,
    progress,
    startDate,
    dueDate,
    memberIds,
    createdAt: `${startDate}T10:00:00.000Z`,
    updatedAt: iso(addDays(NOW, -((id.charCodeAt(id.length - 1) % 12) + 1))),
  }
})

const notifications = []
const demoUsers = ["usr_admin", "usr_manager", "usr_pm", "usr_dev", "usr_viewer", "usr_007", "usr_011", "usr_017"]
const notificationTypes = ["TASK_ASSIGNED", "TASK_COMMENTED", "TASK_MENTIONED", "TASK_DUE_SOON", "TASK_OVERDUE", "PROJECT_UPDATED", "USER_INVITED", "SYSTEM_ALERT"]
for (let index = 0; index < 56; index += 1) {
  const userId = demoUsers[index % demoUsers.length]
  const membership = memberships.find((item) => item.userId === userId)
  const orgTasks = tasks.filter((task) => task.organizationId === membership.organizationId)
  const task = orgTasks[index % orgTasks.length]
  const project = projects.find((item) => item.id === task.projectId)
  const type = notificationTypes[index % notificationTypes.length]
  const title = {
    TASK_ASSIGNED: "Task assigned to you",
    TASK_COMMENTED: "New comment on a task",
    TASK_MENTIONED: "You were mentioned",
    TASK_DUE_SOON: "Task due soon",
    TASK_OVERDUE: "Task is overdue",
    PROJECT_UPDATED: "Project updated",
    USER_INVITED: "Invitation sent",
    SYSTEM_ALERT: "System notice",
  }[type]
  notifications.push({
    id: `ntf_${String(index + 1).padStart(3, "0")}`,
    organizationId: membership.organizationId,
    userId,
    type,
    title,
    message:
      type === "PROJECT_UPDATED"
        ? `${project.name} was updated.`
        : type === "USER_INVITED"
          ? "A teammate was invited to the organization."
          : type === "SYSTEM_ALERT"
            ? "Session timeout configuration was reviewed."
            : `Update on “${task.title}”.`,
    read: index % 3 === 0,
    createdAt: iso(addDays(NOW, -(index % 20))),
    metadata: { taskId: task.id, projectId: project.id },
  })
}

const actions = ["USER_LOGIN", "USER_LOGOUT", "USER_INVITED", "USER_ROLE_CHANGED", "PROJECT_CREATED", "PROJECT_UPDATED", "TASK_CREATED", "TASK_ASSIGNED", "TASK_STATUS_CHANGED", "SETTINGS_UPDATED", "FEATURE_FLAG_CHANGED"]
const auditLogs = Array.from({ length: 36 }, (_, index) => {
  const action = actions[index % actions.length]
  const task = tasks[index % tasks.length]
  const project = projects.find((item) => item.id === task.projectId)
  const actor = memberships.filter((item) => item.organizationId === project.organizationId)[index % 3]
  return {
    id: `aud_${String(index + 1).padStart(3, "0")}`,
    organizationId: project.organizationId,
    userId: actor.userId,
    action,
    resource: action.startsWith("USER") ? "USER" : action.startsWith("PROJECT") || action === "SETTINGS_UPDATED" ? "PROJECT" : action === "FEATURE_FLAG_CHANGED" ? "FEATURE_FLAG" : "TASK",
    resourceId: action.startsWith("PROJECT") ? project.id : action === "FEATURE_FLAG_CHANGED" ? "flag_001" : task.id,
    metadata:
      action === "TASK_STATUS_CHANGED"
        ? { oldStatus: "TODO", newStatus: "IN_PROGRESS" }
        : action === "USER_ROLE_CHANGED"
          ? { oldRole: "DEVELOPER", newRole: "PROJECT_MANAGER" }
          : { name: project.name },
    ipAddress: `192.168.1.${20 + (index % 40)}`,
    userAgent: ["Chrome", "Firefox", "Safari", "Edge"][index % 4],
    timestamp: iso(addDays(NOW, -(index % 40))),
  }
})

const devices = [
  ["Chrome", "Mac", "Mumbai, India"],
  ["Safari", "iPhone", "Bengaluru, India"],
  ["Firefox", "Windows", "London, United Kingdom"],
  ["Edge", "Windows", "New York, United States"],
  ["Chrome", "Linux", "Paris, France"],
  ["Safari", "Mac", "Singapore"],
]
const sessions = Array.from({ length: 12 }, (_, index) => {
  const user = users[index % 8]
  const [browser, device, location] = devices[index % devices.length]
  return {
    id: `ses_${String(index + 1).padStart(3, "0")}`,
    userId: user.id,
    organizationId: memberships.find((item) => item.userId === user.id).organizationId,
    refreshTokenHash: `seed-${index + 1}`,
    browser,
    device,
    location,
    ipAddress: `203.0.113.${10 + index}`,
    userAgent: browser,
    lastActiveAt: iso(addDays(NOW, -(index % 6))),
    createdAt: iso(addDays(NOW, -10 - index)),
    expiresAt: iso(addDays(NOW, 4)),
    revokedAt: index === 11 ? iso(addDays(NOW, -1)) : null,
  }
})

const featureFlags = [
  ["flag_001", "FEATURE_KANBAN", "Enable the drag-and-drop Kanban board", true, ["org_acme", "org_globex", "org_initech"]],
  ["flag_002", "FEATURE_ANALYTICS", "Enable dashboard analytics and the reports area", true, ["org_acme", "org_globex"]],
  ["flag_003", "FEATURE_GLOBAL_SEARCH", "Enable the command palette and global search", true, ["org_acme", "org_globex", "org_initech"]],
  ["flag_004", "FEATURE_NOTIFICATIONS", "Enable in-app notifications", true, ["org_acme", "org_globex", "org_initech"]],
  ["flag_005", "FEATURE_FILE_ATTACHMENTS", "Allow attachment metadata on tasks", true, ["org_acme"]],
  ["flag_006", "FEATURE_HIGH_CONTRAST", "Allow the high contrast theme", true, ["org_acme", "org_globex", "org_initech"]],
  ["flag_007", "FEATURE_AI_ASSISTANT", "Show the assistant entry point", false, ["org_acme"]],
].map(([id, key, description, enabled, organizationIds]) => ({
  id,
  key,
  description,
  enabled,
  organizationIds,
  updatedBy: "usr_admin",
  updatedAt: "2026-10-01T10:00:00.000Z",
}))

const systemConfig = [
  ["AUTH_SESSION_TIMEOUT", "AUTHENTICATION", "NUMBER", 30, "Session timeout in minutes"],
  ["AUTH_MAX_LOGIN_ATTEMPTS", "AUTHENTICATION", "NUMBER", 5, "Failed sign-in attempts before a temporary lock"],
  ["AUTH_PASSWORD_MIN_LENGTH", "AUTHENTICATION", "NUMBER", 8, "Minimum password length"],
  ["AUTH_MFA_REQUIRED", "AUTHENTICATION", "BOOLEAN", false, "Require a second factor at sign-in"],
  ["AUTH_REFRESH_TOKEN_DAYS", "AUTHENTICATION", "NUMBER", 7, "Refresh token lifetime in days"],
  ["PROJECTS_MAX", "PROJECTS", "NUMBER", 50, "Maximum projects per organization"],
  ["PROJECTS_DEFAULT_STATUS", "PROJECTS", "STRING", "PLANNING", "Status applied when a project is created"],
  ["PROJECTS_ALLOW_CREATION", "PROJECTS", "BOOLEAN", true, "Allow members with permission to create projects"],
  ["PROJECTS_ALLOW_ARCHIVE", "PROJECTS", "BOOLEAN", true, "Allow projects to be archived"],
  ["TASKS_ALLOW_ASSIGNMENT", "TASKS", "BOOLEAN", true, "Allow tasks to be assigned"],
  ["TASKS_DEFAULT_PRIORITY", "TASKS", "STRING", "MEDIUM", "Priority applied when a task is created"],
  ["TASKS_ALLOW_ATTACHMENTS", "TASKS", "BOOLEAN", true, "Allow attachment metadata on tasks"],
  ["TASKS_MAX_LABELS", "TASKS", "NUMBER", 8, "Maximum labels on a task"],
  ["NOTIFICATIONS_EMAIL", "NOTIFICATIONS", "BOOLEAN", true, "Enable email notification delivery"],
  ["NOTIFICATIONS_IN_APP", "NOTIFICATIONS", "BOOLEAN", true, "Enable in-app notifications"],
  ["NOTIFICATIONS_DAILY_DIGEST", "NOTIFICATIONS", "BOOLEAN", false, "Send a daily digest"],
  ["NOTIFICATIONS_DUE_SOON_DAYS", "NOTIFICATIONS", "NUMBER", 3, "Days before a due date to warn"],
  ["UI_DEFAULT_LANGUAGE", "UI", "STRING", "en", "Default interface language"],
  ["UI_DEFAULT_THEME", "UI", "STRING", "system", "Default color theme"],
  ["UI_COMPACT_MODE", "UI", "BOOLEAN", false, "Use compact density by default"],
  ["UI_DEFAULT_DENSITY", "UI", "STRING", "comfortable", "Default interface density"],
  ["AUDIT_RETENTION_DAYS", "UI", "NUMBER", 365, "Days to retain audit events"],
].map(([key, category, type, value, description]) => ({
  key,
  category,
  type,
  value,
  description,
  updatedBy: "usr_admin",
  updatedAt: "2026-10-01T10:00:00.000Z",
}))

const themes = [
  {
    organizationId: "org_acme",
    primary: "oklch(0.45 0.14 255)",
    primaryForeground: "oklch(0.985 0 0)",
    secondary: "oklch(0.94 0.02 255)",
    secondaryForeground: "oklch(0.28 0.04 255)",
    logoText: "Acme",
    radius: "0.5rem",
    density: "comfortable",
  },
  {
    organizationId: "org_globex",
    primary: "oklch(0.46 0.11 175)",
    primaryForeground: "oklch(0.985 0 0)",
    secondary: "oklch(0.94 0.02 175)",
    secondaryForeground: "oklch(0.25 0.04 175)",
    logoText: "Globex",
    radius: "0.75rem",
    density: "comfortable",
  },
  {
    organizationId: "org_initech",
    primary: "oklch(0.52 0.12 55)",
    primaryForeground: "oklch(0.18 0.02 55)",
    secondary: "oklch(0.95 0.03 80)",
    secondaryForeground: "oklch(0.28 0.04 55)",
    logoText: "Initech",
    radius: "0.25rem",
    density: "compact",
  },
]

const attachments = tasks.slice(0, 8).map((task, index) => ({
  id: `att_${String(index + 1).padStart(3, "0")}`,
  organizationId: task.organizationId,
  taskId: task.id,
  fileName: ["auth-flow.pdf", "wireframe.png", "threat-model.md", "api-notes.txt"][index % 4],
  sizeBytes: 48000 + index * 12000,
  createdBy: task.reporterId,
  createdAt: task.updatedAt,
}))

const notificationPreferences = memberships.map((membership) => ({
  userId: membership.userId,
  organizationId: membership.organizationId,
  emailEnabled: true,
  inAppEnabled: true,
  digestEnabled: false,
}))

const files = {
  "users.json": users,
  "organizations.json": ORGS,
  "memberships.json": memberships,
  "roles.json": ROLES,
  "permissions.json": PERMISSIONS.map(([key, description]) => ({ key, description })),
  "projects.json": projects,
  "tasks.json": tasks,
  "comments.json": comments,
  "notifications.json": notifications,
  "sessions.json": sessions,
  "audit-logs.json": auditLogs,
  "feature-flags.json": featureFlags,
  "system-config.json": systemConfig,
  "themes.json": themes,
  "attachments.json": attachments,
  "notification-preferences.json": notificationPreferences,
}

mkdirSync(root, { recursive: true })
for (const [name, value] of Object.entries(files)) {
  writeFileSync(join(root, name), `${JSON.stringify(value, null, 2)}\n`)
}

console.log(
  `Seeded ${users.length} users, ${projects.length} projects, ${tasks.length} tasks, ${notifications.length} notifications, ${auditLogs.length} audit logs.`,
)
