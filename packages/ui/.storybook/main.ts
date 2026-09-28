import type { StorybookConfig } from '@storybook/react-vite';
import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';

const config: StorybookConfig = {
  stories: ['../src/**/*.stories.tsx'],
  framework: '@storybook/react-vite',
  features: {
    menuOnboardingChecklist: false,
    sidebarOnboardingChecklist: false,
  },
  viteFinal: async (config) => {
    config.plugins = [...(config.plugins || []), tailwindcss(), react()];
    return config;
  },
};

export default config;
