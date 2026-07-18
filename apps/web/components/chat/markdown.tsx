'use client';

import ReactMarkdown, { type Components } from 'react-markdown';
import remarkGfm from 'remark-gfm';

// Element-level styling for assistant replies. react-markdown does NOT render
// raw HTML by default (no rehype-raw here), so model output can't inject
// markup — only the safe subset below. Styling maps onto the app's gray/primary
// tokens so replies read like part of the product, not a raw text dump.
const components: Components = {
  p: ({ children }) => (
    <p className="mb-2 last:mb-0 leading-relaxed">{children}</p>
  ),
  ul: ({ children }) => (
    <ul className="mb-2 list-disc space-y-1 pl-4 last:mb-0">{children}</ul>
  ),
  ol: ({ children }) => (
    <ol className="mb-2 list-decimal space-y-1 pl-4 last:mb-0">{children}</ol>
  ),
  li: ({ children }) => <li className="leading-relaxed">{children}</li>,
  strong: ({ children }) => (
    <strong className="font-semibold text-gray-900">{children}</strong>
  ),
  em: ({ children }) => <em className="italic">{children}</em>,
  a: ({ children, href }) => (
    <a
      href={href}
      target="_blank"
      rel="noreferrer noopener"
      className="font-medium text-primary-base underline underline-offset-2"
    >
      {children}
    </a>
  ),
  h1: ({ children }) => (
    <h3 className="mb-1 mt-2 text-sm font-semibold text-gray-900 first:mt-0">
      {children}
    </h3>
  ),
  h2: ({ children }) => (
    <h3 className="mb-1 mt-2 text-sm font-semibold text-gray-900 first:mt-0">
      {children}
    </h3>
  ),
  h3: ({ children }) => (
    <h3 className="mb-1 mt-2 text-sm font-semibold text-gray-900 first:mt-0">
      {children}
    </h3>
  ),
  code: ({ children }) => (
    <code className="rounded bg-gray-200/70 px-1 py-0.5 font-mono text-[0.8em] text-gray-800">
      {children}
    </code>
  ),
  pre: ({ children }) => (
    <pre className="mb-2 overflow-x-auto rounded-lg bg-gray-900 p-3 text-xs text-gray-100 last:mb-0 [&_code]:bg-transparent [&_code]:p-0 [&_code]:text-gray-100">
      {children}
    </pre>
  ),
  blockquote: ({ children }) => (
    <blockquote className="mb-2 border-l-2 border-gray-300 pl-3 text-gray-600 italic last:mb-0">
      {children}
    </blockquote>
  ),
  hr: () => <hr className="my-2 border-gray-200" />,
  table: ({ children }) => (
    <div className="mb-2 overflow-x-auto last:mb-0">
      <table className="w-full border-collapse text-xs">{children}</table>
    </div>
  ),
  th: ({ children }) => (
    <th className="border border-gray-200 bg-gray-50 px-2 py-1 text-left font-semibold">
      {children}
    </th>
  ),
  td: ({ children }) => (
    <td className="border border-gray-200 px-2 py-1">{children}</td>
  ),
};

/** Renders an assistant reply's markdown into styled, safe HTML. */
export function Markdown({ children }: { children: string }) {
  return (
    <ReactMarkdown remarkPlugins={[remarkGfm]} components={components}>
      {children}
    </ReactMarkdown>
  );
}
