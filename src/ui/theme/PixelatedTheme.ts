export interface PixelatedTheme {
  colors: {
    primary: {
      gold: string;
      goldHover: string;
      goldActive: string;
    };
    background: {
      dark: string;
      darker: string;
      darkgray: string;
      lightgray: string;
    };
    accent: {
      green: string;
      water: string;
      road: string;
    };
    status: {
      success: string;
      error: string;
      warning: string;
      info: string;
    };
    text: {
      primary: string;
      secondary: string;
      muted: string;
    };
    border: {
      primary: string;
      secondary: string;
      accent: string;
    };
  };
  typography: {
    fonts: {
      primary: string;
      mono: string;
      pixel: string;
    };
    sizes: {
      xs: string;
      sm: string;
      base: string;
      lg: string;
      xl: string;
      '2xl': string;
      '3xl': string;
    };
    weights: {
      normal: number;
      bold: number;
    };
  };
  spacing: {
    xs: string;
    sm: string;
    md: string;
    lg: string;
    xl: string;
    '2xl': string;
    '3xl': string;
  };
  pixelated: {
    borderWidth: {
      thin: string;
      medium: string;
      thick: string;
    };
    cornerSize: {
      small: string;
      medium: string;
      large: string;
    };
    animations: {
      fast: string;
      medium: string;
      slow: string;
    };
  };
}

export const pixelatedTheme: PixelatedTheme = {
  colors: {
    primary: {
      gold: '#F1CD36',
      goldHover: '#E6C02F',
      goldActive: '#D4B028',
    },
    background: {
      dark: '#0F0F0F',
      darker: '#000000',
      darkgray: '#1A1A1A',
      lightgray: '#363636',
    },
    accent: {
      green: '#4CA64C',
      water: '#4C7EC9',
      road: '#5E5E5E',
    },
    status: {
      success: '#4CA64C',
      error: '#E53E3E',
      warning: '#F1CD36',
      info: '#4C7EC9',
    },
    text: {
      primary: '#F5EEDC',
      secondary: '#FFFFFF',
      muted: '#A0A0A0',
    },
    border: {
      primary: '#F1CD36',
      secondary: '#FFFFFF',
      accent: '#4C7EC9',
    },
  },
  typography: {
    fonts: {
      primary: "'VCR OSD Mono', monospace",
      mono: "'VCR OSD Mono', monospace",
      pixel: "'Press Start 2P', monospace",
    },
    sizes: {
      xs: '0.75rem',
      sm: '0.875rem',
      base: '1rem',
      lg: '1.125rem',
      xl: '1.25rem',
      '2xl': '1.5rem',
      '3xl': '1.875rem',
    },
    weights: {
      normal: 400,
      bold: 700,
    },
  },
  spacing: {
    xs: '0.25rem',
    sm: '0.5rem',
    md: '1rem',
    lg: '1.5rem',
    xl: '2rem',
    '2xl': '3rem',
    '3xl': '4rem',
  },
  pixelated: {
    borderWidth: {
      thin: '2px',
      medium: '4px',
      thick: '6px',
    },
    cornerSize: {
      small: '4px',
      medium: '6px',
      large: '8px',
    },
    animations: {
      fast: '0.15s',
      medium: '0.3s',
      slow: '0.5s',
    },
  },
};

export type PixelatedColor = keyof typeof pixelatedTheme.colors;
export type PixelatedSpacing = keyof typeof pixelatedTheme.spacing;
export type PixelatedFontSize = keyof typeof pixelatedTheme.typography.sizes;