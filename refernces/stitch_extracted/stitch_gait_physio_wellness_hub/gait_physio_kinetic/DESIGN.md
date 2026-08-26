---
name: Gait Physio Kinetic
colors:
  surface: '#faf9f9'
  surface-dim: '#dadada'
  surface-bright: '#faf9f9'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#f4f3f4'
  surface-container: '#eeeeee'
  surface-container-high: '#e8e8e8'
  surface-container-highest: '#e2e2e3'
  on-surface: '#1a1c1c'
  on-surface-variant: '#41484A'
  inverse-surface: '#2f3131'
  inverse-on-surface: '#f1f0f1'
  outline: '#71787a'
  outline-variant: '#c1c8ca'
  surface-tint: '#41646c'
  primary: '#00181e'
  on-primary: '#ffffff'
  primary-container: '#062e36'
  on-primary-container: '#7396a0'
  inverse-primary: '#a9ccd7'
  secondary: '#8a5100'
  on-secondary: '#ffffff'
  secondary-container: '#ffb05a'
  on-secondary-container: '#744300'
  tertiary: '#250f00'
  on-tertiary: '#ffffff'
  tertiary-container: '#3e230b'
  on-tertiary-container: '#b18869'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#c4e9f3'
  primary-fixed-dim: '#a9ccd7'
  on-primary-fixed: '#001f26'
  on-primary-fixed-variant: '#294c54'
  secondary-fixed: '#ffdcbd'
  secondary-fixed-dim: '#ffb86d'
  on-secondary-fixed: '#2c1600'
  on-secondary-fixed-variant: '#693c00'
  tertiary-fixed: '#ffdcc3'
  tertiary-fixed-dim: '#ecbd9b'
  on-tertiary-fixed: '#2e1502'
  on-tertiary-fixed-variant: '#604025'
  background: '#faf9f9'
  on-background: '#1a1c1c'
  surface-variant: '#e2e2e3'
  deep-teal: '#21444D'
  cream-surface: '#F9F9F7'
  soft-apricot: '#FFE5D4'
  midnight-charcoal: '#1A1C1B'
typography:
  display-lg:
    fontFamily: Plus Jakarta Sans
    fontSize: 48px
    fontWeight: '700'
    lineHeight: 56px
    letterSpacing: -0.02em
  headline-lg:
    fontFamily: Plus Jakarta Sans
    fontSize: 32px
    fontWeight: '600'
    lineHeight: 40px
    letterSpacing: -0.01em
  headline-lg-mobile:
    fontFamily: Plus Jakarta Sans
    fontSize: 24px
    fontWeight: '600'
    lineHeight: 32px
  headline-md:
    fontFamily: Plus Jakarta Sans
    fontSize: 20px
    fontWeight: '600'
    lineHeight: 28px
  body-lg:
    fontFamily: Inter
    fontSize: 18px
    fontWeight: '400'
    lineHeight: 28px
  body-md:
    fontFamily: Inter
    fontSize: 16px
    fontWeight: '400'
    lineHeight: 24px
  label-md:
    fontFamily: Inter
    fontSize: 14px
    fontWeight: '500'
    lineHeight: 20px
    letterSpacing: 0.01em
  label-sm:
    fontFamily: Inter
    fontSize: 12px
    fontWeight: '600'
    lineHeight: 16px
    letterSpacing: 0.05em
rounded:
  sm: 0.25rem
  DEFAULT: 0.5rem
  md: 0.75rem
  lg: 1rem
  xl: 1.5rem
  full: 9999px
spacing:
  base-unit: 8px
  gutter: 16px
  card-padding: 24px
  section-gap: 32px
  margin-mobile: 20px
  margin-desktop: 40px
---

## Brand & Style

Gait Physio Kinetic embodies a **Modern Corporate Health** aesthetic with a focus on trust, precision, and optimistic recovery. The style is sophisticated and calm, utilizing a refined "Deep Teal" and "Honey Gold" palette to balance clinical authority with warmth. 

The design movement is **Clean-Modern with Tonal Layering**. It avoids heavy shadows in favor of subtle border-variants and soft, tinted background surfaces. High-quality photography and instructional video thumbnails serve as focal points, wrapped in generous white space to reduce cognitive load for patients in recovery. The interface feels premium, intentional, and highly accessible.

## Colors

The palette is anchored by **Deep Teal (#062E36)**, representing stability and medical expertise. **Honey Gold (#F9AB55)** is used sparingly for secondary accents and high-energy progress indicators.

- **Backgrounds**: The system uses a specialized `cream-surface` (#F9F9F7) rather than pure white to create a softer, more clinical-yet-premium feel.
- **Surface Layering**: Containers use a hierarchy of subtle greys (Surface, Surface-Dim, Surface-Bright) to differentiate content sections without relying on heavy borders.
- **High Contrast**: Hero sections and primary action cards utilize the darkest teal shades with white or `primary-fixed` (light blue) text to ensure maximum impact and legibility.

## Typography

The system utilizes a dual-font approach. **Plus Jakarta Sans** is the "Voice" of the brand, used for all headlines and brand elements to provide a friendly, slightly rounded, and optimistic character. **Inter** is the "Engine," used for body copy, data, and UI labels to ensure maximum utility and readability across all device types.

Key typographic rules:
- **Headlines**: Always use Plus Jakarta Sans. Large displays feature tight letter spacing for a modern look.
- **Labels**: Small labels use Inter with increased letter spacing (0.05em) and uppercase styling for "Upcoming Session" or "Brand" markers.
- **Readability**: Body copy maintains a standard 1.5x line height to ensure ease of reading for health-related instructions.

## Layout & Spacing

The layout follows a **Hybrid Grid System**. On mobile, it uses a single-column stack with 20px side margins. On desktop, it expands to a 12-column grid with content centered at a 1280px (max-w-7xl) constraint.

- **Rhythm**: All spacing is derived from a base-8 unit.
- **Sectioning**: Distinct content areas (Hero, Bento Grid, Exercise List) are separated by a consistent 32px gap.
- **Bento Logic**: Quick actions are organized in a flexible grid (2-columns on mobile, 4-columns on desktop) to allow for varied importance while maintaining a uniform height.
- **Safe Areas**: The top app bar and bottom navigation use fixed positioning with backdrop-blurs, requiring explicit padding-top/bottom on the main content canvas.

## Elevation & Depth

Hierarchy is established through **Surface Tinting and Ambient Shadows** rather than stark physical elevation.

- **Level 0 (Floor)**: `cream-surface` background.
- **Level 1 (Cards)**: White surfaces with a very soft `0 4px 16px rgba(0,0,0,0.05)` shadow and a subtle `outline-variant` border.
- **Level 2 (Active/Hero)**: High-contrast primary color backgrounds with a deeper `0 8px 24px rgba(6,46,54,0.15)` shadow to signify urgency or primary focus.
- **Overlays**: App bars use a 80% opacity surface with a backdrop-blur (12px-20px) to maintain context while scrolling.

## Shapes

The shape language is **Generous and Organic**. 

- **Standard Containers**: Cards and exercise items use a 16px (1rem) corner radius.
- **Hero Elements**: Large action cards use 24px (1.5rem) to feel more inviting.
- **Interactive Elements**: Primary buttons and status chips are fully rounded (pill-shaped) to distinguish them from structural content.
- **Media**: Thumbnails use a 12px radius to sit comfortably within 16px radius parent containers.

## Components

### Buttons
- **Primary**: Fully rounded, high-contrast (Primary-Fixed on Primary background). Features an icon-left layout with a hover-scale effect on the icon.
- **Ghost/Icon**: 40x40px rounded-full containers with `on-surface-variant` icons.

### Cards
- **Hero Card**: Dark background, white text, internal gradient glow (top-left to bottom-right), containing a circular profile image and a pill-shaped primary button.
- **Quick Action (Bento)**: Square-ish aspect ratio, centered icon in a tinted circle, 14px label below.
- **Exercise List Item**: Horizontal layout, 96px square media thumbnail on the left, progress bar at the bottom of the content area.

### Progress Indicators
- **Linear**: 8px height, rounded-full track in `surface-container`, with a `primary-fixed` fill.

### Navigation
- **Top App Bar**: Fixed 64px height, blurred background, containing a profile avatar (left), brand logo (center), and notification bell (right).
- **Bottom Nav (Mobile)**: 80px height, semi-transparent dark background, active state indicated by a tinted pill-shaped background behind the icon.