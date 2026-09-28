import type { Preview } from '@storybook/react-vite';
import './preview.css';

const preview: Preview = { parameters: { layout: 'centered', backgrounds: { default: 'surface', values: [{ name: 'surface', value: '#f7faff' }] } } };

export default preview;
