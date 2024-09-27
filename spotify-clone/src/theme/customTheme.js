import { createTheme } from '@aws-amplify/ui-react';

export const customTheme = createTheme({
  name: 'black-red-theme',
  tokens: {
    colors: {
      background: {
        primary: { value: '#000000' },  // Black background for forms
        secondary: { value: '#1A1A1A' },  // Dark grey for secondary backgrounds
      },
      brand: {
        primary: {
          10: { value: '#FF0000' },  // Red for buttons and primary actions
          80: { value: '#CC0000' },  // Darker red for hover state
        },
      },
      font: {
        primary: { value: '#FFFFFF' },  // White text
        secondary: { value: '#FF0000' },  // Red text for labels
      },
    },
  },
});
