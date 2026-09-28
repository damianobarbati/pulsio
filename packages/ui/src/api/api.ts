import type { User } from 'types/User.ts';
import { GET, MPOST } from '#ui/api/fetchers.ts';

const authMe = () => GET<User>(['/auth/me']);

const authLogout = (_key: string, { arg }: { arg: object }) => MPOST<boolean, object>('/auth/logout', { arg });

export default { authMe, authLogout };
