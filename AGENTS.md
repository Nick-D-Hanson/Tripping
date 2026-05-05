<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

<!-- BEGIN:design-system-contract -->
# UX/UI Design Contract

The system-level UX/UI contract for this repository lives in `docs/design-system-contract.md`.

When implementing or modifying UI:

- Reuse existing shared components before creating new ones
- Follow the existing token system in `src/app/globals.css`
- Preserve existing interaction and navigation patterns unless explicitly instructed otherwise
- Extend shared primitives and layout patterns before adding page-local design solutions

Use `docs/design-system-implementation-plan.md` as the current rollout plan for aligning the product with the contract.
<!-- END:design-system-contract -->
