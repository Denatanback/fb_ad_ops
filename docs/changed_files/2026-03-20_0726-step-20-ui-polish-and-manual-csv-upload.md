# Step 20 Changed Files

- `src/lib/navigation.ts` - сократил навигационные descriptions и оставил более практичные labels/badges.
- `src/components/layout/sidebar.tsx` - упростил sidebar до компактных nav items без больших explanatory blocks.
- `src/components/layout/topbar.tsx` - сократил topbar и убрал лишний статусный chrome.
- `src/app/(workspace)/page.tsx` - переписал dashboard в компактный operational overview с quick links.
- `src/app/(workspace)/imports/page.tsx` - добавил manual CSV upload UI и упростил imports workspace screen.
- `src/app/(workspace)/imports/[importRunId]/page.tsx` - добавил success flash для manual upload redirect.
- `src/app/(workspace)/imports/actions.ts` - добавил protected server action для ручной загрузки CSV.
- `src/app/api/imports/upload/route.ts` - перевёл API upload route на общий intake helper.
- `src/server/imports/intake.ts` - добавил общий import intake helper для UI и API flows.
- `src/components/creatives/creative-form.tsx` - убрал ручной `encType` с server action form.
- `src/app/globals.css` - уплотнил shell spacing и исправил select/readability styling для dark/light themes.
- `README.md` - добавил короткую заметку о ручной загрузке CSV через `/imports`.
