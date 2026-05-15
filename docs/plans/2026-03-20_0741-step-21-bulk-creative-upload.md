# Step 21 Plan

- Добавить bulk creative upload flow в protected workspace рядом с текущим single-create сценарием.
- Вынести и переиспользовать media/upload helpers для batch-обработки без дублирования Google Drive логики.
- Поддержать multi-file upload, автоопределение `video` / `image`, имя из filename и общий batch context: approach + lifecycle status.
- Показать компактный результат обработки: создано, пропущено, ошибки и быстрые ссылки на новые creative records.
- Проверить сборку и задокументировать bulk upload path коротко и без расширения unrelated scope.
