import type { IUser } from 'types/User.ts';
import { GET } from 'ui/api/fetchers.ts';
import { useMe } from 'ui/hook/useMe.ts';
import { IShield } from 'ui/icons.tsx';
import { AccountDangerZone } from '#webapp/components/AccountDangerZone.tsx';
import { AccountEmailForm } from '#webapp/components/AccountEmailForm.tsx';
import { AccountPasswordForm } from '#webapp/components/AccountPasswordForm.tsx';
import { AutodiscoveryForm } from '#webapp/components/AutodiscoveryForm.tsx';
import { UserBrandForm } from '#webapp/components/UserBrandForm.tsx';

const authMe = () => GET<IUser.user>(['/auth/me']);

export const Account = ({ className }: { className?: string }) => {
  const { user, mutate } = useMe<IUser.user>(authMe);

  return (
    <div className={className}>
      <header className="mx-auto max-w-4xl">
        <h1 className="mt-3 flex flex-row items-center gap-2 font-bold text-3xl tracking-tight sm:text-4xl">
          <IShield />
          Your account
        </h1>
      </header>

      <div className="mx-auto mt-8 max-w-4xl space-y-5 pb-10">
        <UserBrandForm user={user} onUpdated={mutate} />
        <AutodiscoveryForm user={user} onUpdated={mutate} />
        <AccountEmailForm onUpdated={mutate} />
        <AccountPasswordForm />
        <AccountDangerZone />
      </div>
    </div>
  );
};

export default Account;
