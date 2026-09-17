import { Dashboard } from '../Dashboard.tsx';

type Site = { id: string; domain: string; detected: boolean; automaticallyDiscovered: boolean; snippet: string; adminUrl: string };

export const OverviewView = ({ sites, selected, onSite }: { sites: Site[]; selected: Site; onSite: (id: string) => void }) => (
  <Dashboard key={selected.id} sites={sites} selected={selected} onSite={onSite} />
);
