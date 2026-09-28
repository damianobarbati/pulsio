import type { User } from 'types/User.ts';
import api from 'ui/api/api.ts';
import { useMe } from 'ui/hook/useMe.ts';

export const Home = ({ className }: { className?: string }) => {
  const { user } = useMe<User>(api.authMe, 'superadmin');
  return <div className={className}>Home for {user.email}</div>;
};

export default Home;
