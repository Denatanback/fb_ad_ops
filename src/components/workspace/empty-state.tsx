export function EmptyState({
  title,
  description,
  items
}: Readonly<{
  title: string;
  description: string;
  items: string[];
}>) {
  return (
    <section className="empty-state">
      <div className="empty-state__copy">
        <p className="eyebrow">Подготовленный экран</p>
        <h3>{title}</h3>
        <p>{description}</p>
      </div>

      <ul className="check-list">
        {items.map((item) => (
          <li key={item}>
            <span className="item-copy">{item}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}
