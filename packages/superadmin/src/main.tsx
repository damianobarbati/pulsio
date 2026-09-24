import React from 'react';
import { createRoot } from 'react-dom/client';
import { SWRConfig } from 'swr';
import { ScreenGuard, Spinner } from 'ui';
import NotFound from 'ui/NotFound.tsx';
import { Route, Router, Switch } from 'wouter';
import Auth from '#superadmin/views/Auth.tsx';
import Domains from '#superadmin/views/Domains.tsx';
import Home from '#superadmin/views/Home.tsx';
import { Layout } from '#superadmin/views/Layout.tsx';
import Users from '#superadmin/views/Users.tsx';

const response = await fetch('/config.json', { cache: 'no-store' });
if (!response.ok) throw new Error('Could not load application runtime configuration');
window.config = await response.json();

const container = document.getElementById('root') as Element;
const root = createRoot(container);

root.render(
  <React.StrictMode>
    <SWRConfig value={{ revalidateOnFocus: false, revalidateOnReconnect: false, revalidateIfStale: false }}>
      <ScreenGuard>
        <Router>
          <React.Suspense fallback={<Spinner size="lg" />}>
            <Switch>
              <Route path="/auth" component={Auth} />
              <Route path="/" nest>
                <Layout>
                  <Switch>
                    <Route path="/" component={Home} />
                    <Route path="/users" component={Users} />
                    <Route path="/domains" component={Domains} />
                    <Route component={NotFound} />
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
