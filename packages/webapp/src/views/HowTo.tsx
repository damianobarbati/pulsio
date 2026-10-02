import type { IUser } from 'types/User.ts';
import { GET } from 'ui/api/fetchers.ts';
import { ApiHowTo } from 'ui/component/ApiHowTo.tsx';
import { useMe } from 'ui/hook/useMe.ts';

const authMe = () => GET<IUser.user>(['/auth/me']);

type HowToProps = {
  className?: string;
};

export const HowTo = ({ className }: HowToProps) => {
  const { user } = useMe<IUser.user>(authMe);

  return <ApiHowTo className={className} userId={user.id} />;
};

export default HowTo;
