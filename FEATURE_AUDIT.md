# Layr Feature Audit

## Current implementation

Layr currently includes an authenticated, user-scoped research-to-product-design workspace. The evidence pipeline covers evidence CRUD, file attachments, PDF and DOCX text extraction, AI-generated insights, features, requirements, information architecture, branching user flows, storyboard review, traceability gaps, and review targets. Generated flow and IA canvases use React Flow and ELK, with persisted node positions and drag interaction.

The workspace also includes expandable storyboard panels with generated visual thumbnails, downloadable PDF and CSV reports for flows and selected requirements, expiring and revocable read-only share links, and a standalone public report view. Existing user/project authorization behavior remains scoped to the signed-in user, including evidence, attachments, generated records, exports, and shared-report ownership controls.

Custom authentication includes local email/password sign-up, sign-in, logout, scrypt password hashing, versioned signed local sessions, password-reset token storage and completion, and protected workspace redirects. Authentication hardening includes IP- and email-keyed sign-in throttling, temporary account lockout after repeated failures, failure reset after successful sign-in, single-use hashed email-verification tokens, verified-account gating, resend-verification UI, and development-only verification-link previews. OAuth and the development-only preview identity remain available as separate paths.

## Deferred or incomplete production features

| Area | Status | Detail |
|---|---|---|
| Password-reset email delivery | Deferred | The forgot-password page and secure one-time reset-token flow exist, but no transactional email provider is configured. Production requests return a generic anti-enumeration acknowledgement without sending an email; development can reveal a reset link for testing. |
| Email-verification delivery | Deferred | Verification persistence, validation, single-use completion, gating, and resend UI exist. Production delivery still needs a chosen provider, verified sender address, and credentials; development can reveal a verification link. |
| OAuth callback | External issue remains | The local auth path works independently, but the upstream Manus OAuth token-exchange problem previously observed as HTTP 403 is not an application-side fix. |
| Real email-delivery integration tests | Not added | Automated tests cover token creation, anti-enumeration behavior, lockout, throttling, verification, reset completion, and protected access, but cannot test a provider until one is configured. |
| Production abuse operations | Not added | The core login controls are present, but security-event dashboards, alerting, CAPTCHA or adaptive challenges, and an admin unlock workflow are not included. |

## Verification status

The latest completed authentication-hardening checkpoint is `d3fd74dc`. The project passed TypeScript checking and the Vitest suite with **47 tests passing**. The source ZIP intentionally excludes `node_modules`, build output, Git metadata, runtime logs, and local environment files. It includes the source code, database migrations, test suite, package lockfile, project checklist, and this audit.

## Recommended next steps

First, select a transactional email service and configure a verified sender address plus server-side credentials. Then connect reset and verification delivery through a small provider adapter and add provider-backed integration tests using a sandbox or captured transport. Separately, resolve the external OAuth application configuration if OAuth is still required in addition to local authentication.
