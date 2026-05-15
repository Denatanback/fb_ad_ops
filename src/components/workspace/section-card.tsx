export function SectionCard({
  title,
  description,
  children
}: Readonly<{
  title: string;
  description?: string;
  children: React.ReactNode;
}>) {
  return (
    <article className="section-card section-card--detailed">
      <div className="section-card__header">
        <h3>{title}</h3>
        {description ? <p>{description}</p> : null}
      </div>
      {children}
    </article>
  );
}
