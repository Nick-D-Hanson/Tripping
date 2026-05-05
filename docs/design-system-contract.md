# Unified UX/UI Design Contract

## Purpose

This document is the system-level design contract for the product. It defines how we evolve the interface without fragmenting the user experience.

Principle:

- Do not redesign existing patterns unless explicitly instructed
- Extract existing patterns, normalize them, reuse them, and scale them

Source of truth:

- Existing product UI
- Existing workflows
- Existing shared component patterns
- Existing design tokens in `src/app/globals.css`

## Design Philosophy

Core principles:

- Consistency over creativity
- Reuse over reinvention
- Clarity over density
- Performance over decoration
- Accessibility is required

Anti-patterns:

- Introducing a new UI pattern without precedent in the product
- Creating inconsistent spacing, typography, or component behavior
- Using multiple interaction patterns for the same action
- Bypassing shared UI primitives for one-off styling

## Design Tokens

All UI work must use the shared token system already defined in `src/app/globals.css` and expand it only when necessary.

### Color

- Primary: existing `--primary`
- Secondary: existing `--secondary`
- Background: existing `--background`
- Surface: existing `--card` and `--popover`
- Text primary: existing `--foreground`
- Text secondary: existing `--muted-foreground`
- Border: existing `--border`
- Error: existing `--destructive`
- Success: use the established system success treatment when introduced; do not invent page-local success colors

### Typography

- Font family: existing sans and mono families from `@theme inline`
- Scale:
  - `xs`: 12px
  - `sm`: 14px
  - `md`: 16px
  - `lg`: 20px
  - `xl`: 24px
  - `display`: 32px and above

### Spacing

- Base unit: 4px
- Allowed scale: 4, 8, 12, 16, 24, 32, 48
- Default component gap: 16px

### Radius

- `sm`: 4px
- `md`: 8px
- `lg`: 12px
- `xl`: 16px
- Use the shared radius token and component defaults before adding exceptions

### Elevation

- Low: subtle shadow
- Medium: moderate shadow
- High: prominent shadow
- Prefer shared shadow treatments already used by shared components such as `Button`, `Card`, and `Dialog`

### Motion

- Fast: 100ms
- Standard: 200ms
- Slow: 300ms
- Easing: `ease-in-out`
- Motion must communicate state change, never serve as decoration alone

## Layout System

### Grid

- Desktop: 12 columns
- Tablet: 8 columns
- Mobile: 4 columns

### Containers

- Max width: 1200px baseline
- Padding: 16px baseline
- Existing app shell container patterns should be reused before introducing new wrappers

### Navigation Patterns

- Primary navigation should remain persistent and predictable
- Secondary navigation should remain contextual and local to the current workflow
- Do not introduce alternate navigation paradigms without approval

### Spacing Rules

- Use only the defined spacing scale
- Maintain consistent vertical rhythm between sections
- Do not compress or expand layouts with arbitrary values when a token exists

## Component System

Shared primitives in `src/components/ui` are the first choice for all feature work. Extend them before creating new patterns.

### Button

- Variants: primary, secondary, ghost, destructive
- Sizes: `sm`, `md`, `lg`
- States: default, hover, active, disabled, loading
- Rules:
  - Primary actions must use the primary button treatment
  - No custom page-local button styles without explicit approval

### Input

- Types: text, number, email, password, date, and other native input types when needed
- States: default, focus, error, disabled
- Rules:
  - All inputs require labels
  - Validation errors must include visible messages

### Card

- Structure:
  - Header
  - Content
  - Actions or footer when needed
- Usage:
  - Default container for grouped content and page sections

### Modal

- Must trap focus
- ESC must close the modal when the flow permits closing
- Overlay is required
- Reuse the shared dialog pattern

### Table

- Features:
  - Sortable when data requires it
  - Filterable when discovery requires it
  - Paginated when density requires it
- Usage:
  - Dense data only
  - On mobile, table experiences must degrade into readable stacked layouts

### Navigation

- Shared navigation should be collapsible on constrained screens
- Label clarity matters as much as iconography

## Interaction Patterns

### Feedback

- Every user action must produce visible feedback

### Loading States

- Use skeletons, spinners, or lightweight loading placeholders consistent with the surrounding UI

### Error Handling

- Inline errors for form issues
- Global toast or system-level feedback for cross-page outcomes

### Required State Coverage

- Loading
- Empty
- Error
- Success

### Navigation Rules

- Preserve browser back behavior
- Maintain user context during edits, dialogs, and drill-in flows

## Responsive Behavior

### Breakpoints

- Mobile: 0-640px
- Tablet: 641-1024px
- Desktop: 1025px and above

### Rules

- Navigation must collapse gracefully on smaller screens
- Data-dense layouts must become readable stacked layouts on mobile
- Touch targets must be at least 44px

## Accessibility

Standard: WCAG 2.1 AA

Rules:

- Color contrast must meet AA standards
- All interactions must be keyboard accessible
- ARIA labels are required for non-text controls
- Focus states must be visible and consistent

## Enforcement Rules For Implementation

- Always reuse existing components before creating new ones
- Extend existing patterns before introducing a new pattern
- Do not introduce new layouts without approval
- Follow the shared tokens for spacing, typography, color, radius, and motion
- Maintain existing navigation paradigms unless a change is explicitly requested
- When a pattern is missing, add it to the shared system first instead of solving it locally in a page

## Feature Spec Template

Use this format for new feature work:

### Feature Name

[Name]

### User Goal

- What the user is trying to accomplish

### Layout

- Page structure using the shared layout system

### Components Used

- `button.primary`
- `input.text`
- `table.standard`

### States

- Loading
- Empty
- Error
- Success

### Interactions

- Define the key user interactions and system responses

### Acceptance Criteria

- Matches design tokens
- All states implemented
- Fully accessible
- Consistent with existing UX patterns

## Codex Usage Pattern

When generating or editing UI, use this contract.

Task:

Build `[feature/page/component]`

Constraints:

- Reuse defined components
- Follow the layout and token system
- Match existing UX patterns
- Do not introduce new design patterns without approval

## Summary

This contract exists to ensure:

- Consistent UI across surfaces
- Faster development through reuse
- Scalable architecture for new features
- Alignment between product behavior and implementation
