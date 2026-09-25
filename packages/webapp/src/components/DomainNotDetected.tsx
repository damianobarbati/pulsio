import cx from 'clsx-tw';
import React from 'react';

type DomainNotDetectedProps = {
  className?: string;
  snippet: string;
};

export const DomainNotDetected = ({ className, snippet }: DomainNotDetectedProps) => {
  const [copyMessage, setCopyMessage] = React.useState('');

  return (
    <section className={cx('mb-5 rounded-lg border border-violet-100 bg-white p-5', className)}>
      <h2 className="font-semibold">Waiting for the first signal…</h2>
      <p className="mt-2 text-gray-500 text-sm">Paste this snippet inside your website’s &lt;head&gt;, then visit your site.</p>
      <pre className="mt-3 overflow-auto rounded bg-gray-50 p-3 text-xs">
        <code>{snippet}</code>
      </pre>
      <button
        type="button"
        className="mt-3 text-sm text-violet-600"
        onClick={async () => {
          try {
            await navigator.clipboard.writeText(snippet);
            setCopyMessage('Snippet copied.');
          } catch {
            setCopyMessage('Select the snippet and copy it manually.');
          }
        }}
      >
        Copy snippet
      </button>
      <p role="status" className="mt-2 text-sm">
        {copyMessage}
      </p>
    </section>
  );
};
