import * as React from 'react';
import useSWRMutation from 'swr/mutation';
import type { IUser } from 'types/User.ts';
import { Alert, Card } from 'ui';
import { MPOST } from 'ui/api/fetchers.ts';
import { Checkbox } from 'ui/form';
import { IGlobe } from 'ui/icons.tsx';

type AutodiscoveryFormProps = { className?: string; user: IUser.user; onUpdated: () => Promise<unknown> };

export const AutodiscoveryForm = ({ className, user, onUpdated }: AutodiscoveryFormProps) => {
  const update = useSWRMutation('/user/update-settings', MPOST);
  const [error, setError] = React.useState('');

  const toggle = async (enabled: boolean) => {
    setError('');
    try {
      await update.trigger({ autodiscover_enabled: enabled });
      await onUpdated();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Could not update autodiscovery settings.');
    }
  };

  return (
    <Card as="section" className={className}>
      <div className="flex items-start gap-3">
        <span className="grid size-9 shrink-0 place-items-center rounded-md bg-blue-50 text-pulsio-blue">
          <IGlobe size={19} />
        </span>
        <div>
          <h2 className="font-bold text-lg">Domain discovery</h2>
          <p className="mt-1 text-pulsio-muted text-sm">Choose if incoming events may create new domains automatically.</p>
        </div>
      </div>
      <Checkbox
        className="mt-5"
        name="autodiscover_enabled"
        label="Allow automatic domain discovery"
        checked={user.autodiscover_enabled}
        disabled={update.isMutating}
        onChange={(event) => void toggle(event.target.checked)}
      />
      {error && (
        <Alert className="mt-4" tone="error">
          {error}
        </Alert>
      )}
    </Card>
  );
};
