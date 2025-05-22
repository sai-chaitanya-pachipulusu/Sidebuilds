import { extendTheme } from '@chakra-ui/react';

// SideBuilds custom theme - REVERTED to simpler version
const theme = extendTheme({
  config: {
    initialColorMode: 'dark',
    useSystemColorMode: false,
  },
  colors: {
    brand: {
      // Assuming 500 was the main brand color, mapped to --primary-color from index.css
      50: '#EBF8FF', // Lightest blue, for example
      100: '#BEE3F8',
      200: '#90CDF4',
      300: '#63B3ED',
      400: '#4299E1',
      500: 'var(--primary-color)', // This will pick up #60A5FA from index.css
      600: '#2B6CB0',
      700: '#2C5282',
      800: '#2A4365',
      900: '#1A365D', // Darkest blue
    },
    // Grays are often best left to Chakra's defaults or controlled by --text-color and --bg-color
  },
  fonts: {
    heading: 'var(--base-font)', // From index.css
    body: 'var(--base-font)',    // From index.css
  },
  styles: {
    global: props => ({
      body: {
        bg: 'var(--bg-color)',      // From index.css, expected to be #000000 or overridden
        color: 'var(--text-color)',  // From index.css
        fontFamily: 'var(--base-font)',
        fontSize: 'var(--base-font-size)',
        lineHeight: '1.6',
      },
      'h1, h2, h3, h4, h5, h6': {
        color: 'var(--text-color)', // Default headings to text color; specific can override
        fontFamily: 'var(--base-font)',
        // fontWeight: 'bold', // Keep Chakra's defaults or specific overrides
        // marginBottom: '0.5em',
      },
      a: {
        color: 'brand.500', // Use the brand color for links
        _hover: {
          textDecoration: 'underline',
        },
      },
      // Keep other global styles minimal to allow index.css and overrides to work
    }),
  },
  components: {
    // REVERTING MOST COMPONENT CUSTOMIZATIONS to rely on Chakra defaults + CSS overrides
    Button: {
      baseStyle: {
        // Minimal base style, rely on Chakra defaults primarily
      },
      variants: {
        solid: {
          // bg: 'brand.500', // Let default Chakra theming handle this with brand color
          // color: 'white',
        },
        // Other variants (outline, ghost) will use Chakra defaults
      },
    },
    Card: {
      baseStyle: {
        // container: { // Remove specific card styling to let CSS or Chakra handle it
        //   bg: 'var(--card-bg)',
        //   color: 'var(--text-color)',
        // },
      },
    },
    Modal: {
      baseStyle: {
        // dialog: { bg: 'var(--card-bg)' }, // Let it be dark by default due to global styles
      },
    },
    Input: {
        baseStyle: {
            field: {
                // Rely on Chakra's dark theme adaptations or global input styles in index.css/black-override.css
            }
        }
    }
    // Other components like Menu, Link, Textarea, Select, Table, Alert will use Chakra defaults
    // or be styled by global CSS / black-override.css
  },
});

export default theme; 