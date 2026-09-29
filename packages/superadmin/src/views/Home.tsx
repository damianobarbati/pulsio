import type { IUser } from 'types/User.ts';
import { GET } from 'ui/api/fetchers.ts';
import { useMe } from 'ui/hook/useMe.ts';

const authMe = () => GET<IUser.user>(['/auth/me']);

export const Home = ({ className }: { className?: string }) => {
  const { user } = useMe<IUser.user>(authMe, 'superadmin');
  return <div className={className}>Home for {user.email}</div>;
};

export default Home;
