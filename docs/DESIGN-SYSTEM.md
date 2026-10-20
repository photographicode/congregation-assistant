# Congregation Assistant design system

The interface uses semantic theme tokens. Existing themes own color values; components consume roles such as \`--accent\`, \`--danger\`, \`--surface-solid\`, and \`--text-1\`.

## Foundations

- Type: 12, 14, 16, 20, 28, and fluid 32–56 px. Page titles use the display face; data and controls use the body face. Numeric columns use tabular numerals.
- Spacing: a 4/8 px base with 12, 16, 24, 32, and 48 px extensions.
- Radius: 4, 8, 12, 18 px, and pill. A theme may remap these without changing component structure.
- Elevation: flat, low, raised, and overlay. Elevation supports hierarchy and never replaces a visible boundary.
- Motion: 120, 180, and 280 ms with one ease curve. Reduced-motion removes nonessential movement.

## Components

Buttons use primary, secondary, tertiary/ghost, subtle, danger, danger-subtle, success-subtle, and warning-subtle roles. Every role defines hover, active, focus, disabled, and loading behavior. Destructive actions always use the danger family; review actions use warning; creation and confirmation use primary.

Status chips use the same semantic families as their related actions. Inputs have visible labels, inline repair instructions, a 44 px minimum target, and a visible focus ring. Select and Combobox use the ARIA combobox/listbox pattern, search after eight options, a mobile bottom sheet, keyboard navigation, and focus return.

Empty states pair one concise sentence with one action. Loading states reserve final layout space with skeletons. Errors explain what happened and offer Retry.

## Interaction rules

Anything clickable must look clickable through button, link, or chip styling and must have hover and focus states. Anything that is not clickable looks plain. Content is always visible or opened through a clearly labeled button into a dialog or side panel; arrow-only disclosures and clickable rows are not used.

Do use generous whitespace, clear hierarchy, restrained semantic color, explicit action labels, and stable layouts. Do not hide essential actions, use color as the only signal, animate layout unexpectedly, or introduce decoration without purpose.
