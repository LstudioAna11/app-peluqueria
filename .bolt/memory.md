# Project memory

## Product intent & audience

- L'Studio Ana: single-page React PWA with a client booking portal (PIN access) and a 360° studio management view.
- Clientas end users: multilingual audience served by a 12-language selector.

## Brand personality & voice

- Elegant, bespoke feel; not cookie-cutter; production-grade presentation.

## Visual design & UX direction

- Tailwind CSS styling; Lucide React icons; `@/` alias for `src/` imports.
- Portal screens include: gift cards (regalos), vouchers (bonos), appointment management (gestión de citas), repeat-appointment flow (repetir cita), permissions (permisos), server error messages, popups/modals, and accessibility labels.
- UI text is driven by translation dictionaries wired to the language selector; App passes language prop down to portal components.

## Decisions, constraints & rationale

- 12 language dictionaries maintained; Spanish is primary (~578 keys), other 11 in `portalOtherLanguages.ts` (~577 keys).
- Translation-only changes allowed: text, dictionaries, and their connection to the language selector. Preserve design and app logic.
- Do not modify Supabase or publish.
- Private notes, descriptions, or saved posts requiring separate translation: flag location and keep original.
- New keys must be added across all 12 languages; verify via build/compile.
- UI theme/icon packages not installed unless absolutely necessary.

## Open questions & assumptions

- Private notes / saved descriptions translation strategy still pending separate handling.
- Some hard-coded strings may remain unconnected to the selector if they were outside the touched modules.
- Terminal tool limits can block repeated build checks; static review used as fallback.