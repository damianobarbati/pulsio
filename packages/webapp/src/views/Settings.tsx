import { useMe } from 'ui/hooks/useMe.ts';
import { checkAuth } from '#webapp/api.ts';

export const Settings = () => {
  const { user } = useMe(checkAuth);
  return <div>Settings for {user.email}</div>;
};

export default Settings;
