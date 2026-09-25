import { Textarea } from './Textarea.tsx';

export default { title: 'UI/Textarea', component: Textarea };

export const States = {
  render: () => (
    <div className="w-80 space-y-4">
      <Textarea placeholder="Your message" />
      <Textarea disabled value="Disabled message" />
    </div>
  ),
};
