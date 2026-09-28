import { fileURLToPath } from 'node:url';
import { Eta } from 'eta';

const directory = fileURLToPath(new URL('.', import.meta.url));
const eta = new Eta({ cache: true, views: directory });

export type EmailTemplate = 'contact' | 'report' | 'welcome';

export const Email = {
  logo: {
    cid: 'pulsio-logo',
    filename: 'pulsio-logo.svg',
    path: fileURLToPath(new URL('../assets/logo.svg', import.meta.url)),
  },

  render({ template, data }: { template: EmailTemplate; data: object }) {
    const html = eta.render(template, data);
    return html;
  },
};
