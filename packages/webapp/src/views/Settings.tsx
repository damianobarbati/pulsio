import type { User } from 'types/User.ts';
import api from 'ui/api/api.ts';
import { useMe } from 'ui/hook/useMe.ts';

export const Settings = ({ className }: { className?: string }) => {
  const { user } = useMe<User>(api.authMe);
  return <div className={className}>Settings for {user.email}</div>;
};

export default Settings;
