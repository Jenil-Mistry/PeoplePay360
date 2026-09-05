# PeoplePay360 Frontend Stack & Skill Governance

## Project Architecture & Stack
- **Framework**: Next.js (App Router)
- **Language**: TypeScript
- **UI Library**: React
- **Styling**: Tailwind CSS

## UI Component & Design System Guidelines

### 1. Primary UI Foundation: `shadcn/ui`
- `shadcn/ui` is the **exclusive primary UI component foundation** for all standard application interfaces.
- Use `shadcn/ui` components for all core inputs, tables, forms, modals, dialogs, cards, dropdowns, buttons, sheets, and layouts.
- Follow semantic design tokens (`bg-background`, `text-foreground`, `bg-primary`, `border-border`) rather than hardcoded colors.

### 2. Design Direction & Aesthetic Standards
- **Frontend Design & Taste v2**: Ensure all pages have a distinctive visual identity appropriate for a modern HR & Payroll platform.
- Avoid generic, templated AI aesthetics. Ground the visual system in clean enterprise typography, balanced density, and clear information hierarchy.
- **Impeccable**: Apply rigorous design critique, typography scale, spacing consistency, contrast ratios, and edge-case handling (empty states, loading states, error boundaries).

### 3. Motion & Micro-Interactions
- **Motion (Framer Motion)**: Use subtle micro-interactions, clean hover states, and smooth layout transitions.
- Keep animation durations snappy (150ms–250ms) and purposeful. Do not add distracting or sluggish motion.
- Strictly respect `prefers-reduced-motion`.

### 4. Optional UI Components: `Kokonut UI`
- **Optional & Secondary Only**: Kokonut UI may only be used for select components where it genuinely improves usability (e.g., specific search filter inputs or tactile dashboard metric cards).
- **Never make Kokonut UI the primary UI system**.

### 5. Excluded Systems & Libraries
- **Odoo / OWL**: This project is built natively with Next.js, React, and TypeScript. Do NOT use Odoo or OWL modules/patterns.
- **Aceternity UI**: Do NOT use Aceternity UI. Avoid extraneous decorative effects (e.g. meteor showers, floating 3D objects, background beams) to keep the HR & Payroll product clean, accessible, and enterprise-grade.
