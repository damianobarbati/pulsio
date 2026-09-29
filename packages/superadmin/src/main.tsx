import React from 'react';
import { createRoot } from 'react-dom/client';
import { SWRConfig } from 'swr';
import { ScreenGuard, Spinner } from 'ui';
import { MPOST } from 'ui/api/fetchers.ts';
import { Auth } from 'ui/component/Auth.tsx';
import NotFound from 'ui/component/NotFound.tsx';
import { Route, Router, Switch } from 'wouter';
import Domains from '#superadmin/views/Domains.tsx';
import Home from '#superadmin/views/Home.tsx';
import { Layout } from '#superadmin/views/Layout.tsx';
import Users from '#superadmin/views/Users.tsx';

const response = await fetch('/config.json', { cache: 'no-store' });
if (!response.ok) throw new Error('Could not load application runtime configuration');
window.config = await response.json();

await (async () => {
  if (window.config.APP_ENV !== 'local') return;

  const email = new URLSearchParams(window.location.search).get('auth_email');
  if (!email) return;

  try {
    await MPOST('/auth/login', { arg: { email, password: email } });
    window.location.replace('/');
  } catch (error) {
    console.error('Automatic local authentication failed.', error);
  }
})();

const container = document.getElementById('root') as Element;
const root = createRoot(container);

root.render(
  <React.StrictMode>
    <SWRConfig value={{ revalidateOnFocus: false, revalidateOnReconnect: false, revalidateIfStale: false }}>
      <ScreenGuard>
        <Router>
          <React.Suspense fallback={<Spinner size="lg" />}>
            <Switch>
              <Route path="/auth">
                <Auth title="Pulsio Superadmin" role="superadmin" />
              </Route>
              <Route path="/" nest>
                <Layout>
                  <Switch>
                    <Route path="/">
                      <Home />
                    </Route>
                    <Route path="/users">
                      <Users />
                    </Route>
                    <Route path="/domains">
                      <Domains />
                    </Route>
                    <Route>
                      <NotFound />
                    </Route>
                  </Switch>
                </Layout>
              </Route>
            </Switch>
          </React.Suspense>
        </Router>
      </ScreenGuard>
    </SWRConfig>
  </React.StrictMode>,
);
