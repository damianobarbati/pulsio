'use client';

import cx from 'clsx-tw';
import Link from 'next/link';
import { FormProvider, useForm } from 'react-hook-form';
import useSWRMutation from 'swr/mutation';
import { Input } from 'ui/form';

type ContactValues = { name: string; email: string; message: string };
const sendMessage = async (url: string, { arg }: { arg: ContactValues }) => {
  const response = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(arg) });
  const result = await response.json();
  if (!response.ok) throw new Error(result.message);
  return result as { message: string };
};

export const ContactUs = ({ className }: { className?: string }) => {
  const form = useForm<ContactValues>();
  const message = useSWRMutation('/api/contact', sendMessage);
  const submit = form.handleSubmit(async (values) => {
    try {
      await message.trigger(values);
      form.reset();
    } catch {}
  });
  return (
    <section className={cx('mx-auto grid max-w-5xl gap-12 px-6 py-16 md:grid-cols-[.8fr_1.2fr]', className)}>
      <div>
        <Link href="/" className="mb-6 block font-semibold text-pulsio-blue text-sm underline underline-offset-2">
          ← Back to home
        </Link>
        <p className="font-bold text-pulsio-blue text-xs uppercase tracking-widest">Support</p>
        <h1 className="mt-5 font-semibold text-5xl tracking-tight">How can we help?</h1>
        <p className="mt-5 text-ink/70 text-lg leading-relaxed">Send us a message and we will get back to you at the email address you provide.</p>
        <p className="mt-7 text-ink/65 text-sm">
          You can also write directly to{' '}
          <a className="font-semibold text-pulsio-blue underline" href="mailto:info@pulsio.live">
            info@pulsio.live
          </a>
          .
        </p>
      </div>
      <FormProvider {...form}>
        <form onSubmit={submit} className="rounded-lg border border-pulsio-line bg-white p-7 shadow-pulsio">
          <div className="space-y-5">
            <Input label="Name" name="name" required autoComplete="name" />
            <Input label="Email" name="email" required type="email" autoComplete="email" />
            <label className="block font-semibold text-sm">
              Message
              <textarea required rows={7} {...form.register('message')} className="mt-2 block w-full resize-y rounded-sm border border-pulsio-line px-3 py-2.5 font-normal" />
            </label>
          </div>
          {message.error && (
            <p role="alert" className="mt-4 text-red-700 text-sm">
              {message.error.message}
            </p>
          )}
          {message.data && (
            <p role="status" className="mt-4 text-emerald-700 text-sm">
              {message.data.message}
            </p>
          )}
          <button type="submit" disabled={message.isMutating} className="mt-6 rounded-sm bg-pulsio-blue px-5 py-3 font-semibold text-sm text-white disabled:opacity-50">
            {message.isMutating ? 'Sending…' : 'Send message'}
          </button>
        </form>
      </FormProvider>
    </section>
  );
};

export default ContactUs;
