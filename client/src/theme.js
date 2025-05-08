import { extendTheme } from '@chakra-ui/react';

// SideBuilds custom theme
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
      50: '#f2f2f2',
      100: '#d9d9d9',
      200: '#bfbfbf',
      300: '#a6a6a6',
      400: '#8c8c8c',
      500: '#737373',
      600: '#595959',
      700: '#404040',
      800: '#262626',
      900: '#0d0d0d',
    },
  },
  fonts: {
    heading: 'Arial, sans-serif',
    body: 'Arial, sans-serif',
  },
  styles: {
    global: props => ({
      body: {
        bg: 'black',
        color: 'white',
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
          color: 'gray.300',
          _hover: {
            bg: 'whiteAlpha.100',
          },
        },
      },
    },
    Card: {
      baseStyle: {
        container: {
          bg: 'gray.800',
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