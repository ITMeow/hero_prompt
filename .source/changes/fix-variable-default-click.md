Refactor: Prioritize clicked variable value as default in editor dropdown

- Modified `src/app/[locale]/(landing)/_social-highlights/components/PromptEditor.tsx` in `handleVariableClick`.
- Updated `addDefaultValueToOptions` to parse the `originalText` of the clicked variable to determine the default value.
- Ensures the "Default" option in the dropdown matches the clicked item's current text, resolving conflicts where multiple variables share an ID but have different values (e.g., due to user error or draft state).