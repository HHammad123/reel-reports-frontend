# Icon Colors Location

## Main Icon Color CSS

The icon colors for all Lucide React icons in the video editor are defined in:

**File:** `src/Components/video-editor-js/pro/styles.css`

**Lines:** 225-231

```css
svg,
[data-lucide] {
  stroke-width: var(--icon-stroke-width, 1.5);
  stroke-linecap: round;
  stroke-linejoin: round;
  fill: none;
}
```

## How Icon Colors Work

1. **Icons use `currentColor`**: Icons inherit their color from the parent element's `color` CSS property
2. **Color is controlled by Tailwind classes**: Icons get their color from classes like:
   - `text-foreground` - Main text color
   - `text-muted-foreground` - Muted/secondary text color
   - `text-secondary-foreground` - Secondary text color
   - `text-accent-foreground` - Accent color
   - `text-primary` - Primary color

3. **CSS Variables**: The actual color values are defined in CSS variables:
   - `--foreground` - Main icon/text color
   - `--muted-foreground` - Muted icon color
   - `--secondary-foreground` - Secondary icon color
   - `--accent-foreground` - Accent icon color
   - `--primary` - Primary icon color

## Where to Change Icon Colors

To change icon colors globally, modify the CSS variables in:
- `src/Components/video-editor-js/pro/styles.css` (lines 32-212)

To change specific icon colors, add Tailwind classes to the icon component:
- `className="text-foreground"` - Default color
- `className="text-muted-foreground"` - Muted color
- `className="text-primary"` - Primary color

## Example Usage

```jsx
<Music className="h-4 w-4 text-foreground" />  // Uses --foreground color
<Music className="h-4 w-4 text-muted-foreground" />  // Uses --muted-foreground color
<Music className="h-4 w-4 text-primary" />  // Uses --primary color
```

