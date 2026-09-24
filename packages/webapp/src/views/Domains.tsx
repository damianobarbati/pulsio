import { useMe } from 'ui/hooks/useMe.ts';
import { checkAuth } from '#webapp/api.ts';

export const Domains = () => {
  const { user } = useMe(checkAuth);
  return <div>Domains for {user.email}</div>;
};

export default Domains;
