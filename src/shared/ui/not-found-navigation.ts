export function canNavigateBackWithinApp(currentUrl: string, previousUrl?: string) {
  if (!previousUrl) return false;

  try {
    const current = new URL(currentUrl);
    const previous = new URL(previousUrl);

    return (
      (previous.protocol === "http:" || previous.protocol === "https:") &&
      previous.origin === current.origin &&
      previous.pathname !== current.pathname
    );
  } catch {
    return false;
  }
}