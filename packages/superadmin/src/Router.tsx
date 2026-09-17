import { type ComponentProps, lazy, type ReactNode, Suspense } from 'react';
import { Route, Switch } from 'wouter';

const OverviewView = lazy(async () => ({ default: (await import('./views/Overview.tsx')).OverviewView }));
const UsersView = lazy(async () => ({ default: (await import('./views/Users.tsx')).UsersView }));
const DomainsView = lazy(async () => ({ default: (await import('./views/Domains.tsx')).DomainsView }));
const PaymentsView = lazy(async () => ({ default: (await import('./views/Payments.tsx')).PaymentsView }));

type Props = {
  users: ComponentProps<typeof UsersView>;
  domains: ComponentProps<typeof DomainsView>;
  payments: ComponentProps<typeof PaymentsView>;
  userDrawer: (id: string) => ReactNode;
  websiteDrawer: (id: string) => ReactNode;
};

const Loading = () => (
  <p className="mt-8" role="status">
    Loading view…
  </p>
);

export const Router = ({ users, domains, payments, userDrawer, websiteDrawer }: Props) => (
  <Suspense fallback={<Loading />}>
    <Switch>
      <Route path="/users/:id">
        {({ id }) => (
          <>
            <UsersView {...users} />
            {userDrawer(id)}
          </>
        )}
      </Route>
      <Route path="/users">
        <UsersView {...users} />
      </Route>
      <Route path="/websites/:id">
        {({ id }) => (
          <>
            <DomainsView {...domains} />
            {websiteDrawer(id)}
          </>
        )}
      </Route>
      <Route path="/websites">
        <DomainsView {...domains} />
      </Route>
      <Route path="/payments">
        <PaymentsView {...payments} />
      </Route>
      <Route>
        <OverviewView active />
      </Route>
    </Switch>
  </Suspense>
);
