# Step 21 Changed Files

- `docs/plans/2026-03-20_0741-step-21-bulk-creative-upload.md` - короткий план реализации для bulk creative upload.
- `src/server/services/creative-media.ts` - helper-ы для определения media type, initial naming из filename и `accept` value для batch upload.
- `src/server/services/creatives.ts` - добавлен bulk upload context с `Approach` options и Drive status.
- `src/app/(workspace)/creatives/actions.ts` - добавлены shared creative creation helpers и server action для batch upload.
- `src/components/creatives/bulk-creative-upload-form.tsx` - client-side bulk upload form с result summary.
- `src/app/(workspace)/creatives/bulk/page.tsx` - новая protected bulk upload page в creatives area.
- `src/app/(workspace)/creatives/page.tsx` - добавлена entry point ссылка на batch upload.
- `src/lib/navigation.ts` - добавлен hidden navigation item для `/creatives/bulk`, чтобы shell/topbar корректно понимали маршрут.
- `README.md` - добавлено короткое описание bulk creative upload workflow.
