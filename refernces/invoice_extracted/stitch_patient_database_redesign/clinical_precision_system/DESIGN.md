---
name: Clinical Precision System
colors:
  surface: '#f8f9ff'
  surface-dim: '#cbdbf5'
  surface-bright: '#f8f9ff'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#eff4ff'
  surface-container: '#e5eeff'
  surface-container-high: '#dce9ff'
  surface-container-highest: '#d3e4fe'
  on-surface: '#0b1c30'
  on-surface-variant: '#404945'
  inverse-surface: '#213145'
  inverse-on-surface: '#eaf1ff'
  outline: '#717975'
  outline-variant: '#c0c8c3'
  surface-tint: '#3a6758'
  primary: '#134235'
  on-primary: '#ffffff'
  primary-container: '#2d5a4c'
  on-primary-container: '#a0cfbe'
  inverse-primary: '#a1d1bf'
  secondary: '#006d36'
  on-secondary: '#ffffff'
  secondary-container: '#6dfe9c'
  on-secondary-container: '#007439'
  tertiary: '#383b3d'
  on-tertiary: '#ffffff'
  tertiary-container: '#4f5254'
  on-tertiary-container: '#c3c5c7'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#bcedda'
  primary-fixed-dim: '#a1d1bf'
  on-primary-fixed: '#002118'
  on-primary-fixed-variant: '#214f41'
  secondary-fixed: '#6dfe9c'
  secondary-fixed-dim: '#4de082'
  on-secondary-fixed: '#00210c'
  on-secondary-fixed-variant: '#005227'
  tertiary-fixed: '#e0e3e5'
  tertiary-fixed-dim: '#c4c7c9'
  on-tertiary-fixed: '#191c1e'
  on-tertiary-fixed-variant: '#444749'
  background: '#f8f9ff'
  on-background: '#0b1c30'
  surface-variant: '#d3e4fe'
typography:
  display-lg:
    fontFamily: Manrope
    fontSize: 36px
    fontWeight: '700'
    lineHeight: 44px
    letterSpacing: -0.02em
  headline-md:
    fontFamily: Manrope
    fontSize: 24px
    fontWeight: '600'
    lineHeight: 32px
    letterSpacing: -0.01em
  headline-sm:
    fontFamily: Manrope
    fontSize: 20px
    fontWeight: '600'
    lineHeight: 28px
  body-lg:
    fontFamily: Inter
    fontSize: 16px
    fontWeight: '400'
    lineHeight: 24px
  body-md:
    fontFamily: Inter
    fontSize: 14px
    fontWeight: '400'
    lineHeight: 20px
  body-sm:
    fontFamily: Inter
    fontSize: 12px
    fontWeight: '400'
    lineHeight: 16px
  label-md:
    fontFamily: Inter
    fontSize: 12px
    fontWeight: '600'
    lineHeight: 16px
    letterSpacing: 0.05em
  label-sm:
    fontFamily: Inter
    fontSize: 10px
    fontWeight: '600'
    lineHeight: 12px
    letterSpacing: 0.05em
rounded:
  sm: 0.125rem
  DEFAULT: 0.25rem
  md: 0.375rem
  lg: 0.5rem
  xl: 0.75rem
  full: 9999px
spacing:
  baseline: 4px
  xs: 4px
  sm: 8px
  md: 16px
  lg: 24px
  xl: 32px
  container-margin: 24px
  gutter: 16px
---

## Brand & Style

The design system is engineered for modern healthcare environments, prioritizing clarity, efficiency, and professional trust. The aesthetic is **Corporate / Modern** with a lean towards high-density functionalism. It targets medical professionals and administrators who require immediate access to complex patient data without cognitive fatigue.

The emotional response should be one of "calm authority." By utilizing generous white space between high-density data clusters and a palette of muted, clinical greens, the UI feels hygienic and precise. The interface avoids decorative flourishes, ensuring every element serves a functional purpose in the clinical workflow.

## Colors

The palette is anchored by a deep **Clinical Green** (#2D5A4C) for primary actions and brand presence, signaling growth and health. This is supported by a high-visibility **Vibrant Mint** (#4ADE80) used exclusively for "active" or "stable" status indicators. 

The background architecture utilizes a **Crisp White** (#FFFFFF) with **Soft Slate** (#F1F5F9) for secondary containers, creating a clear hierarchical separation between navigation, filters, and data tables. Text follows a strict contrast ratio: #1E293B for headings and #64748B for secondary metadata and labels. Functional colors for error (Red) and warning (Amber) should be used sparingly but with high saturation to ensure visibility.

## Typography

This design system uses a dual-font strategy. **Manrope** is used for headlines to provide a modern, friendly yet professional character. Its geometric balance ensures legibility even in bold weights. **Inter** is the workhorse for all UI elements, data tables, and body copy, chosen for its exceptional readability in high-density layouts and wide range of weights.

Letter spacing is tightened for large headings to maintain visual impact, while labels use slightly increased tracking and uppercase styling to differentiate them from interactive data points.

## Layout & Spacing

The design system utilizes a **Fluid Grid** model with a 12-column layout for desktop and a 4-column layout for mobile. A strict 4px baseline grid ensures vertical rhythm across all components.

- **Desktop:** 240px fixed sidebar for navigation, with a fluid content area. Internal card spacing defaults to 24px (lg).
- **Tablets:** Sidebar collapses to an icon-only rail (64px) to maximize data visibility.
- **Mobile:** Single-column vertical stack with 16px (md) safe margins on all sides.

Data-heavy tables should utilize "Compact" spacing (8px cell padding) to minimize scrolling, while dashboard summary cards utilize "Standard" spacing (24px padding) to provide breathing room for key metrics.

## Elevation & Depth

To maintain a clean, clinical feel, this design system avoids heavy shadows. Instead, it uses **Tonal Layers** and **Low-Contrast Outlines**.

- **Level 0 (Surface):** The main background #F8FAFC.
- **Level 1 (Containers):** Cards and main data areas are #FFFFFF with a 1px border of #E2E8F0. No shadow.
- **Level 2 (Interaction):** Hover states on cards or dropdowns utilize a very subtle ambient shadow (0px 4px 6px -1px rgba(0, 0, 0, 0.05)) to suggest interactivity.
- **Navigation:** The primary sidebar is distinguished by a subtle right-hand border or a slightly darker tonal fill (#FFFFFF or #F1F5F9).

## Shapes

The shape language is **Soft** and restrained. Standard UI components like buttons and input fields use a 4px (0.25rem) radius to feel modern without appearing overly "bubbly" or consumer-grade. Large dashboard cards use a 12px (0.75rem) radius to soften the overall grid.

Avatars and status dots remain fully circular to provide a clear organic contrast against the rigid structural lines of the data tables.

## Components

### Buttons
- **Primary:** Solid #2D5A4C background with white text. 4px radius. 
- **Secondary:** Ghost style with #2D5A4C border and text.
- **Tertiary:** Text-only for low-priority actions like "Cancel" or "Clear Filters."

### Status Indicators (Chips)
- Use a light tinted background with high-contrast text. 
- *Active:* #DCFCE7 background with #166534 text.
- *Pending:* #FEF9C3 background with #854D0E text.
- Small 6px dot prefix is mandatory for status indicators to aid color-blind users.

### Input Fields
- Understated 1px #E2E8F0 border.
- Focus state: 1px #2D5A4C border with a 2px soft outer glow in #2D5A4C at 10% opacity.
- Labels are always positioned above the field in `label-md` style.

### Data Tables
- Row hover state: #F8FAFC.
- Header background: #F1F5F9.
- Use `body-sm` for secondary data like "GPC-22171" IDs beneath primary names to maintain high density.

### Cards
- White background, 1px #E2E8F0 border, 12px corner radius.
- Padding should be consistent at 24px unless containing a dense data table.