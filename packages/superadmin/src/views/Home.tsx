import { checkAuth } from 'ui/api/api.ts';
import { useMe } from 'ui/hooks/useMe.ts';

export const Home = () => {
  const { user } = useMe(checkAuth);
  return <div>Home for {user.email}</div>;
};

export default Home;
