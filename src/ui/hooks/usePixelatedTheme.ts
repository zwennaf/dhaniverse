import { pixelatedTheme, PixelatedTheme } from '../theme/PixelatedTheme';

export const usePixelatedTheme = (): PixelatedTheme => {
  return pixelatedTheme;
};

export const usePixelatedColors = () => {
  return pixelatedTheme.colors;
};

export const usePixelatedTypography = () => {
  return pixelatedTheme.typography;
};

export const usePixelatedSpacing = () => {
  return pixelatedTheme.spacing;
};

export const usePixelatedAnimations = () => {
  return {
    duration: {
      fast: '150ms',
      normal: '300ms',
      slow: '500ms',
    },
    easing: {
      linear: 'linear',
      easeIn: 'cubic-bezier(0.4, 0, 1, 1)',
      easeOut: 'cubic-bezier(0, 0, 0.2, 1)',
      easeInOut: 'cubic-bezier(0.4, 0, 0.2, 1)',
    },
  };
};