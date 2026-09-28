import * as React from 'react';
import { FormProvider, useForm } from 'react-hook-form';
import useSWRMutation from 'swr/mutation';
import { Alert, Button, Card } from 'ui';
import { MPOST } from 'ui/api/fetchers.ts';
import { Input } from 'ui/form';
import { ILock } from 'ui/icons.tsx';

type PasswordFormValues = { currentPassword: string; newPassword: string; confirmPassword: string };

export const AccountPasswordForm = ({ className }: { className?: string }) => {
  const [saved, setSaved] = React.useState(false);
  const mutation = useSWRMutation('/user/change-password', MPOST);
  const form = useForm<PasswordFormValues>();
  const errors = form.formState.errors;

  const submit = async (values: PasswordFormValues) => {
    setSaved(false);
    await mutation.trigger({ current_password: values.currentPassword, new_password: values.newPassword });
    setSaved(true);
    form.reset();
  };

  return (
    <Card as="section" className={className}>
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="font-bold text-lg">Password</h2>
          <p className="mt-1 max-w-xl text-pulsio-muted text-sm">Choose a strong password that you do not use for another service.</p>
        </div>
        <span className="hidden rounded-full bg-blue-50 p-2 text-pulsio-blue sm:block">
          <ILock size={19} />
        </span>
      </div>

      <FormProvider {...form}>
        <form className="mt-6 max-w-xl space-y-4" onSubmit={form.handleSubmit(submit)} noValidate>
          <Input label="Current password" name="currentPassword" type="password" autoComplete="current-password" rules={{ required: 'Enter your current password.' }} />
          {errors.currentPassword && <span className="mt-2 block text-red-700 text-sm">{errors.currentPassword.message}</span>}
          <Input
            label="New password"
            name="newPassword"
            type="password"
            autoComplete="new-password"
            rules={{ required: 'Enter a new password.', minLength: { value: 8, message: 'Use at least 8 characters.' } }}
          />
          {errors.newPassword && <span className="mt-2 block text-red-700 text-sm">{errors.newPassword.message}</span>}
          <Input
            label="Confirm new password"
            name="confirmPassword"
            type="password"
            autoComplete="new-password"
            rules={{
              required: 'Confirm your new password.',
              validate: (value) => value === form.getValues('newPassword') || 'Passwords do not match.',
            }}
          />
          {errors.confirmPassword && <span className="mt-2 block text-red-700 text-sm">{errors.confirmPassword.message}</span>}
          {saved && (
            <Alert className="mt-2" tone="success">
              Password updated.
            </Alert>
          )}
          <Button type="submit" disabled={mutation.isMutating}>
            {mutation.isMutating ? 'Updating…' : 'Update password'}
          </Button>
        </form>
      </FormProvider>
      {mutation.error && (
        <p className="mt-3 text-red-700 text-sm" role="alert">
          {mutation.error.message}
        </p>
      )}
    </Card>
  );
};
