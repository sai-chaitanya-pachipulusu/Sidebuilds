import { extendTheme } from '@chakra-ui/react';

// SideBuilds custom theme with pure black backgrounds
const theme = extendTheme({
  config: {
    initialColorMode: 'dark',
    useSystemColorMode: false,
  },
  colors: {
    brand: {
      50: '#e6f0ff',
      100: '#b3d1ff',
      200: '#80b3ff',
      300: '#4d94ff',
      400: '#1a75ff',
      500: '#0070f3', // Primary blue
      600: '#005abf',
      700: '#00438c',
      800: '#002d59',
      900: '#001626',
    },
    gray: {
      50: '#FFFFFF',
      100: '#FFFFFF',
      200: '#FFFFFF',
      300: '#FFFFFF',
      400: '#FFFFFF',
      500: '#FFFFFF',
      600: '#595959',
      700: '#404040',
      800: '#000000', // Changed to pure black
      900: '#000000', // Changed to pure black
    },
  },
  fonts: {
    heading: 'Arial, sans-serif',
    body: 'Arial, sans-serif',
  },
  styles: {
    global: props => ({
      body: {
        bg: '#000000', // Pure black
        color: 'white',
      },
      // Force all containers to have black backgrounds
      '.chakra-container': {
        bg: '#000000',
      },
      // Force all modal contents to have black backgrounds
      '.chakra-modal__content': {
        bg: '#000000',
      },
      // Force all cards to have black backgrounds
      '.chakra-card': {
        bg: '#000000',
      },
    }),
  },
  components: {
    Button: {
      baseStyle: {
        fontWeight: 600,
        borderRadius: 'md',
        _hover: {
          transform: 'translateY(-2px)',
          transition: 'all 0.2s ease-in-out',
        },
      },
      variants: {
        solid: {
          bg: 'brand.500',
          color: 'white',
          _hover: {
            bg: 'brand.400',
          },
        },
        outline: {
          borderColor: 'brand.500',
          color: 'brand.500',
          _hover: {
            bg: 'brand.500',
            color: 'white',
          },
        },
        ghost: {
          color: 'white',
          bg: '#000000', // Pure black
          _hover: {
            bg: 'whiteAlpha.100',
          },
        },
      },
    },
    Card: {
      baseStyle: {
        container: {
          bg: '#000000', // Changed to pure black
          borderRadius: 'lg',
          borderWidth: '1px',
          borderColor: 'gray.700',
          transition: 'all 0.2s ease-in-out',
          _hover: {
            transform: 'translateY(-5px)',
            boxShadow: 'lg',
          },
        },
      },
    },
    Modal: {
      baseStyle: {
        dialog: {
          bg: '#000000', // Pure black for modals
        },
        header: {
          bg: '#000000', // Pure black for modal headers
        },
        body: {
          bg: '#000000', // Pure black for modal body
        },
        footer: {
          bg: '#000000', // Pure black for modal footer
        },
      },
    },
    Menu: {
      baseStyle: {
        list: {
          bg: '#000000', // Pure black for dropdown menus
        },
        item: {
          bg: '#000000', // Pure black for menu items
          _hover: {
            bg: 'whiteAlpha.100',
          },
        },
      },
    },
    Link: {
      baseStyle: {
        color: 'brand.500',
        _hover: {
          textDecoration: 'none',
          color: 'brand.400',
        },
      },
    },
  },
});

export default theme; 