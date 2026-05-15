# Implementation Plan

- Implement a practical MVP credentials-based auth flow against the existing Prisma `User` table with safe password verification and `admin` / `member` role propagation into the session.
- Protect the internal workspace with routing-level and server-side session checks while keeping `/sign-in` and auth endpoints public.
- Extend the seed/bootstrap flow so a first admin account can be created from environment variables.
- Add only the minimal UI and documentation needed for sign-in, sign-out, and local first-login setup.
