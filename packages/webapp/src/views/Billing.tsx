import { useMe } from 'ui/hooks/useMe.ts';
import { checkAuth } from '#webapp/api.ts';

export const Billing = () => {
  const { user } = useMe(checkAuth);
  return <div>Billing for {user.email}</div>;
};

export default Billing;
