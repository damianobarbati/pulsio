import * as React from 'react';
import { MultiSelect } from '../MultiSelect.tsx';

const fiveOptions = [
  { value: 'pulsio.io', label: 'pulsio.io' },
  { value: 'example.com', label: 'example.com' },
  { value: 'website.test', label: 'website.test' },
  { value: 'acme.dev', label: 'acme.dev' },
  { value: 'demo.app', label: 'demo.app' },
];

const hundredOptions = Array.from({ length: 100 }, (_, index) => ({ value: `website-${index + 1}`, label: `Website ${index + 1}` }));

export const MultiSelectPreview = () => {
  const [selectedFiveOptions, setSelectedFiveOptions] = React.useState<string[]>([]);
  const [selectedHundredOptions, setSelectedHundredOptions] = React.useState<string[]>([]);

  return (
    <div className="w-80 space-y-4">
      <div>
        <p className="mb-2 font-semibold text-pulsio-ink text-sm">Zero options</p>
        <MultiSelect options={[]} value={[]} onChange={() => undefined} />
      </div>
      <div>
        <p className="mb-2 font-semibold text-pulsio-ink text-sm">Five options</p>
        <MultiSelect options={fiveOptions} value={selectedFiveOptions} onChange={setSelectedFiveOptions} />
      </div>
      <div>
        <p className="mb-2 font-semibold text-pulsio-ink text-sm">One hundred options</p>
        <MultiSelect options={hundredOptions} value={selectedHundredOptions} onChange={setSelectedHundredOptions} />
      </div>
    </div>
  );
};
