---
name: Gastô
colors:
  surface: '#0b1326'
  surface-dim: '#0b1326'
  surface-bright: '#31394d'
  surface-container-lowest: '#060e20'
  surface-container-low: '#131b2e'
  surface-container: '#171f33'
  surface-container-high: '#222a3d'
  surface-container-highest: '#2d3449'
  on-surface: '#dae2fd'
  on-surface-variant: '#c8c4d7'
  inverse-surface: '#dae2fd'
  inverse-on-surface: '#283044'
  outline: '#928ea1'
  outline-variant: '#474555'
  surface-tint: '#c5c0ff'
  primary: '#c5c0ff'
  on-primary: '#2600a1'
  primary-container: '#6d5ef5'
  on-primary-container: '#fffdff'
  inverse-primary: '#5544dc'
  secondary: '#4cd7f6'
  on-secondary: '#003640'
  secondary-container: '#03b5d3'
  on-secondary-container: '#00424e'
  tertiary: '#4edea3'
  on-tertiary: '#003824'
  tertiary-container: '#00865c'
  on-tertiary-container: '#fafff9'
  error: '#ffb4ab'
  on-error: '#690005'
  error-container: '#93000a'
  on-error-container: '#ffdad6'
  primary-fixed: '#e4dfff'
  primary-fixed-dim: '#c5c0ff'
  on-primary-fixed: '#150067'
  on-primary-fixed-variant: '#3c24c5'
  secondary-fixed: '#acedff'
  secondary-fixed-dim: '#4cd7f6'
  on-secondary-fixed: '#001f26'
  on-secondary-fixed-variant: '#004e5c'
  tertiary-fixed: '#6ffbbe'
  tertiary-fixed-dim: '#4edea3'
  on-tertiary-fixed: '#002113'
  on-tertiary-fixed-variant: '#005236'
  background: '#0b1326'
  on-background: '#dae2fd'
  surface-variant: '#2d3449'
typography:
  display:
    fontFamily: Plus Jakarta Sans
    fontSize: 40px
    fontWeight: '700'
    lineHeight: 48px
    letterSpacing: -0.03em
  display-mobile:
    fontFamily: Plus Jakarta Sans
    fontSize: 32px
    fontWeight: '700'
    lineHeight: 40px
    letterSpacing: -0.02em
  headline-lg:
    fontFamily: Plus Jakarta Sans
    fontSize: 30px
    fontWeight: '600'
    lineHeight: 38px
    letterSpacing: -0.02em
  headline-lg-mobile:
    fontFamily: Plus Jakarta Sans
    fontSize: 24px
    fontWeight: '600'
    lineHeight: 32px
    letterSpacing: -0.015em
  headline-md:
    fontFamily: Plus Jakarta Sans
    fontSize: 20px
    fontWeight: '600'
    lineHeight: 28px
    letterSpacing: -0.01em
  headline-sm:
    fontFamily: Plus Jakarta Sans
    fontSize: 16px
    fontWeight: '600'
    lineHeight: 24px
    letterSpacing: 0em
  body-lg:
    fontFamily: Plus Jakarta Sans
    fontSize: 16px
    fontWeight: '400'
    lineHeight: 26px
    letterSpacing: -0.005em
  body-md:
    fontFamily: Plus Jakarta Sans
    fontSize: 14px
    fontWeight: '400'
    lineHeight: 22px
    letterSpacing: 0em
  body-sm:
    fontFamily: Plus Jakarta Sans
    fontSize: 12px
    fontWeight: '400'
    lineHeight: 18px
    letterSpacing: 0.01em
  label-md:
    fontFamily: Plus Jakarta Sans
    fontSize: 13px
    fontWeight: '600'
    lineHeight: 18px
    letterSpacing: 0.02em
  label-sm:
    fontFamily: Plus Jakarta Sans
    fontSize: 11px
    fontWeight: '600'
    lineHeight: 16px
    letterSpacing: 0.04em
  currency-hero:
    fontFamily: Plus Jakarta Sans
    fontSize: 36px
    fontWeight: '700'
    lineHeight: 44px
    letterSpacing: -0.03em
  currency-hero-mobile:
    fontFamily: Plus Jakarta Sans
    fontSize: 28px
    fontWeight: '700'
    lineHeight: 36px
    letterSpacing: -0.02em
  currency-md:
    fontFamily: Plus Jakarta Sans
    fontSize: 16px
    fontWeight: '600'
    lineHeight: 24px
    letterSpacing: -0.01em
rounded:
  sm: 0.25rem
  DEFAULT: 0.5rem
  md: 0.75rem
  lg: 1rem
  xl: 1.5rem
  full: 9999px
spacing:
  gutter: 1.5rem
  gutter-mobile: 0.75rem
  margin: 2rem
  margin-mobile: 1rem
  space-xs: 0.25rem
  space-sm: 0.5rem
  space-md: 1rem
  space-lg: 1.5rem
  space-xl: 2rem
---

## Brand & Style

The design system blends high-precision product engineering (inspired by Linear) with welcoming, accessible consumer fintech charm (inspired by Nubank and Revolut). It serves users seeking clarity, control, and intelligent guidance over their personal finances without feeling overwhelmed by complex banking jargon.

### Aesthetic Foundation
- **Modern Minimalist with Precision Glassmorphism**: Clean layouts, high-contrast hierarchical hierarchy, generous negative space, and refined 1px translucent borders.
- **Tone**: Trustworthy, sharp, empowering, and empathetic. Interactions feel fluid, immediate, and tactfully informative.
- **Dual Visual Modes**:
  - *Light Mode*: Crisp canvas with soft ambient occlusion shadows, porcelain-like container cards, and subtle translucency.
  - *Dark Mode*: Deep slate foundations with luminous violet-indigo accents, subtle neon edge highlights, and high legibility.

## Colors

The palette balances a confident, contemporary violet core with functional semantic hues and categorical identification colors designed for instant financial data recognition.

### Core Brand & Semantic Colors
- **Primary (Violet/Indigo)**: `#6D5EF5` (Brand anchor, primary CTAs, active AI insights)
- **Secondary (Teal/Cyan)**: `#06B6D4` (Predictive analytics, automated rules, secondary highlights)
- **Success**: `#10B981` (Income, savings targets met, positive cash flow)
- **Warning**: `#F59E0B` (Budget thresholds nearing limit, pending reviews)
- **Danger**: `#EF4444` (Over-budget alerts, recurring unexpected spikes, destructive actions)

### Category Tokens
- **Alimentação (Food & Dining)**: `#F97316`
- **Transporte (Mobility & Transit)**: `#3B82F6`
- **Educação (Learning & Growth)**: `#8B5CF6`
- **Lazer (Entertainment & Leisure)**: `#EC4899`
- **Outros (Uncategorized & Miscellaneous)**: `#64748B`

### Slate Neutral Scale & Theme Roles
- **Dark Mode (Default)**:
  - Surface Root: `#090D16`
  - Surface Card/Container: `#0F172A`
  - Surface Elevated: `#1E293B`
  - Borders: `rgba(255, 255, 255, 0.08)`
  - Text Primary: `#F8FAFC`, Secondary: `#94A3B8`, Muted: `#64748B`
- **Light Mode**:
  - Surface Root: `#F8FAFC`
  - Surface Card/Container: `#FFFFFF`
  - Surface Elevated: `#F1F5F9`
  - Borders: `rgba(15, 23, 42, 0.06)`
  - Text Primary: `#0F172A`, Secondary: `#475569`, Muted: `#94A3B8`

## Typography

Plus Jakarta Sans delivers friendly geometry paired with clean structural neutrality. 

### Numeric & Currency Formatting
- All numeric representations (balances, expenses, line charts, breakdowns) must enforce OpenType tabular figures: `font-feature-settings: "tnum" 1`.
- Brazilian Real format requires `R$ 1.234,56` syntax, where the symbol `R$` is rendered at 70% opacity and 1 size step smaller than the integer amount for optical balance.
- Display sizes utilize tightened negative tracking (`-0.02em` to `-0.03em`) to mimic executive dashboard density.

## Layout & Spacing

The layout model uses a responsive fluid grid optimized for both compact mobile PWA usage and dense multi-panel desktop analysis.

### Responsive Breakpoints & Columns
- **Mobile (< 640px)**: 4 columns, `margin-mobile` (1rem / 16px), `gutter-mobile` (0.75rem / 12px). Full-width cards, pinned bottom navigation, and scrollable horizontal chips.
- **Tablet (640px - 1024px)**: 8 columns, 1.5rem margins, 1rem gutters. Dual-pane view for lists and preview sheets.
- **Desktop (> 1024px)**: 12 columns, max container width `1280px` centered, `margin` (2rem / 32px), `gutter` (1.5rem / 24px). Persistent left navigation rail, secondary contextual AI assistant sidebar.

### Spacing Philosophy
- Base unit: **4px** (`0.25rem`). Component internals adhere strictly to 4px multiples (8, 12, 16, 24, 32px).
- Generous outer breathing room paired with dense, readable card interiors ensures high analytical density without visual fatigue.

## Elevation & Depth

Visual depth is achieved through layered translucent planes, backdrop blurs, and soft lighting, avoiding opaque drop shadows.

### Elevation Architecture
- **Layer 0 (Canvas)**: Base application background (`#090D16` dark / `#F8FAFC` light).
- **Layer 1 (Cards & Modules)**: Flat surface with subtle border:
  - *Dark*: `#0F172A` with `1px solid rgba(255, 255, 255, 0.06)`.
  - *Light*: `#FFFFFF` with `1px solid rgba(15, 23, 42, 0.05)` and shadow `0 4px 20px -2px rgba(15, 23, 42, 0.04)`.
- **Layer 2 (Floating Modals & Dropdowns - Glassmorphism)**: 
  - *Dark*: Background `rgba(15, 23, 42, 0.75)` with `backdrop-filter: blur(16px)`, border `1px solid rgba(255, 255, 255, 0.12)`, shadow `0 16px 36px -8px rgba(0, 0, 0, 0.5)`.
  - *Light*: Background `rgba(255, 255, 255, 0.8)` with `backdrop-filter: blur(16px)`, border `1px solid rgba(255, 255, 255, 0.8)`, shadow `0 12px 32px -4px rgba(15, 23, 42, 0.08)`.
- **AI Accent Glow (Active State)**: When the AI assistant processes statements or provides suggestions, cards receive a dynamic outer glow: `box-shadow: 0 0 24px -4px rgba(109, 94, 245, 0.35)`.

## Shapes

The design uses a roundedness token level of `2` (base 0.5rem / 8px, `rounded-lg` at 1rem / 16px, and `rounded-xl` at 1.25rem - 1.5rem / 20-24px), establishing a soft, approachable feel while preserving architectural precision.

### Specific Applications
- **Cards and Containers**: `16px` to `20px` (`rounded-lg` to `rounded-xl`), creating friendly modular segments.
- **Buttons, Inputs, Selectors**: `12px` to `16px` (`rounded-md` to `rounded-lg`).
- **Badges, Category Tags & Interactive Chips**: Pill-shaped (`9999px`) to visually differentiate quick filters and metadata tags from interactive square cards.

## Components

### Buttons
- **Primary**: Solid `#6D5EF5` background, white label, height 44px (touch-friendly), font weight 600, corner radius 12px. In dark mode, active states emit a soft `0 0 16px rgba(109, 94, 245, 0.4)` halo.
- **Secondary / Ghost**: Translucent background (`rgba(255, 255, 255, 0.05)` dark, `rgba(15, 23, 42, 0.04)` light), 1px border. Hover transitions to primary color wash.
- **Icon Actions**: 40x40px square with 10px radius, centered icon, subtle surface hover.

### Chips & Category Badges
- Pill-shaped (`rounded-full`), height 28px, padding 0 12px.
- Category indicators feature an 8px circular dot colored with the corresponding category token, followed by the category title (e.g., `#F97316` Alimentação). In active filter states, the chip adopts an 8% background tint of that category color.

### Form Inputs & Currency Fields
- **Standard Input**: Height 44px, corner radius 12px, border `1px solid rgba(255, 255, 255, 0.1)` (dark) or `rgba(15, 23, 42, 0.1)` (light). Focused border: `#6D5EF5` with a 2px outline ring.
- **Quick Currency Input**: Centered, borderless large numeral display (`currency-hero` token) with auto-formatted `R$` suffix and tabular font rendering.

### Cards & Financial Feed Items
- **Card**: Generous inner padding (`space-lg` / 24px desktop, `space-md` / 16px mobile), 16-20px corner radius.
- **Transaction List Row**: 64px height, horizontal flex, containing:
  - 40px rounded category icon avatar with 12% category background tint.
  - Left-aligned title + timestamp subtitle.
  - Right-aligned tabular currency value (`#10B981` with `+` for income, default text color for expense).

### Checkboxes, Radios & Switches
- **Switch (PWA / Mobile Native feel)**: 48px width, 28px height, pill form. Thumb: 24px circle with crisp drop-shadow. Toggled active track in `#6D5EF5`.
- **Radio & Checkbox**: 20px size, 6px radius for checkbox, fully rounded for radio. Active states filled with `#6D5EF5`.

### AI Assistant Sparkle Pill
- Proprietary component for automated financial insights. Features an animated gradient border transitioning between `#6D5EF5` and `#06B6D4`, enclosing dynamic contextual advice (e.g., "Economize R$ 120,00 no Lazer esta semana").