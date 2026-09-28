import { Alert } from './Alert.tsx';

export default { title: 'UI/Alert', component: Alert };

export const Tones = {
  render: () => (
    <div className="w-96 space-y-3">
      <Alert>Informational feedback.</Alert>
      <Alert tone="success">Saved successfully.</Alert>
      <Alert tone="warning">Check your setup.</Alert>
      <Alert tone="error">Could not save changes.</Alert>
    </div>
  ),
};
