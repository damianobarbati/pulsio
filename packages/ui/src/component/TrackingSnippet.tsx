import cx from 'clsx-tw';
import React from 'react';
import { ICopy } from '../icons.tsx';
import { Button } from './Button.tsx';

type TrackingSnippetProps = {
  className?: string;
  snippet: string;
  title?: string;
  description?: string;
  copyLabel?: string;
  copyIcon?: boolean;
  temporarySnippetUrl?: string;
  temporarySnippetReplacements?: Record<string, string>;
};

export const TrackingSnippet = ({
  className,
  snippet,
  title = 'Tracking snippet',
  description = 'Paste this snippet inside your website’s <head>, then visit your site.',
  copyLabel = 'Copy snippet',
  copyIcon = false,
  temporarySnippetUrl,
  temporarySnippetReplacements = {},
}: TrackingSnippetProps) => {
  const [displayedSnippet, setDisplayedSnippet] = React.useState(snippet);
  const [temporary, setTemporary] = React.useState(false);
  const [loadingTemporary, setLoadingTemporary] = React.useState(false);
  const [copyMessage, setCopyMessage] = React.useState('');
  const [temporaryError, setTemporaryError] = React.useState('');

  React.useEffect(() => {
    setDisplayedSnippet(snippet);
    setTemporary(false);
  }, [snippet]);

  const toggleTemporarySnippet = async () => {
    if (temporary) {
      setDisplayedSnippet(snippet);
      setTemporary(false);
      setTemporaryError('');
      setCopyMessage('');
      return;
    }

    if (!temporarySnippetUrl) return;
    setLoadingTemporary(true);
    try {
      const response = await fetch(temporarySnippetUrl);
      if (!response.ok) throw new Error();
      let temporarySnippet = await response.text();
      for (const [placeholder, value] of Object.entries(temporarySnippetReplacements)) temporarySnippet = temporarySnippet.replaceAll(placeholder, value);
      setDisplayedSnippet(temporarySnippet);
      setTemporary(true);
      setTemporaryError('');
      setCopyMessage('');
    } catch {
      setTemporaryError('We could not load the temporary site command. Please try again.');
    } finally {
      setLoadingTemporary(false);
    }
  };

  const copySnippet = async () => {
    try {
      await navigator.clipboard.writeText(displayedSnippet);
      setCopyMessage('Snippet copied.');
    } catch {
      setCopyMessage('Select the snippet and copy it manually.');
    }
  };

  return (
    <section className={cx('rounded-lg border border-violet-100 bg-white p-5', className)}>
      {(title || temporarySnippetUrl) && (
        <div className="flex flex-wrap items-baseline justify-between gap-3">
          {title && <h2 className="font-semibold">{title}</h2>}
          {temporarySnippetUrl && (
            <Button type="button" variant="ghost" size="sm" className="text-pulsio-blue underline underline-offset-4" onClick={toggleTemporarySnippet} disabled={loadingTemporary}>
              {loadingTemporary ? 'Loading…' : temporary ? 'Use your website instead' : 'Try without a website'}
            </Button>
          )}
        </div>
      )}
      {description && (
        <p className="mt-2 text-gray-500 text-sm">
          {temporary ? 'Copy and paste this command into your shell. It starts a temporary site and loads your Pulsio snippet.' : description}
        </p>
      )}
      <div className="relative mt-3">
        <pre className="overflow-auto rounded bg-gray-50 p-3 pr-12 text-xs">
          <code>{displayedSnippet}</code>
        </pre>
        {copyIcon ? (
          <Button type="button" variant="ghost" size="sm" className="absolute top-1 right-1 p-2 text-violet-600" onClick={copySnippet} aria-label={copyLabel} title={copyLabel}>
            <ICopy aria-hidden="true" size={18} />
          </Button>
        ) : (
          <Button type="button" variant="ghost" size="sm" className="mt-3 text-violet-600" onClick={copySnippet}>
            {copyLabel}
          </Button>
        )}
      </div>
      <p role="status" className="mt-2 text-sm">
        {temporaryError || copyMessage}
      </p>
    </section>
  );
};
