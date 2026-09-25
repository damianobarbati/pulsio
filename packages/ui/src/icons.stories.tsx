import * as Icons from './icons.tsx';

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
          className="flex aspect-square items-center justify-center rounded-sm border border-pulsio-line bg-white p-2 text-pulsio-ink"
        >
          <Icon className="size-6" aria-hidden="true" />
        </div>
      ))}
    </main>
  ),
};
