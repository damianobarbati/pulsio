import { Dialog } from './Dialog.tsx';

export default { title: 'UI/Dialog', component: Dialog };

export const Confirmation = {
  render: () => (
    <Dialog open title="Delete account?" confirmLabel="Delete" onClose={() => undefined} onConfirm={() => undefined}>
      This action cannot be undone.
    </Dialog>
  ),
};
