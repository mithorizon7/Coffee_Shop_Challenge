import i18n from "@/lib/i18n";

export function isUnauthorizedError(error: Error): boolean {
  return /^401: .*Unauthorized/.test(error.message);
}

// Redirect to login with a toast notification
export function redirectToLogin(
  toast?: (options: { title: string; description: string; variant: string }) => void
) {
  if (toast) {
    toast({
      title: i18n.t("errors.unauthorizedTitle"),
      description: i18n.t("errors.unauthorizedBody"),
      variant: "destructive",
    });
  }
  setTimeout(() => {
    window.location.href = "/api/login";
  }, 500);
}
