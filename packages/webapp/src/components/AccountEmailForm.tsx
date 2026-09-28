import * as React from 'react';
import { FormProvider, useForm } from 'react-hook-form';
import useSWRMutation from 'swr/mutation';
import { Alert, Button, Card } from 'ui';
import { MPOST } from 'ui/api/fetchers.ts';
import { Input } from 'ui/form';
import { IEdit } from 'ui/icons.tsx';

type EmailFormValues = { email: string; currentPassword: string };
type AccountEmailFormProps = { className?: string; onUpdated: () => Promise<unknown> };

export const AccountEmailForm = ({ className, onUpdated }: AccountEmailFormProps) => {
  const [saved, setSaved] = React.useState(false);
  const mutation = useSWRMutation('/user/change-email', MPOST);
  const form = useForm<EmailFormValues>({ defaultValues: { email: '', currentPassword: '' } });
  const errors = form.formState.errors;

  const submit = async (values: EmailFormValues) => {
    setSaved(false);
    await mutation.trigger({ email: values.email, current_password: values.currentPassword });
    await onUpdated();
    form.setValue('currentPassword', '');
    setSaved(true);
  };

  return (
    <Card as="section" className={className}>
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="font-bold text-lg">Email address</h2>
          <p className="mt-1 max-w-xl text-pulsio-muted text-sm">Use an address that you check often. We will use it for account notices and sign-in.</p>
        </div>
        <span className="hidden rounded-full bg-blue-50 p-2 text-pulsio-blue sm:block">
          <IEdit size={19} />
        </span>
      </div>

      <FormProvider {...form}>
        <form className="mt-6 max-w-xl" onSubmit={form.handleSubmit(submit)} autoComplete="off" noValidate>
          <Input
            label="New email address"
            name="email"
            type="email"
            autoComplete="off"
            aria-invalid={errors.email ? 'true' : 'false'}
            rules={{ required: 'Enter an email address.', pattern: { value: /^\S+@\S+\.\S+$/, message: 'Enter a valid email address.' } }}
          />
          {errors.email && <p className="mt-2 text-red-700 text-sm">{errors.email.message}</p>}
          <Input
            className="mt-4"
            label="Current password"
            name="currentPassword"
            type="password"
            autoComplete="current-password"
            rules={{ required: 'Enter your current password.' }}
          />
          {errors.currentPassword && <p className="mt-2 text-red-700 text-sm">{errors.currentPassword.message}</p>}
          {saved && (
            <Alert className="mt-4" tone="success">
              Email address updated.
            </Alert>
          )}
          <Button className="mt-5" type="submit" disabled={mutation.isMutating}>
            {mutation.isMutating ? 'Saving…' : 'Save email'}
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
