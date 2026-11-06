/**
 * Мини-рендерер Markdown (без зависимостей, без dangerouslySetInnerHTML).
 * Поддерживает: заголовки, списки, жирный/курсив, код, ссылки, цитаты, разделители.
 */
import type { ReactNode } from 'react';

const INLINE_RE = /(\*\*[^*]+\*\*|\*[^*]+\*|`[^`]+`|\[[^\]]+\]\([^)]+\))/g;

function renderInline(text: string, keyPrefix: string): ReactNode[] {
  const parts = text.split(INLINE_RE).filter((part) => part !== '');
  return parts.map((part, index) => {
    const key = `${keyPrefix}-${index}`;
    if (part.startsWith('**') && part.endsWith('**')) {
      return (
        <strong key={key} className="font-semibold">
          {part.slice(2, -2)}
        </strong>
      );
    }
    if (part.startsWith('*') && part.endsWith('*') && part.length > 2) {
      return (
        <em key={key}>{part.slice(1, -1)}</em>
      );
    }
    if (part.startsWith('`') && part.endsWith('`')) {
      return (
        <code
          key={key}
          className="rounded bg-slate-100 px-1 py-0.5 text-[0.9em] dark:bg-slate-800"
        >
          {part.slice(1, -1)}
        </code>
      );
    }
    const linkMatch = /^\[([^\]]+)\]\(([^)]+)\)$/.exec(part);
    if (linkMatch) {
      const [, label, href] = linkMatch;
      const safe = /^(https?:|mailto:|#)/i.test(href ?? '') ? href : '#';
      return (
        <a
          key={key}
          href={safe}
          target="_blank"
          rel="noreferrer noopener"
          className="text-indigo-600 underline hover:text-indigo-500 dark:text-indigo-400"
        >
          {label}
        </a>
      );
    }
    return <span key={key}>{part}</span>;
  });
}

export function Markdown({ text }: { text: string }): ReactNode {
  const lines = text.replace(/\r\n/g, '\n').split('\n');
  const blocks: ReactNode[] = [];
  let listBuffer: { ordered: boolean; items: string[] } | null = null;
  let paraBuffer: string[] = [];
  let key = 0;

  const flushList = (): void => {
    if (!listBuffer) return;
    const { ordered, items } = listBuffer;
    const content = items.map((item, i) => (
      <li key={i}>{renderInline(item, `li-${key}-${i}`)}</li>
    ));
    blocks.push(
      ordered ? (
        <ol key={`l-${key++}`} className="list-decimal space-y-1 pl-6">
          {content}
        </ol>
      ) : (
        <ul key={`l-${key++}`} className="list-disc space-y-1 pl-6">
          {content}
        </ul>
      ),
    );
    listBuffer = null;
  };

  const flushPara = (): void => {
    if (paraBuffer.length === 0) return;
    const content = paraBuffer.join(' ');
    blocks.push(
      <p key={`p-${key++}`} className="leading-relaxed">
        {renderInline(content, `p-${key}`)}
      </p>,
    );
    paraBuffer = [];
  };

  for (const rawLine of lines) {
    const line = rawLine.trimEnd();

    if (line.trim() === '') {
      flushPara();
      flushList();
      continue;
    }

    const heading = /^(#{1,4})\s+(.*)$/.exec(line);
    if (heading) {
      flushPara();
      flushList();
      const level = heading[1]?.length ?? 1;
      const content = renderInline(heading[2] ?? '', `h-${key}`);
      const className =
        level === 1
          ? 'text-2xl font-bold'
          : level === 2
            ? 'text-xl font-bold'
            : level === 3
              ? 'text-lg font-semibold'
              : 'text-base font-semibold';
      blocks.push(
        <p key={`h-${key++}`} className={`${className} mt-3 first:mt-0`}>
          {content}
        </p>,
      );
      continue;
    }

    if (/^(-{3,}|\*{3,})$/.test(line.trim())) {
      flushPara();
      flushList();
      blocks.push(<hr key={`hr-${key++}`} className="my-3 border-slate-200 dark:border-slate-700" />);
      continue;
    }

    const bullet = /^[-*]\s+(.*)$/.exec(line);
    if (bullet) {
      flushPara();
      if (!listBuffer || listBuffer.ordered) {
        flushList();
        listBuffer = { ordered: false, items: [] };
      }
      listBuffer.items.push(bullet[1] ?? '');
      continue;
    }

    const ordered = /^\d+[.)]\s+(.*)$/.exec(line);
    if (ordered) {
      flushPara();
      if (!listBuffer || !listBuffer.ordered) {
        flushList();
        listBuffer = { ordered: true, items: [] };
      }
      listBuffer.items.push(ordered[1] ?? '');
      continue;
    }

    const quote = /^>\s?(.*)$/.exec(line);
    if (quote) {
      flushPara();
      flushList();
      blocks.push(
        <blockquote
          key={`q-${key++}`}
          className="border-l-4 border-indigo-300 pl-3 italic text-slate-600 dark:border-indigo-700 dark:text-slate-300"
        >
          {renderInline(quote[1] ?? '', `q-${key}`)}
        </blockquote>,
      );
      continue;
    }

    flushList();
    paraBuffer.push(line.trim());
  }

  flushPara();
  flushList();

  return <div className="space-y-2 text-sm text-slate-700 dark:text-slate-200">{blocks}</div>;
}
