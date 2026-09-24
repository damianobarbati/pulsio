import React from 'react';
import { createRoot } from 'react-dom/client';
import { SWRConfig } from 'swr';
import { ScreenGuard, Spinner } from 'ui';
import NotFound from 'ui/NotFound.tsx';
import { Route, Router, Switch } from 'wouter';
import Auth from '#webapp/views/Auth.tsx';
import Billing from '#webapp/views/Billing.tsx';
import Home from '#webapp/views/Home.tsx';
import { Layout } from '#webapp/views/Layout.tsx';
import Settings from '#webapp/views/Settings.tsx';

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
                    <Route path="/billing" component={Billing} />
                    <Route path="/settings" component={Settings} />
                    <Route path="/account" component={NotFound} />
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
