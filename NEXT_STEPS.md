# Current Status and Next Steps for Prompt Variable Interaction

## Completed Tasks

1.  **Database Schema**:
    -   Modified `src/config/db/schema.ts` to include `promptVariableCategories` and `promptVariableKeywords` table definitions.
    -   Verified imports (added `uuid` from `drizzle-orm/pg-core`).

2.  **Backend API**:
    -   Created `src/app/api/prompt/variables/route.ts`.
    -   This endpoint accepts a `category` query parameter.
    -   It returns the category details and a list of associated keywords (both CN and EN).

3.  **Frontend Integration (Part 1)**:
    -   Updated `src/app/[locale]/(landing)/_social-highlights/components/PostDetail.tsx`.
    -   Now passes an `activeLanguage` prop (`'en'` or `'zh-CN'`) to the `PromptEditor` component.

4.  **Frontend Integration (Part 2 - PromptEditor)**:
    -   Refactored `src/app/[locale]/(landing)/_social-highlights/components/PromptEditor.tsx`.
    -   Implemented interactive variable detection in `renderContent` (adding data attributes).
    -   Added `handleVariableClick` to fetch variable options from the API.
    -   Added a floating `Command` menu (Dropdown) to search and select options.
    -   Implemented `handleOptionSelect` to replace specific variable instances in the text.
    -   Added click-outside logic to close the dropdown.

## Verification & Testing

The feature is now fully implemented. You can verify it by:

1.  **Running the app**: `pnpm dev`
2.  **Navigating**: Go to the landing page or wherever `PostDetail` is used.
3.  **Interaction**:
    -   Click on a variable (colored pill) in the Prompt Preview.
    -   A dropdown should appear with options fetched from the database.
    -   Selecting an option should update the text in the preview and the underlying content.
    -   Clicking outside should close the dropdown.
    -   Switching language (CN/EN) in the parent component should update the inserted values (if implemented in parent state) or at least the options shown in the dropdown will respect the `activeLanguage` prop.

## Pending Tasks

-   None. The planned scope for Prompt Variable Interaction is complete.

## File Paths Reference
-   **Schema**: `src/config/db/schema.ts`
-   **API**: `src/app/api/prompt/variables/route.ts`
-   **Parent Component**: `src/app/[locale]/(landing)/_social-highlights/components/PostDetail.tsx`
-   **Target Component**: `src/app/[locale]/(landing)/_social-highlights/components/PromptEditor.tsx`
