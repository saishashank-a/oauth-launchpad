export default function DocPage({ title, html }: { title: string; html: string | null }) {
  return (
    <article>
      <h1 className="mb-6 text-2xl font-bold tracking-tight">{title}</h1>
      {html ? (
        <div className="prose max-w-3xl" dangerouslySetInnerHTML={{ __html: html }} />
      ) : (
        <p className="box text-sm text-muted">Pending — this document has not been written yet.</p>
      )}
    </article>
  );
}
