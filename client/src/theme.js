import { extendTheme } from '@chakra-ui/react';

// Define a custom theme
const theme = extendTheme({
  // Initial color mode and system color mode settings
  config: {
    initialColorMode: 'dark', // Force dark mode
    useSystemColorMode: false, // Do not use system color mode preference
  },
  // Global styles to ensure a dark theme is applied
  styles: {
    global: (props) => ({
      body: {
        bg: '#000000', // Pure black background
        color: 'gray.100', // Light gray text for readability
        fontFamily: 'body', // Use the default body font
        lineHeight: 'base',
        overflowX: 'hidden', // Prevent horizontal scrollbars globally
      },
      '*, *::before, *::after': {
        borderColor: 'gray.700', // Darker borders for elements
      },
      // Force black background for specific common layout components
      // if they somehow escape the body style or black-override.css
      '#root': {
        bg: '#000000 !important',
      },
      main: {
        bg: '#000000 !important',
      },
      article: {
        bg: '#000000 !important',
      },
      section: {
        bg: '#000000 !important',
      },
      header: {
        bg: '#000000 !important',
      },
      footer: {
        bg: '#000000 !important',
      },
      aside: {
        bg: '#000000 !important',
      },
      nav: {
        bg: '#000000 !important',
      },
      // Specific overrides for Chakra UI components that might have their own background
      ".chakra-modal__content": {
        bg: "#000000 !important",
        color: "gray.100",
      },
      ".chakra-modal__header": {
        bg: "#000000 !important",
        color: "gray.100",
        borderBottom: "1px solid",
        borderColor: "gray.700",
      },
      ".chakra-modal__body": {
        bg: "#000000 !important",
        color: "gray.200",
      },
      ".chakra-modal__footer": {
        bg: "#000000 !important",
        borderTop: "1px solid",
        borderColor: "gray.700",
      },
      ".chakra-menu__menu-list": {
        bg: "#000000 !important",
        border: "1px solid",
        borderColor: "gray.700",
      },
      ".chakra-menu__menuitem": {
        bg: "#000000 !important",
        color: "gray.100",
        _hover: {
          bg: "gray.800 !important", // Darker gray on hover
        },
      },
      ".chakra-card": {
        bg: "#050505 !important", // Slightly off-black for cards to differentiate
        color: "gray.100",
        border: "1px solid",
        borderColor: "gray.700 !important",
      },
      ".chakra-card__header": {
        bg: "#050505 !important",
        borderBottom: "1px solid",
        borderColor: "gray.700 !important",
      },
      ".chakra-card__body": {
        bg: "#050505 !important",
      },
      ".chakra-card__footer": {
        bg: "#050505 !important",
        borderTop: "1px solid",
        borderColor: "gray.700 !important",
      },
      ".chakra-tabs__tab-list": {
        borderBottomColor: "gray.700",
      },
      ".chakra-tabs__tab": {
        color: "gray.400",
        _selected: {
          color: "blue.300", // Brighter color for selected tab
          borderColor: "blue.300",
        },
        _hover: {
          bg: "gray.800 !important",
        },
      },
      ".chakra-tabs__tab-panel": {
        bg: "#000000 !important",
      },
      ".chakra-table": {
        color: "gray.100",
      },
      ".chakra-table th": {
        color: "gray.300",
        borderBottom: "1px solid",
        borderColor: "gray.700 !important",
        bg: "#030303 !important", // Very dark header for table
      },
      ".chakra-table td": {
        borderBottom: "1px solid",
        borderColor: "gray.800 !important", // Slightly lighter border for table rows
      },
      ".chakra-table tbody tr:hover td": {
        bg: "gray.800 !important",
      },
      ".chakra-form-label": {
        color: "gray.200",
      },
      ".chakra-input": {
        bg: "#080808 !important", // Very dark input background
        color: "gray.100",
        borderColor: "gray.600 !important",
        _hover: {
          borderColor: "gray.500 !important",
        },
        _focus: {
          borderColor: "blue.500 !important",
          boxShadow: "0 0 0 1px var(--chakra-colors-blue-500) !important",
        },
      },
      ".chakra-select": {
        bg: "#080808 !important",
        color: "gray.100",
        borderColor: "gray.600 !important",
        _hover: {
          borderColor: "gray.500 !important",
        },
      },
      ".chakra-textarea": {
        bg: "#080808 !important",
        color: "gray.100",
        borderColor: "gray.600 !important",
        _hover: {
          borderColor: "gray.500 !important",
        },
        _focus: {
          borderColor: "blue.500 !important",
          boxShadow: "0 0 0 1px var(--chakra-colors-blue-500) !important",
        },
      },
      ".chakra-badge": {
        // Default badge styling assumes light text on dark background
        // colorScheme might override this, ensure badge color schemes provide good contrast
        // Forcing a specific background for default variant:
        // variants: {
        //   solid: (props) => ({
        //     bg: props.colorMode === 'dark' ? `${props.colorScheme}.700` : `${props.colorScheme}.500`,
        //     color: props.colorMode === 'dark' ? `white` : `gray.800`
        //   }),
        // }
      },
      // Ensure scrollbars are dark-themed (Webkit only)
      "::-webkit-scrollbar": {
        width: '8px',
        height: '8px'
      },
      "::-webkit-scrollbar-track": {
        background: '#0d0d0d' // Dark track
      },
      "::-webkit-scrollbar-thumb": {
        backgroundColor: '#2a2a2a', // Dark thumb
        borderRadius: '4px',
        border: '2px solid #0d0d0d' // Padding around thumb
      },
      "::-webkit-scrollbar-thumb:hover": {
        backgroundColor: '#555' // Darker thumb on hover
      }
    }),
  },
  // Component-specific style overrides
  components: {
    Button: {
      baseStyle: {
        fontWeight: 'semibold',
      },
      variants: {
        solid: (props) => ({
          bg: props.colorMode === 'dark' ? 'blue.500' : 'blue.500',
          color: 'white',
          _hover: {
            bg: props.colorMode === 'dark' ? 'blue.600' : 'blue.600',
            _disabled: {
              bg: props.colorMode === 'dark' ? 'blue.500' : 'blue.500', // Keep same color when disabled and hovered
            }
          },
          _active: {
            bg: props.colorMode === 'dark' ? 'blue.700' : 'blue.700',
          },
          _disabled: {
            opacity: 0.6,
            cursor: 'not-allowed',
            bg: props.colorMode === 'dark' ? 'blue.500' : 'blue.500', // Ensure disabled bg is consistent
          }
        }),
        outline: (props) => ({
          borderColor: props.colorMode === 'dark' ? 'blue.400' : 'blue.500',
          color: props.colorMode === 'dark' ? 'blue.300' : 'blue.500',
          _hover: {
            bg: props.colorMode === 'dark' ? 'rgba(59, 130, 246, 0.1)' : 'blue.50', // blue.400 with alpha
          },
          _active: {
            bg: props.colorMode === 'dark' ? 'rgba(59, 130, 246, 0.2)' : 'blue.100',
          },
        }),
        ghost: (props) => ({
          color: props.colorMode === 'dark' ? 'blue.300' : 'blue.500',
          _hover: {
            bg: props.colorMode === 'dark' ? 'rgba(59, 130, 246, 0.1)' : 'blue.50',
          },
          _active: {
            bg: props.colorMode === 'dark' ? 'rgba(59, 130, 246, 0.2)' : 'blue.100',
          },
        }),
        // Custom variant for destructive actions
        destructive: {
          bg: 'red.600',
          color: 'white',
          _hover: {
            bg: 'red.700',
             _disabled: { bg: 'red.600' }
          },
          _active: {
            bg: 'red.800',
          },
          _disabled: {
            opacity: 0.6,
            cursor: 'not-allowed',
            bg: 'red.600',
          }
        },
        // Custom variant for success actions
        success: {
          bg: 'green.500',
          color: 'white',
          _hover: {
            bg: 'green.600',
            _disabled: { bg: 'green.500' }
          },
          _active: {
            bg: 'green.700',
          },
           _disabled: {
            opacity: 0.6,
            cursor: 'not-allowed',
            bg: 'green.500',
          }
        },
      },
    },
    Input: {
      variants: {
        outline: (props) => ({
          field: {
            bg: props.colorMode === 'dark' ? '#080808' : 'white',
            borderColor: props.colorMode === 'dark' ? 'gray.600' : 'gray.300',
            _hover: {
              borderColor: props.colorMode === 'dark' ? 'gray.500' : 'gray.400',
            },
            _focus: {
              borderColor: props.colorMode === 'dark' ? 'blue.500' : 'blue.500',
              boxShadow: `0 0 0 1px ${props.theme.colors.blue[500]}`,
            },
          },
        }),
      },
    },
    Select: {
      variants: {
        outline: (props) => ({
          field: {
            bg: props.colorMode === 'dark' ? '#080808' : 'white',
            borderColor: props.colorMode === 'dark' ? 'gray.600' : 'gray.300',
            _hover: {
              borderColor: props.colorMode === 'dark' ? 'gray.500' : 'gray.400',
            },
          },
        }),
      },
    },
    Textarea: {
      variants: {
        outline: (props) => ({
          bg: props.colorMode === 'dark' ? '#080808' : 'white',
          borderColor: props.colorMode === 'dark' ? 'gray.600' : 'gray.300',
          _hover: {
            borderColor: props.colorMode === 'dark' ? 'gray.500' : 'gray.400',
          },
          _focus: {
            borderColor: props.colorMode === 'dark' ? 'blue.500' : 'blue.500',
            boxShadow: `0 0 0 1px ${props.theme.colors.blue[500]}`,
          },
        }),
      },
    },
    Modal: {
      baseStyle: (props) => ({
        dialog: {
          bg: props.colorMode === 'dark' ? '#000000' : 'white', // Force black for modal dialog
          color: props.colorMode === 'dark' ? 'gray.100' : 'gray.800',
        },
        header: {
          borderBottom: '1px solid',
          borderColor: props.colorMode === 'dark' ? 'gray.700' : 'gray.200',
        },
        footer: {
          borderTop: '1px solid',
          borderColor: props.colorMode === 'dark' ? 'gray.700' : 'gray.200',
        },
      }),
    },
    Card: {
      baseStyle: (props) => ({
        container: {
          bg: props.colorMode === 'dark' ? '#050505' : 'white', // Slightly off-black for cards
          border: '1px solid',
          borderColor: props.colorMode === 'dark' ? 'gray.700' : 'gray.200',
        },
      }),
      variants: {
        elevated: (props) => ({
          container: {
            boxShadow: props.colorMode === 'dark' ? '0 1px 3px 0 rgba(255, 255, 255, 0.1), 0 1px 2px 0 rgba(255, 255, 255, 0.06)' : 'md',
          }
        }),
        outline: (props) => ({
          container: {
            borderColor: props.colorMode === 'dark' ? 'gray.600' : 'gray.300'
          }
        }),
        filled: (props) => ({
          container: {
            bg: props.colorMode === 'dark' ? 'gray.800' : 'gray.100'
          }
        }),
      }
    },
    Menu: {
      baseStyle: (props) => ({
        list: {
          bg: props.colorMode === 'dark' ? '#000000' : 'white', // Black background for menu list
          border: '1px solid',
          borderColor: props.colorMode === 'dark' ? 'gray.700' : 'gray.200',
        },
        item: {
          bg: props.colorMode === 'dark' ? '#000000' : 'white',
          color: props.colorMode === 'dark' ? 'gray.100' : 'gray.800',
          _hover: {
            bg: props.colorMode === 'dark' ? 'gray.800' : 'gray.100',
          },
          _focus: {
            bg: props.colorMode === 'dark' ? 'gray.800' : 'gray.100',
          },
        },
      }),
    },
    Table: {
      variants: {
        simple: (props) => ({
          th: {
            color: props.colorMode === 'dark' ? 'gray.300' : 'gray.600',
            borderColor: props.colorMode === 'dark' ? 'gray.700' : 'gray.200',
            bg: props.colorMode === 'dark' ? '#030303' : 'gray.50', // Very dark/light header
          },
          td: {
            borderColor: props.colorMode === 'dark' ? 'gray.800' : 'gray.200',
          },
          tbody: {
            tr: {
              _hover: {
                bg: props.colorMode === 'dark' ? 'gray.800' : 'gray.100',
              },
            },
          },
        }),
        striped: (props) => ({
          th: {
            color: props.colorMode === 'dark' ? 'gray.300' : 'gray.600',
            borderColor: props.colorMode === 'dark' ? 'gray.700' : 'gray.200',
            bg: props.colorMode === 'dark' ? '#030303' : 'gray.50',
          },
          td: {
            borderColor: props.colorMode === 'dark' ? 'gray.800' : 'gray.200',
          },
          tbody: {
            tr: {
              '&:nth-of-type(odd)': {
                bg: props.colorMode === 'dark' ? 'gray.900' : 'gray.50',
              },
              _hover: {
                bg: props.colorMode === 'dark' ? 'gray.800' : 'gray.100',
              },
            },
          },
        }),
      },
    },
    Tabs: {
      baseStyle: (props) => ({
        tablist: {
          borderBottomColor: props.colorMode === 'dark' ? 'gray.700' : 'gray.200',
        },
        tab: {
          color: props.colorMode === 'dark' ? 'gray.400' : 'gray.500',
          _selected: {
            color: props.colorMode === 'dark' ? 'blue.300' : 'blue.600',
            borderColor: props.colorMode === 'dark' ? 'blue.300' : 'blue.600',
          },
          _hover: {
            bg: props.colorMode === 'dark' ? 'gray.800' : 'gray.100',
          },
        },
        tabpanel: {
          bg: props.colorMode === 'dark' ? '#000000' : 'white',
        },
      }),
    },
    // You can continue to add more component overrides here if needed
    // For example: Alert, Badge, Checkbox, Radio, Switch, etc.
    Alert: {
      baseStyle: (props) => ({
        container: {
          // Ensure alert backgrounds are not pure black to stand out a bit
          bg: props.status === 'error' ? (props.colorMode === 'dark' ? 'red.900' : 'red.100') :
              props.status === 'success' ? (props.colorMode === 'dark' ? 'green.900' : 'green.100') :
              props.status === 'warning' ? (props.colorMode === 'dark' ? 'yellow.900' : 'yellow.100') :
              (props.colorMode === 'dark' ? 'blue.900' : 'blue.100'),
          color: props.status ? (props.colorMode === 'dark' ? 'white' : 'gray.800') : (props.colorMode === 'dark' ? 'blue.100' : 'blue.800')
        },
        icon: {
            color: props.status ? (props.colorMode === 'dark' ? 'white' : 'gray.800') : (props.colorMode === 'dark' ? 'blue.100' : 'blue.800')
        }
      }),
    },
    Badge: {
        baseStyle: {
            textTransform: 'none', // Keep badge text as is
            borderRadius: 'sm', // Slightly rounded badges
            borderWidth: '1px',
            borderStyle: 'solid',
        },
        variants: {
            // Default solid variant, ensure good contrast
            solid: (props) => ({
                bg: props.colorMode === 'dark' ? `${props.colorScheme}.700` : `${props.colorScheme}.100`,
                color: props.colorMode === 'dark' ? `${props.colorScheme}.100` : `${props.colorScheme}.700`,
                borderColor: props.colorMode === 'dark' ? `${props.colorScheme}.500` : `${props.colorScheme}.300`,
            }),
            // Outline variant, ensure good contrast
            outline: (props) => ({
                color: props.colorMode === 'dark' ? `${props.colorScheme}.300` : `${props.colorScheme}.600`,
                borderColor: props.colorMode === 'dark' ? `${props.colorScheme}.400` : `${props.colorScheme}.500`,
                bg: 'transparent',
            }),
            // Subtle variant (often used for tags)
            subtle: (props) => ({
                bg: props.colorMode === 'dark' ? `${props.colorScheme}.800` : `${props.colorScheme}.50`,
                color: props.colorMode === 'dark' ? `${props.colorScheme}.200` : `${props.colorScheme}.700`,
                borderColor: props.colorMode === 'dark' ? `${props.colorScheme}.700` : `${props.colorScheme}.200`,
            }),
        },
        // Default to subtle variant if no colorScheme is provided, with a generic gray
        defaultProps: {
            // variant: 'subtle', // This would make all badges subtle by default
            // colorScheme: 'gray', // Default color scheme if none applied to a badge
        },
    },
  },
  // Semantic tokens can be useful for more complex theming scenarios
  // but for a simple forced dark theme, direct overrides are often sufficient.
  // semanticTokens: {
  //   colors: {
  //     "chakra-body-text": { _dark: "gray.100" },
  //     "chakra-body-bg": { _dark: "#000000" },
  //     "chakra-border-color": { _dark: "gray.700" },
  //     "chakra-placeholder-color": { _dark: "gray.500" },
  //   },
  // },
});

export default theme; 