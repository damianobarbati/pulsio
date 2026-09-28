import * as React from 'react';
import { FormProvider, useForm } from 'react-hook-form';
import useSWRMutation from 'swr/mutation';
import { Alert, Button, Card } from 'ui';
import { MPOST } from 'ui/api/fetchers.ts';
import { Input } from 'ui/form';
import { ITrash } from 'ui/icons.tsx';

type DeleteFormValues = { confirmation: string; currentPassword: string };

export const AccountDangerZone = ({ className }: { className?: string }) => {
  const [opened, setOpened] = React.useState(false);
  const [deleted, setDeleted] = React.useState(false);
  const mutation = useSWRMutation('/user/delete-account', MPOST);
  const form = useForm<DeleteFormValues>();
  const confirmationError = form.formState.errors.confirmation;

  const submit = async (values: DeleteFormValues) => {
    await mutation.trigger({ current_password: values.currentPassword, confirmation: values.confirmation });
    setDeleted(true);
    form.reset();
    setOpened(false);
    window.location.replace('/auth');
  };

  return (
    <Card as="section" className={className}>
      <div className="flex items-start gap-4">
        <span className="rounded-full bg-red-50 p-2 text-red-700">
          <ITrash size={19} />
        </span>
        <div>
          <h2 className="font-bold text-lg">Delete account</h2>
          <p className="mt-1 max-w-xl text-pulsio-muted text-sm">Delete your account and all domains, reports, and billing data. This action cannot be undone.</p>
        </div>
      </div>

      {deleted && (
        <Alert className="mt-5" tone="warning">
          Account deletion requested. This is a preview only, so your account is still active.
        </Alert>
      )}

      {!opened && !deleted && (
        <Button className="mt-5" variant="danger" onClick={() => setOpened(true)}>
          Delete account
        </Button>
      )}

      {opened && (
        <FormProvider {...form}>
          <form className="mt-5 max-w-xl rounded-sm border border-red-200 bg-red-50/50 p-4" onSubmit={form.handleSubmit(submit)} noValidate>
            <p className="font-semibold text-red-950 text-sm">This is permanent. Type DELETE to confirm.</p>
            <Input
              className="mt-4 [&_input]:border-red-200"
              label="Confirmation"
              name="confirmation"
              autoComplete="off"
              placeholder="DELETE"
              aria-invalid={confirmationError ? 'true' : 'false'}
              rules={{ validate: (value) => value === 'DELETE' || 'Type DELETE to continue.' }}
            />
            {confirmationError && <p className="mt-2 text-red-700 text-sm">{confirmationError.message}</p>}
            <Input
              className="mt-4 [&_input]:border-red-200"
              label="Current password"
              name="currentPassword"
              type="password"
              autoComplete="current-password"
              rules={{ required: 'Enter your current password.' }}
            />
            {form.formState.errors.currentPassword && <p className="mt-2 text-red-700 text-sm">{form.formState.errors.currentPassword.message}</p>}
            <div className="mt-4 flex flex-wrap gap-3">
              <Button type="submit" variant="danger" disabled={mutation.isMutating}>
                {mutation.isMutating ? 'Deleting…' : 'Confirm deletion'}
              </Button>
              <Button type="button" variant="secondary" onClick={() => setOpened(false)}>
                Cancel
              </Button>
            </div>
          </form>
        </FormProvider>
      )}
      {mutation.error && (
        <p className="mt-3 text-red-700 text-sm" role="alert">
          {mutation.error.message}
        </p>
      )}
    </Card>
  );
};
