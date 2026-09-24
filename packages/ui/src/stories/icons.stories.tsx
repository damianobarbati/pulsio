import * as Icons from '../icons.tsx';

const iconEntries = Object.entries(Icons);

export default { title: 'UI/Icons', parameters: { layout: 'fullscreen' } };

export const AllIcons = {
  render: () => (
    <main className="flex flex-wrap gap-4 p-24">
      {iconEntries.map(([name, Icon]) => (
        <div
          key={name}
          role="img"
          aria-label={name}
          title={name}
          className="flex aspect-square items-center justify-center rounded-lg border border-pulsio-line bg-white text-pulsio-ink"
        >
          <Icon className="h-8 w-8" aria-hidden="true" />
        </div>
      ))}
    </main>
  ),
};
