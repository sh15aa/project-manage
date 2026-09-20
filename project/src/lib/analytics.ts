/**
 * Privacy-friendly lightweight analytics tracking helper
 */
export function trackEvent(eventName: string, props?: Record<string, any>) {
  // Respect Do Not Track
  if (typeof navigator !== 'undefined' && navigator.doNotTrack === '1') {
    return;
  }

  // If a provider like Plausible or Google Analytics is on window, dispatch
  if (typeof window !== 'undefined' && (window as any).plausible) {
    (window as any).plausible(eventName, { props });
  }

  if (process.env.NODE_ENV === 'development') {
    console.debug(`[Analytics] ${eventName}`, props);
  }
}
