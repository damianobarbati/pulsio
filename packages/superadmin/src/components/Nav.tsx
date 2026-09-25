import cx from 'clsx-tw';
import * as React from 'react';
import useSWRMutation from 'swr/mutation';
import api from 'ui/api/api.ts';
import { NavLink } from 'ui/component/NavLink.tsx';
import { IGlobe, IHome, ILogoutLeft, IUsers } from 'ui/icons.tsx';

export const Nav = ({ className }: { className?: string }) => {
  const logout = useSWRMutation('authLogout', api.authLogout);
  const [message, setMessage] = React.useState('');

  const signOut = async () => {
    setMessage('');

    try {
      await logout.trigger({});
      window.location.assign('/auth');
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Could not log out. Please try again.');
    }
  };

  return (
    <aside className={cx('w-48 border-pulsio-line border-b bg-pulsio-nav px-5 py-6 lg:flex lg:min-h-screen lg:flex-col lg:border-r lg:border-b-0', className)}>
      <a href={window.config.WEBSITE_URL} className="font-black text-3xl text-pulsio-blue tracking-tighter">
        Pulsio
      </a>
      <nav aria-label="App navigation" className="mt-8 flex gap-2 overflow-x-auto lg:flex-col">
        <NavLink className="nav-btn" to="/">
          <IHome size={20} />
          Overview
        </NavLink>
        <NavLink className="nav-btn" to="/users">
          <IUsers size={20} />
          Users
        </NavLink>
        <NavLink className="nav-btn" to="/domains">
          <IGlobe size={20} />
          Domains
        </NavLink>
        <button type="button" className="nav-btn" onClick={signOut} disabled={logout.isMutating}>
          <ILogoutLeft size={20} />
          Logout
        </button>
        {message && (
          <p role="alert" className="text-red-700 text-sm">
            {message}
          </p>
        )}
      </nav>
    </aside>
  );
};
