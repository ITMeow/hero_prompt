# Project Context: ShipAny Template Two

## Overview
**ShipAny Template Two** is a comprehensive AI SaaS boilerplate built with modern web technologies. It is designed to be a starting point for AI-driven applications, featuring authentication, payments, internationalization, and a documentation system.

## Tech Stack
*   **Framework:** Next.js 16 (App Router)
*   **Language:** TypeScript
*   **Styling:** Tailwind CSS v4, Shadcn UI, Framer Motion
*   **Database:** PostgreSQL (via `postgres` driver), Drizzle ORM
*   **Authentication:** Better Auth
*   **AI Integration:** Vercel AI SDK (`ai`), Google GenAI, Replicate, OpenRouter
*   **Content:** Fumadocs (MDX-based documentation and blog)
*   **Internationalization:** `next-intl`
*   **Deployment:** Vercel, Cloudflare (OpenNext)

## Project Structure

### Key Directories
*   `src/app`: Next.js App Router pages and API routes.
    *   `[locale]`: Internationalized routes.
    *   `(admin)`: Admin dashboard routes.
    *   `(auth)`: Authentication routes.
    *   `(landing)`: Public landing page routes.
    *   `api`: Backend API endpoints.
*   `src/core`: Core infrastructure logic.
    *   `auth`: Authentication configuration (`better-auth`).
    *   `db`: Database connection and configuration.
    *   `i18n`: Internationalization logic.
    *   `rbac`: Role-Based Access Control.
*   `src/config`: Application-wide configuration.
    *   `db/schema.ts`: Database schema definitions (Drizzle).
    *   `index.ts`: Global environment variable loading and config export.
*   `src/extensions`: Pluggable feature modules (Ads, Affiliate, AI, Analytics, Email, Payment).
*   `src/shared`: Shared utilities, hooks, components, and types.
*   `content`: MDX content for documentation (`docs`), logs, and blog posts (`posts`).
*   `public`: Static assets (images, icons).

## Key Files
*   `package.json`: Project dependencies and scripts.
*   `next.config.mjs`: Next.js configuration.
*   `tsconfig.json`: TypeScript configuration.
*   `.env.example`: Template for environment variables.
*   `src/config/index.ts`: Central configuration loader.

## Development Workflow

### Prerequisites
*   Node.js (v20+ recommended)
*   pnpm (Package Manager)
*   PostgreSQL Database

### Setup Instructions
1.  **Install dependencies:**
    ```bash
    pnpm install
    ```
2.  **Environment Setup:**
    *   Copy `.env.example` to `.env`.
    *   Fill in `DATABASE_URL`, `AUTH_SECRET`, and other required variables.
3.  **Database Setup:**
    ```bash
    pnpm db:generate  # Generate migrations
    pnpm db:migrate   # Apply migrations
    ```
4.  **Role Assignment (Optional):**
    ```bash
    pnpm rbac:init
    ```

### Common Commands
*   **Start Development Server:**
    ```bash
    pnpm dev
    ```
*   **Build for Production:**
    ```bash
    pnpm build
    ```
*   **Lint Code:**
    ```bash
    pnpm lint
    ```
*   **Database Studio (Drizzle):**
    ```bash
    pnpm db:studio
    ```

## Conventions
*   **Package Manager:** Strict usage of `pnpm`.
*   **Styling:** Use Tailwind CSS utility classes. Components are largely based on Shadcn UI.
*   **Imports:** Use `@/` alias for `src/` directory.
*   **Async/Await:** Preferred over callbacks/promises for async operations.
*   **Internationalization:** All user-facing text should be wrapped with `next-intl` translation hooks.
*   **Environment Variables:** Do NOT modify `.env` files directly. If changes are required, instruct the user to make them.
