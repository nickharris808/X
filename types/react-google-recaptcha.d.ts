declare module 'react-google-recaptcha' {
  import React from 'react';

  interface ReCAPTCHAProps {
    sitekey: string;
    onChange?: (token: string | null) => void;
    onExpired?: () => void;
    onErrored?: () => void;
    theme?: 'light' | 'dark';
    size?: 'normal' | 'compact' | 'invisible';
    tabindex?: number;
    onLoad?: () => void;
    ref?: React.RefObject<any>;
  }

  const ReCAPTCHA: React.FC<ReCAPTCHAProps>;
  export default ReCAPTCHA;
} 