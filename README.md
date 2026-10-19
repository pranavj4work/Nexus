# Nexus
Nexus is a multi-tenant project management app built in Next.js. Typed mock APIs, cookie sessions, role-based access, organization isolation, and screens that stay usable when the data layer is swapped later.

## Setup
Requirements: Node.js 20+ and npm.

```bash
npm install
cp .env.example .env.local
npm run dev
```

## Demo accounts

Every account uses the password `NexusDemo!2026`. These identities exist only in the seed data.

| Email | Role in the default organization |
| --- | --- |
| `admin@nexus.demo` | Super Admin. Member of Acme, Globex, and Initech. Can switch into any organization. |
| `manager@nexus.demo` | Organization Admin at Acme. |
| `pm@nexus.demo` | Project Manager at Acme. |
| `developer@nexus.demo` | Developer at Acme. |
| `viewer@nexus.demo` | Viewer at Acme. Cannot create projects or tasks. |

The login page lists these accounts and fills the form when you pick one.
