import type { ReactNode } from 'react';

export function MessageCard({
  title,
  body,
  children,
}: {
  title: string;
  body?: string;
  children?: ReactNode;
}) {
  return (
    <section className="card" aria-live="polite">
      <h1>{title}</h1>
      {body && <p>{body}</p>}
      {children}
    </section>
  );
}
