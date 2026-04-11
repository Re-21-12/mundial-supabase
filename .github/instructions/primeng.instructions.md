## PrimeNG v18+ Best Practices

- Use the new styled/unstyled mode configuration.
- Prefer the `@primeuix/themes` for theming instead of old legacy CSS files.
- Always use the `p-` prefix for components (e.g., `<p-button>`, `<p-table>`).
- Use the `p-chart` component for data visualization (ideal for glucose monitoring).
- When using Tailwind 4 integration, use the PrimeNG Tailwind presets to ensure consistent design.
- Avoid using legacy `p-ripple` as a directive if the component already handles it.
