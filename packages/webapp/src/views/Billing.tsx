import type { User } from 'types/User.ts';
import api from 'ui/api/api.ts';
import { useMe } from 'ui/hook/useMe.ts';

export const Billing = ({ className }: { className?: string }) => {
  const { user } = useMe<User>(api.authMe);
  return <div className={className}>Billing for {user.email}</div>;
};

export default Billing;
