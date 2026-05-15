export function PageHeader({
  eyebrow,
  title,
  description
}: Readonly<{
  eyebrow?: string;
  title: string;
  description: string;
}>) {
  return (
    <section className="page-header">
      {eyebrow ? <p className="eyebrow">{eyebrow}</p> : null}
      <h2 className="page-title">{title}</h2>
      <p className="page-description">{description}</p>
    </section>
  );
}
