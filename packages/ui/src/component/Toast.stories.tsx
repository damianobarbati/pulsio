import { Toast } from './Toast.tsx';

export default { title: 'UI/Toast', component: Toast };

export const Success = { render: () => <Toast message="Changes saved successfully." onClose={() => undefined} /> };
