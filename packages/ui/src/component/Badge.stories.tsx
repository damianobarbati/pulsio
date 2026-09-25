import { Badge } from './Badge.tsx';

export default { title: 'UI/Badge', component: Badge };

export const Tones = {
  render: () => (
    <div className="flex gap-2">
      <Badge>Default</Badge>
      <Badge tone="success">Live</Badge>
      <Badge tone="warning">Warning</Badge>
      <Badge tone="error">Error</Badge>
    </div>
  ),
};
