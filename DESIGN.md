# Design System Document: Clinical Precision & Tonal Depth

## 1. Overview & Creative North Star: "The Clinical Architect"
This design system is engineered to move beyond the generic "SaaS dashboard" aesthetic. Our Creative North Star is **"The Clinical Architect"**—a philosophy that treats digital space with the same sterility, precision, and intentionality as a high-tech medical facility. 

We reject the "boxed-in" look of traditional web design. Instead of relying on rigid, dark borders to separate patient data or clinical metrics, we utilize **Tonal Layering** and **Bento Grid** logic to create an organized, high-density environment. The layout should feel like a series of physical, interlocking modules that breathe through white space and subtle elevation rather than structural lines. The result is an interface that feels authoritative, hyper-efficient, and premium.

---

## 2. Colors: Tonal Logic over Structural Lines
Our palette is rooted in the "Medical Blue" and "Electric Blue" spectrum, using cool neutrals to maintain a sense of calm under high-pressure clinical scenarios.

### The "No-Line" Rule
Standard 1px solid borders are prohibited for sectioning. Boundaries are defined through background color shifts. For instance, a `surface-container-low` component should sit on a `surface` background to create a "well" effect. 

### Surface Hierarchy & Nesting
Treat the UI as a series of physical layers—like stacked sheets of frosted glass or medical-grade polymer.
- **Base Layer:** `surface` (#f9f9f9) acts as the sterile floor.
- **Sectional Layer:** `surface-container-low` (#f3f3f3) defines large functional areas (e.g., a sidebar or a secondary module).
- **Interactive/Content Layer:** `surface-container-lowest` (#ffffff) is used for cards and high-density data modules to make them "pop" against the subtle gray backgrounds.

### Glass & Gradient Rule
To prevent the UI from feeling "flat" or "cheap," use **Glassmorphism** for floating elements (like hover menus or floating action buttons). Apply `surface-container-lowest` with 80% opacity and a 12px backdrop-blur. 
- **Signature Texture:** Use a subtle linear gradient from `primary` (#004ac6) to `primary-container` (#2563eb) for primary CTAs. This creates a "luminescent" effect that mimics high-end medical hardware displays.

---

## 3. Typography: High-Contrast Clarity
We utilize **Inter** for its neutral, highly legible glyphs. In a high-density clinical environment, typography is our primary tool for hierarchy.

*   **Display & Headlines:** Use `display-md` and `headline-sm` with a `font-weight: 600` and tight letter-spacing (-0.02em). This conveys the "Editorial Authority" of a medical journal.
*   **Data Labels:** Use `label-md` in `on-surface-variant` (#434655). In medical contexts, labels should be secondary to the *data* itself.
*   **Contrast:** Ensure all body text uses `on-surface` (#1a1c1c) for maximum readability against white cards.

---

## 4. Elevation & Depth: Tonal Layering
We achieve hierarchy by "stacking" tones rather than drawing lines.

*   **The Layering Principle:** Place a `surface-container-lowest` card (Pure White) on a `surface-container-low` section (Zinc-50 equivalent). The contrast provides a soft, natural lift.
*   **Ambient Shadows:** When a card needs to "float" (e.g., an active patient record), use an extra-diffused shadow: `box-shadow: 0 10px 30px rgba(15, 23, 42, 0.05)`. Note the use of `Medical Blue` (on-surface) in the shadow color to ensure it feels integrated, not "dirty."
*   **The Ghost Border Fallback:** If a border is required for accessibility, use the `outline-variant` token (#c3c6d7) at **15% opacity**. A 100% opaque border is a failure of the system.
*   **High-Density Grid:** Use the `Bento Grid` approach. Modules should have varying aspect ratios (1x1, 2x1, 2x2) but must maintain a unified `xl` (0.75rem) corner radius to feel cohesive.

---

## 5. Components: Precision Primitives

### Cards & Modules
*   **Rules:** No dividers. Use `gap-4` or `gap-6` from the spacing scale to separate content groups. 
*   **Background:** Always `surface-container-lowest` (White).
*   **Border:** Use the "Ghost Border" (Zinc-200 / `outline-variant` at low opacity).

### Buttons
*   **Primary:** Gradient of `primary` to `primary-container`. High contrast white text. Radius: `md` (0.375rem).
*   **Secondary:** `surface-container-high` background with `on-secondary-container` text. This feels "embedded" into the UI.
*   **Status Indicators (Chips):** 
    *   **Stable:** `tertiary-container` background with `on-tertiary-fixed-variant` text.
    *   **Emergency:** `error-container` background with `on-error-container` text.
    *   **Waiting:** `secondary-container` background with `on-secondary-fixed-variant` text.

### High-Density Data Tables
*   **Header:** `surface-container-high` with `label-sm` uppercase text.
*   **Rows:** Alternate background colors are forbidden. Use white space and a 1px "Ghost Border" bottom-stroke only.

### Contextual Medical Components
*   **The Pulse Monitor:** A custom sparkline component using `primary` for active data, rendered with a 2px stroke width and no fill, sitting inside a `surface-container-lowest` bento box.
*   **The Diagnostic Blade:** A right-aligned sliding panel using Glassmorphism (80% `surface` + blur) to overlay patient history without losing context of the main dashboard.

---

## 6. Do’s and Don’ts

### Do:
*   **Do** prioritize typography scale over color for hierarchy.
*   **Do** use `surface-container` tiers to create "pockets" of information.
*   **Do** keep the density high; medical professionals prefer seeing more data at once over excessive "white space" scrolling.
*   **Do** use the `xl` (0.75rem) radius for cards and the `md` (0.375rem) radius for internal elements like buttons.

### Don’t:
*   **Don’t** use pure black (#000000) for anything. It breaks the clinical "Light Mode" aesthetic. Use `on-surface` (#1a1c1c).
*   **Don’t** use 100% opaque borders to separate cards; the "Ghost Border" or Tonal Layering is the only approved method.
*   **Don’t** use standard drop-shadows. Only use "Ambient Shadows" with a blue-tinted base.
*   **Don’t** use large, rounded corners (`full`) on anything except chips and status indicators. We want a "precise" feel, not a "friendly/bubbly" feel.