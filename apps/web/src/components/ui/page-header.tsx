import type { ReactNode } from 'react';

/** Título da tela, uma vez por tela, com Breadcrumb de nomes reais abaixo do primeiro nível. */
export function PageHeader({
  title,
  crumbs = [],
  crumbsLabel,
  actions,
}: {
  title: string;
  crumbs?: { href: string; label: string }[];
  crumbsLabel?: string;
  actions?: ReactNode;
}) {
  return (
    <header className="grid gap-2">
      {crumbs.length > 0 && (
        <nav aria-label={crumbsLabel}>
          <ol className="flex flex-wrap gap-2 text-sm text-muted-foreground">
            {crumbs.map((c) => (
              <li key={c.href} className="flex gap-2 after:content-['/'] last:after:content-none">
                <a href={c.href} className="underline">
                  {c.label}
                </a>
              </li>
            ))}
          </ol>
        </nav>
      )}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h1 className="text-2xl font-semibold text-balance">{title}</h1>
        {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
      </div>
    </header>
  );
}
