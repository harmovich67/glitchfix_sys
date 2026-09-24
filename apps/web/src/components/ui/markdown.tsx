import { Fragment, type ReactNode } from 'react';
import { cn } from '../../lib/utils';

/**
 * Tiny, safe markdown renderer (headings, lists, bold, italic, inline code, links). It builds React
 * nodes directly, so model output can never inject HTML.
 */
function inline(text: string, keyBase: string): ReactNode[] {
  const out: ReactNode[] = [];
  const re = /(\*\*[^*]+\*\*|\*[^*]+\*|`[^`]+`|\[[^\]]+\]\((https?:\/\/[^)\s]+)\))/g;
  let last = 0;
  let m: RegExpExecArray | null;
  let i = 0;
  while ((m = re.exec(text))) {
    if (m.index > last) out.push(text.slice(last, m.index));
    const tok = m[0];
    const k = `${keyBase}-${i++}`;
    if (tok.startsWith('**')) out.push(<strong key={k} className="font-semibold text-fg">{tok.slice(2, -2)}</strong>);
    else if (tok.startsWith('`')) out.push(<code key={k} className="rounded bg-surface-3 px-1 py-0.5 font-mono text-[0.85em]">{tok.slice(1, -1)}</code>);
    else if (tok.startsWith('[')) {
      const label = tok.slice(1, tok.indexOf(']'));
      out.push(<a key={k} href={m[2]} target="_blank" rel="noreferrer noopener" className="text-brand underline underline-offset-2">{label}</a>);
    } else out.push(<em key={k}>{tok.slice(1, -1)}</em>);
    last = m.index + tok.length;
  }
  if (last < text.length) out.push(text.slice(last));
  return out;
}

/** GitHub-style pipe table: header row, `---` separator, body rows. */
function tableCells(line: string) {
  return line.trim().replace(/^\|/, '').replace(/\|$/, '').split('|').map((c) => c.trim());
}
const isTableSep = (line: string) => /^\s*\|?\s*:?-{2,}:?\s*(\|\s*:?-{2,}:?\s*)+\|?\s*$/.test(line);

/**
 * `headingIdPrefix` gives every level-2 heading a stable anchor (`<prefix>-<n>`) so a document can
 * build a table of contents from the same source.
 */
export function Markdown({ source, className, headingIdPrefix }: { source: string; className?: string; headingIdPrefix?: string }) {
  const lines = source.replace(/\r/g, '').split('\n');
  const blocks: ReactNode[] = [];
  let list: { ordered: boolean; items: string[] } | null = null;
  const flush = (key: string) => {
    if (!list) return;
    const Tag = list.ordered ? 'ol' : 'ul';
    blocks.push(
      <Tag key={key} className={cn('my-2 space-y-1 ps-5', list.ordered ? 'list-decimal' : 'list-disc marker:text-muted')}>
        {list.items.map((it, i) => (
          <li key={i}>{inline(it, `${key}-${i}`)}</li>
        ))}
      </Tag>,
    );
    list = null;
  };

  let h2 = 0;
  let skip = 0;
  lines.forEach((raw, idx) => {
    if (skip > 0) {
      skip--;
      return;
    }
    const line = raw.trimEnd();
    if (line.includes('|') && isTableSep(lines[idx + 1] ?? '')) {
      flush(`l${idx}`);
      const head = tableCells(line);
      const rows: string[][] = [];
      let j = idx + 2;
      while (j < lines.length && lines[j].includes('|') && lines[j].trim()) rows.push(tableCells(lines[j++]));
      skip = j - idx - 1;
      blocks.push(
        <div key={idx} className="my-3 overflow-x-auto rounded-xl ring-1 ring-border">
          <table className="w-full border-collapse text-[13px]">
            <thead className="bg-surface-2/70 text-start">
              <tr>{head.map((c, i) => <th key={i} className="px-3 py-2 text-start font-semibold text-fg">{inline(c, `th${idx}-${i}`)}</th>)}</tr>
            </thead>
            <tbody className="divide-y divide-border">
              {rows.map((r, ri) => (
                <tr key={ri}>{r.map((c, ci) => <td key={ci} className="px-3 py-2 align-top">{inline(c, `td${idx}-${ri}-${ci}`)}</td>)}</tr>
              ))}
            </tbody>
          </table>
        </div>,
      );
      return;
    }
    if (/^\s*(-{3,}|\*{3,}|_{3,})\s*$/.test(line)) {
      flush(`l${idx}`);
      blocks.push(<hr key={idx} className="my-4 border-border" />);
      return;
    }
    const quote = /^\s*>\s?(.*)$/.exec(line);
    if (quote) {
      flush(`l${idx}`);
      blocks.push(
        <blockquote key={idx} className="my-2 border-s-[3px] border-brand/40 bg-brand-soft/40 py-1.5 ps-3 pe-2 text-[13px] text-fg-2 rounded-e-lg">
          {inline(quote[1], `q${idx}`)}
        </blockquote>,
      );
      return;
    }
    const bullet = /^\s*(?:[-*•])\s+(.*)$/.exec(line);
    const ordered = /^\s*\d+[.)]\s+(.*)$/.exec(line);
    if (bullet || ordered) {
      const isOrdered = !!ordered;
      if (list && list.ordered !== isOrdered) flush(`l${idx}`);
      list = list ?? { ordered: isOrdered, items: [] };
      list.items.push((bullet ?? ordered)![1]);
      return;
    }
    flush(`l${idx}`);
    if (!line.trim()) return;
    const h = /^(#{1,4})\s+(.*)$/.exec(line);
    if (h) {
      const level = h[1].length;
      const cls = level === 1 ? 'text-lg font-semibold mt-4 mb-2' : level === 2 ? 'text-[15px] font-semibold mt-4 mb-1.5' : 'text-sm font-semibold mt-3 mb-1';
      const id = headingIdPrefix && level === 2 ? `${headingIdPrefix}-${h2++}` : undefined;
      blocks.push(<p key={idx} id={id} className={cn('text-fg first:mt-0 scroll-mt-24', cls)}>{inline(h[2], `h${idx}`)}</p>);
      return;
    }
    blocks.push(<p key={idx} className="my-1.5">{inline(line, `p${idx}`)}</p>);
  });
  flush('end');
  return <div className={cn('text-sm leading-relaxed text-fg-2', className)}>{blocks.map((b, i) => <Fragment key={i}>{b}</Fragment>)}</div>;
}
