import { extendTheme } from '@chakra-ui/react';

// SideBuilds custom theme using CSS variables from index.css
const theme = extendTheme({
  config: {
    initialColorMode: 'dark',
    useSystemColorMode: false,
  },
  colors: {
    brand: {
      50: '#e6f0ff', // Consider deriving from --primary-color if needed
      100: '#b3d1ff',
      200: '#80b3ff',
      300: '#4d94ff',
      400: '#1a75ff',
      500: 'var(--primary-color)', // Using CSS variable for primary brand color
      600: '#005abf',
      700: '#00438c',
      800: '#002d59',
      900: '#001626',
    },
    // It's often better to let Chakra handle its gray scale unless specific overrides are needed.
    // If --bg-color is pure black, many gray shades might not be distinct.
    // Forcing gray.800 and gray.900 to black might be too aggressive if other grays are used for text/borders.
    // We will rely on var(--bg-color) for backgrounds primarily.
  },
  fonts: {
    heading: 'var(--base-font)', // Using CSS variable
    body: 'var(--base-font)',    // Using CSS variable
  },
  styles: {
    global: props => ({
      body: {
        bg: 'var(--bg-color)',
        color: 'var(--text-color)',
        fontFamily: 'var(--base-font)', // Ensure base font is applied via Chakra too
      },
      // Removing direct .chakra-container, .chakra-modal__content, .chakra-card overrides here
      // as they will be handled by component styles or inherit from body/var(--bg-color).
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
          bg: 'brand.500', // This will use var(--primary-color)
          color: 'var(--text-color)', // Explicitly white text for solid buttons
          _hover: {
            bg: 'brand.400', // A lighter shade of primary for hover
          },
        },
        outline: {
          borderColor: 'brand.500', // var(--primary-color)
          color: 'brand.500',       // var(--primary-color)
          _hover: {
            bg: 'var(--hover-bg)', // Use subtle hover from index.css
            color: 'var(--text-color)',
          },
        },
        ghost: {
          color: 'var(--secondary-text)', // Use CSS var for secondary text color
          bg: 'transparent', // Ensure ghost buttons are truly transparent initially
          _hover: {
            bg: 'var(--hover-bg)', // Use subtle hover from index.css
            color: 'var(--text-color)', // Text becomes primary on hover for visibility
          },
        },
      },
    },
    Card: { // For Chakra UI Card component
      baseStyle: {
        container: {
          bg: 'var(--card-bg)', // Use CSS variable, could be slightly off-black if desired
          color: 'var(--text-color)',
          borderRadius: 'var(--card-radius)',
          borderWidth: '1px',
          borderColor: 'var(--border-color)',
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
          bg: 'var(--card-bg)', // Modals can use card background or pure bg-color
          color: 'var(--text-color)',
          borderRadius: 'var(--card-radius)',
        },
        header: {
          // bg: 'transparent', // Keep header transparent to dialog bg
          // color: 'var(--text-color)',
          borderBottomWidth: '1px',
          borderColor: 'var(--border-color)',
        },
        body: {
          // bg: 'transparent',
          // color: 'var(--text-color)',
        },
        footer: {
          // bg: 'transparent',
          borderTopWidth: '1px',
          borderColor: 'var(--border-color)',
        },
      },
    },
    Menu: {
      baseStyle: {
        list: {
          bg: 'var(--card-bg)', // Dropdown menus background
          borderColor: 'var(--border-color)',
          borderWidth: '1px',
          color: 'var(--text-color)',
        },
        item: {
          bg: 'transparent', // Items transparent to list background
          color: 'var(--text-color)',
          _hover: {
            bg: 'var(--hover-bg)',
          },
          _focus: { // Ensure focus is visible
            bg: 'var(--hover-bg)',
          }
        },
      },
    },
    Link: {
      baseStyle: {
        color: 'brand.500', // var(--primary-color)
        _hover: {
          textDecoration: 'none',
          color: 'brand.400', // Lighter primary shade
        },
      },
    },
    Input: { // Adding base style for Input
      baseStyle: {
        field: {
          bg: 'var(--hover-bg)', // Slightly different from main bg for visibility
          borderColor: 'var(--border-color)',
          color: 'var(--text-color)',
          _hover: {
            borderColor: 'var(--primary-color)',
          },
          _focus: {
            borderColor: 'var(--primary-color)',
            boxShadow: `0 0 0 1px var(--primary-color)`,
          },
          _placeholder: { // Style placeholder text
            color: 'gray.500', // Chakra's gray, or a var(--secondary-text) if more subtle needed
          }
        },
      },
      variants: {
        outline: {
          field: {
            border: "1px solid",
            borderColor: "var(--border-color)",
            bg: "transparent", // Or var(--hover-bg) for slight differentiation
            _hover: {
              borderColor: "var(--primary-color)",
            }
          }
        },
        filled: {
          field: {
            border: "1px solid",
            borderColor: "var(--border-color)",
            bg: "var(--hover-bg)", 
            _hover: {
              bg: "rgba(255,255,255,0.08)", // Slightly lighter hover for filled
              borderColor: "var(--primary-color)",
            }
          }
        }
      }
    },
    Textarea: { // Mirroring Input styles for Textarea
        baseStyle: {
          bg: 'var(--hover-bg)',
          borderColor: 'var(--border-color)',
          color: 'var(--text-color)',
          _hover: {
            borderColor: 'var(--primary-color)',
          },
          _focus: {
            borderColor: 'var(--primary-color)',
            boxShadow: `0 0 0 1px var(--primary-color)`,
          },
          _placeholder: {
            color: 'gray.500',
          }
        },
    },
    Select: { // Mirroring Input styles for Select
        baseStyle: {
          field: {
            bg: 'var(--hover-bg)',
            borderColor: 'var(--border-color)',
            color: 'var(--text-color)',
            _hover: {
              borderColor: 'var(--primary-color)',
            },
          },
          icon: {
            color: 'var(--primary-color)', // Make dropdown icon more visible
          }
        },
    },
    Table: { // Basic styling for tables
      baseStyle: {
        table: {
          color: 'var(--text-color)',
        },
        th: {
          borderColor: 'var(--border-color)',
          color: 'var(--secondary-text)', // Table headers slightly less prominent
        },
        td: {
          borderColor: 'var(--border-color)',
        }
      }
    },
    Alert: { // Ensure alerts are readable
        baseStyle: {
            container: {
                // Chakra usually handles status colors well, but ensure background doesn't clash
                // If using solid status colors, ensure text contrast is good.
                // Example for 'error' status if needed:
                // bg: 'red.800', // Darker red for background
                // color: 'white',
            }
        }
    }
  },
});

export default theme; 