/// <reference types="vite/client" />

interface TurnstileApi {
  render: (el: HTMLElement, options: {
    sitekey: string;
    callback?: (token: string) => void;
    'expired-callback'?: () => void;
    'error-callback'?: () => void;
  }) => string;
}

interface Window {
  turnstile?: TurnstileApi;
}
