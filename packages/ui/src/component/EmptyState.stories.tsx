import { Button } from './Button.tsx';
import { EmptyState } from './EmptyState.tsx';

export default { title: 'UI/EmptyState', component: EmptyState };

export const Default = {
  render: () => <EmptyState className="w-[360px]" title="No websites yet" description="Add a website to start collecting analytics." action={<Button>Add website</Button>} />,
};
