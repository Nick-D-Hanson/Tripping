# Design System Implementation Plan

## Goal

Align the current application UX and UI fully with the design contract in `docs/design-system-contract.md` by normalizing what already exists, closing gaps in shared primitives, and enforcing the system in future feature work.

## Current Baseline

The app already has a strong starting point:

- Shared color, radius, and typography tokens live in `src/app/globals.css`
- Shared primitives exist in `src/components/ui`
- Core pages already use `Card`, `Button`, `Input`, `Label`, `Textarea`, and `Dialog`
- Layout width and page spacing are mostly consistent across the authenticated app

The main work now is not a redesign. It is systemization, coverage, and enforcement.

## Phase 1: Formalize The Source Of Truth

### Deliverables

- Adopt `docs/design-system-contract.md` as the canonical UI contract
- Reference the contract from agent instructions so new generated UI follows it by default
- Keep future feature specs aligned with the contract template

### Files

- `AGENTS.md`
- `docs/design-system-contract.md`

### Acceptance Criteria

- Contributors and agents have one canonical design contract
- Future UI work starts from the same ruleset

## Phase 2: Normalize Tokens And Semantics

### Deliverables

- Audit token usage across app and trip components
- Replace arbitrary spacing, typography, and shadow choices with shared scale usage where mismatches exist
- Introduce missing semantic tokens only if a repeated need appears across multiple features

### Files

- `src/app/globals.css`
- `src/components/ui/*`
- `src/components/trips/*`
- `src/app/(app)/**/*.tsx`

### Acceptance Criteria

- Shared tokens cover the real UI needs
- Page-level styling drifts are reduced
- New visual decisions happen in the token layer, not ad hoc in features

## Phase 3: Harden Shared Primitives

### Deliverables

- Normalize shared component variants and naming
- Ensure button variants map cleanly to the contract: primary, secondary, ghost, destructive
- Add shared support for error, loading, and helper text states in form controls where missing
- Document expected structure for cards, dialogs, and inputs

### Files

- `src/components/ui/button.tsx`
- `src/components/ui/input.tsx`
- `src/components/ui/textarea.tsx`
- `src/components/ui/select.tsx`
- `src/components/ui/card.tsx`
- `src/components/ui/dialog.tsx`
- Any new shared helpers introduced under `src/components/ui`

### Acceptance Criteria

- Shared primitives cover the majority of product needs without page-local reinvention
- Forms can represent default, focus, error, disabled, and loading states consistently
- Shared primitives are the default path for all new UI work

## Phase 4: Align Layout And Navigation

### Deliverables

- Convert app shell guidance into a documented layout pattern
- Align page containers to a consistent max width and padding contract
- Plan the persistent primary navigation shape before introducing broader app sections
- Define how secondary page actions appear in headers and section cards

### Files

- `src/app/(app)/layout.tsx`
- `src/app/(app)/trips/page.tsx`
- `src/app/(app)/trips/[tripId]/page.tsx`
- Any future shared shell components

### Acceptance Criteria

- Page headers, action areas, and content sections follow one layout language
- Navigation remains consistent as the product surface grows

## Phase 5: State Coverage Across Features

### Deliverables

- Audit every major page and card section for loading, empty, error, and success states
- Replace plain text loading fallbacks with reusable loading patterns where appropriate
- Define success and error feedback conventions for mutations

### Files

- `src/app/(app)/trips/page.tsx`
- `src/app/(app)/trips/[tripId]/page.tsx`
- `src/components/trips/*`
- `src/app/actions.ts`
- Shared feedback components if introduced

### Acceptance Criteria

- Every primary workflow covers all required states
- User actions always result in visible feedback
- Empty states and errors feel like part of the same system

## Phase 6: Responsive And Mobile Alignment

### Deliverables

- Audit core pages and dialogs against the mobile and tablet contract
- Ensure touch targets meet the 44px minimum where interactive density is high
- Define how dense content patterns adapt on small screens

### Files

- `src/app/(app)/layout.tsx`
- `src/app/(app)/trips/**/*.tsx`
- `src/components/trips/*`
- `src/components/ui/*`

### Acceptance Criteria

- Key workflows remain comfortable on mobile
- Responsive behavior is intentional instead of incidental

## Phase 7: Accessibility Completion

### Deliverables

- Audit keyboard navigation, focus visibility, and non-text labeling
- Ensure form validation surfaces accessible labels and messages
- Verify dialogs, selects, and map-adjacent interactions meet baseline expectations

### Files

- `src/components/ui/*`
- `src/components/trips/*`
- `src/app/(app)/**/*.tsx`

### Acceptance Criteria

- Core flows meet WCAG 2.1 AA expectations
- Keyboard users can complete major tasks without blockers

## Suggested First Execution Slice

The first practical implementation pass should focus on the highest-leverage shared work:

1. Establish the contract and wire it into `AGENTS.md`
2. Normalize button variant naming to match the contract language
3. Add shared form-field support for labels, helper text, and error states
4. Replace low-fidelity loading placeholders with reusable section-level loading patterns
5. Audit the trip dashboard and trip detail pages against required empty, error, and success states

## Working Rules During Rollout

- Do not redesign screens for visual novelty
- When a feature needs a new pattern, prove the existing system cannot support it first
- Fix repeated UI issues in shared primitives before patching individual pages
- Keep implementation changes incremental so visual regressions are easy to catch

## Definition Of Done

The implementation can be considered aligned when:

- Shared tokens are the only default styling source
- Shared primitives cover primary product interactions
- Page layouts follow a documented shell and section pattern
- Required states exist across major workflows
- Accessibility expectations are enforced in core flows
- New feature work naturally extends the system instead of bypassing it
