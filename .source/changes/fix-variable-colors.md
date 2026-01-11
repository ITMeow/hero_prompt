Refactor: Unify variable coloring logic in PromptEditor

- Modified `src/app/[locale]/(landing)/_social-highlights/components/PromptEditor.tsx`.
- Unified the color assignment logic for both JSON and Natural Language modes.
- Now scans the entire prompt for unique variable IDs first and creates a global ID-to-Color map.
- Ensures consistent coloring for the same variable ID (e.g., `{{ 1|... }}`) across the entire prompt, fixing the issue where duplicates had different colors in JSON mode.