---
name: Midnight & Honey Wellness
colors:
  surface: '#faf9f9'
  surface-dim: '#dadada'
  surface-bright: '#faf9f9'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#f4f3f4'
  surface-container: '#eeeeee'
  surface-container-high: '#e8e8e8'
  surface-container-highest: '#e3e2e3'
  on-surface: '#1a1c1c'
  on-surface-variant: '#41484a'
  inverse-surface: '#2f3131'
  inverse-on-surface: '#f1f0f1'
  outline: '#71787a'
  outline-variant: '#c1c8ca'
  surface-tint: '#41636d'
  primary: '#062e36'
  on-primary: '#ffffff'
  primary-container: '#21444d'
  on-primary-container: '#8db1bb'
  inverse-primary: '#a9ccd7'
  secondary: '#8a5100'
  on-secondary: '#ffffff'
  secondary-container: '#ffb05a'
  on-secondary-container: '#744300'
  tertiary: '#3e230b'
  on-tertiary: '#ffffff'
  tertiary-container: '#57381f'
  on-tertiary-container: '#cea281'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#c4e9f4'
  primary-fixed-dim: '#a9ccd7'
  on-primary-fixed: '#001f26'
  on-primary-fixed-variant: '#294c55'
  secondary-fixed: '#ffdcbd'
  secondary-fixed-dim: '#ffb86d'
  on-secondary-fixed: '#2c1600'
  on-secondary-fixed-variant: '#693c00'
  tertiary-fixed: '#ffdcc4'
  tertiary-fixed-dim: '#ecbd9b'
  on-tertiary-fixed: '#2e1502'
  on-tertiary-fixed-variant: '#604026'
  background: '#faf9f9'
  on-background: '#1a1c1c'
  surface-variant: '#e3e2e3'
  midnight-charcoal: '#1A1C1B'
  honey-gold: '#F9AB55'
  cream-surface: '#F9F9F7'
  soft-apricot: '#FFE5D4'
  deep-teal: '#21444D'
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
  margin-mobile: 20px
  margin-desktop: 40px
  card-padding: 24px
  section-gap: 32px
---

## Brand & Style

The brand personality is **Sophisticated Vitality**, evolving the professional wellness aesthetic into a premium, focused digital experience. It targets discerning individuals who value high-performance recovery and clinical precision wrapped in a luxury interface. The UI should evoke a sense of calm authority and energetic focus—moving away from traditional medical "brightness" toward a moodier, more exclusive "executive health" atmosphere.

The design style is **Modern Corporate with Tactile Glassmorphism**. It utilizes a "Midnight" foundation—heavy use of deep, desaturated teals and charcoals—to create high-contrast focal points. The "Honey" accents provide warmth and clear wayfinding. The interface relies on sophisticated tonal layering, subtle inner glows on dark surfaces, and organic, rounded geometry to maintain an approachable yet prestigious feel.

## Colors

The palette is anchored in a high-contrast relationship between **Deep Teal** and **Honey Gold**. This creates a premium "Midnight" atmosphere where information density feels manageable and high-priority actions are unmistakable.

- **Primary (Deep Teal):** Used for headers, high-priority surface containers, and primary branding elements. It provides the "Midnight" depth.
- **Secondary (Honey Gold):** Used exclusively for primary actions, progress highlights, and critical focal points.
- **Surface (Cream):** A warm, off-white background (#F9F9F7) serves as the foundation to keep the interface feeling like a "wellness" product rather than a generic dark-mode app.
- **Tertiary (Soft Apricot):** Used for secondary cards and low-priority backgrounds to provide a softer tonal transition between the cream and the deep teal.

## Typography

This system transitions to **Plus Jakarta Sans** for headlines to lean into a more modern, welcoming, yet geometric aesthetic. Its soft curves complement the rounded UI elements. **Inter** remains the workhorse for body text and labels to ensure maximum legibility and a professional, systematic feel.

Headlines on Deep Teal surfaces should use high-contrast white or off-white, while body text on Cream surfaces uses a softened charcoal (#1A1C1B) to reduce visual fatigue. Small labels should frequently use `Medium` or `SemiBold` weights to stand out against the rich background colors.

## Layout & Spacing

The layout utilizes a **fluid grid** with an emphasis on vertical rhythm and intentional breathing room. 

- **Grid:** A 12-column system for desktop, collapsing to a single column for mobile. 
- **Rhythm:** An 8px base unit drives all dimensions. 
- **Safe Areas:** Generous internal padding (24px) within cards is required to maintain the premium, uncluttered look. 
- **Reflow:** On mobile, high-priority Teal containers (like headers or primary cards) should span the full width or use a 20px margin to create a "contained" professional feel.

## Elevation & Depth

Hierarchy is established through **Tonal Layers** and **Soft Shadows**. 

1. **The Canvas:** The warm Cream surface serves as the lowest layer.
2. **Standard Containers:** White or Apricot cards use a very subtle, light-grey drop shadow with a large blur (Blur: 16px, Y: 4px, Opacity: 5%) to feel softly elevated.
3. **Primary Focal Points:** Deep Teal containers use an **Inner Glow** (a subtle light teal top-border or 10% opacity white inner shadow) to suggest a tactile, slightly recessed or "carved" depth.
4. **Navigation:** Bottom nav bars and top headers use backdrop blurs (25px) to maintain the "Midnight" mood while allowing the background colors to peak through, enhancing the glassmorphism effect.

## Shapes

The shape language is **Rounded (Level 2)**, conveying a sense of organic wellness and modern comfort. 

- **Action Buttons:** Use a slightly higher roundedness (Level 2 or Pill) to make them feel "clickable" and friendly.
- **Main Containers/Cards:** Utilize 1.5rem (24px) corners to frame content softly.
- **Small Elements:** Chips, tags, and progress indicators are always **Pill-shaped**, contrasting with the more structured rectangular cards.

## Components

- **Buttons:** Primary buttons are Honey Gold with charcoal text for maximum "pop." Secondary buttons on dark surfaces should use a transparent background with a white outline; on light surfaces, use a Deep Teal background with white text.
- **Cards:** Use high-contrast color pairings. A Deep Teal card might contain a Honey Gold action button or a circular progress ring. 
- **Input Fields:** Use a Soft Apricot background with no border in resting state; a 2px Deep Teal border on focus.
- **Progress Indicators:** Circular charts are highly encouraged, using a Thick Honey Gold stroke against a Deep Teal track for a high-performance visual.
- **Lists:** List items should have generous vertical padding (16px+) and use a subtle divider line or tonal background change to separate entries.
- **Icons:** Use rounded, 2pt stroke weights. In Deep Teal containers, icons should be Honey Gold to draw the eye.