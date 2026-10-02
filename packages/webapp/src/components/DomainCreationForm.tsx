import * as React from 'react';
import { FormProvider, useForm } from 'react-hook-form';
import useSWRMutation from 'swr/mutation';
import { MPOST } from 'ui/api/fetchers.ts';
import { Button } from 'ui/component/Button.tsx';
import { Input } from 'ui/form';
import { IGlobe, IPlus } from 'ui/icons.tsx';

type DomainCreationFormProps = { className?: string; onCreated: () => Promise<unknown> };
type DomainCreationFormValues = { domain: string };

export const DomainCreationForm = ({ className, onCreated }: DomainCreationFormProps) => {
  const form = useForm<DomainCreationFormValues>({ defaultValues: { domain: '' } });
  const create = useSWRMutation('/domain', MPOST);
  const [error, setError] = React.useState('');

  const submit = async (values: DomainCreationFormValues) => {
    setError('');
    try {
      await create.trigger({ domain: values.domain.trim().toLowerCase() });
      form.reset();
      await onCreated();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Could not add domain.');
    }
  };

  return (
    <section className={className}>
      <div className="flex items-start gap-3">
        <span className="grid size-9 shrink-0 place-items-center rounded-md bg-blue-50 text-pulsio-blue">
          <IGlobe size={19} />
        </span>
        <div>
          <h2 className="font-semibold">Add a domain</h2>
          <p className="mt-1 text-pulsio-muted text-sm">Add your site before installing the tracking snippet.</p>
        </div>
      </div>
      <FormProvider {...form}>
        <form className="mt-5 flex flex-col gap-2 sm:flex-row" onSubmit={form.handleSubmit(submit)} noValidate>
          <Input className="flex-1" name="domain" label="Domain" placeholder="example.com" rules={{ required: 'Enter a domain.' }} />
          <Button className="shrink-0 sm:self-end" type="submit" disabled={create.isMutating}>
            <IPlus size={18} /> {create.isMutating ? 'Adding…' : 'Add domain'}
          </Button>
        </form>
      </FormProvider>
      {error && (
        <p className="mt-2 text-red-700 text-sm" role="alert">
          {error}
        </p>
      )}
    </section>
  );
};
