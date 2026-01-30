import i18n from "./i18n";

export function getLocale(): string {
  return i18n.language || "en";
}

export function formatNumber(value: number, options?: Intl.NumberFormatOptions): string {
  const locale = getLocale();
  return new Intl.NumberFormat(locale, options).format(value);
}

export function formatPercent(value: number, decimals: number = 0): string {
  const locale = getLocale();
  return new Intl.NumberFormat(locale, {
    style: "percent",
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(value);
}

export function formatDate(
  date: Date | string | number,
  options?: Intl.DateTimeFormatOptions
): string {
  const locale = getLocale();
  const dateObj = typeof date === "string" || typeof date === "number" ? new Date(date) : date;
  return new Intl.DateTimeFormat(locale, options).format(dateObj);
}

export function formatRelativeTime(date: Date | string | number): string {
  const locale = getLocale();
  const dateObj = typeof date === "string" || typeof date === "number" ? new Date(date) : date;
  const now = new Date();
  const diffInSeconds = Math.floor((now.getTime() - dateObj.getTime()) / 1000);

  const rtf = new Intl.RelativeTimeFormat(locale, { numeric: "auto" });

  if (diffInSeconds < 60) {
    return rtf.format(-diffInSeconds, "second");
  } else if (diffInSeconds < 3600) {
    return rtf.format(-Math.floor(diffInSeconds / 60), "minute");
  } else if (diffInSeconds < 86400) {
    return rtf.format(-Math.floor(diffInSeconds / 3600), "hour");
  } else if (diffInSeconds < 2592000) {
    return rtf.format(-Math.floor(diffInSeconds / 86400), "day");
  } else if (diffInSeconds < 31536000) {
    return rtf.format(-Math.floor(diffInSeconds / 2592000), "month");
  } else {
    return rtf.format(-Math.floor(diffInSeconds / 31536000), "year");
  }
}

export function formatDuration(seconds: number): string {
  const locale = getLocale();
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;

  if (minutes === 0) {
    try {
      const rtf = new Intl.RelativeTimeFormat(locale, { numeric: "always", style: "narrow" });
      const parts = rtf.formatToParts(-remainingSeconds, "second");
      const valuePart = parts.find((p) => p.type === "integer");
      const unitPart = parts.find((p) => p.type === "literal" && p.value.trim());
      if (valuePart && unitPart) {
        return `${valuePart.value}${unitPart.value.trim().charAt(0)}`;
      }
    } catch {
      // fallback
    }
    return new Intl.NumberFormat(locale).format(remainingSeconds) + "s";
  }

  return `${new Intl.NumberFormat(locale).format(minutes)}:${remainingSeconds.toString().padStart(2, "0")}`;
}

export function formatDurationLong(seconds: number): string {
  const locale = getLocale();
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;

  const parts: string[] = [];

  if (minutes > 0) {
    try {
      const nf = new Intl.NumberFormat(locale, {
        style: "unit",
        unit: "minute",
        unitDisplay: "long",
      });
      parts.push(nf.format(minutes));
    } catch {
      parts.push(`${minutes} min`);
    }
  }

  if (remainingSeconds > 0 || minutes === 0) {
    try {
      const nf = new Intl.NumberFormat(locale, {
        style: "unit",
        unit: "second",
        unitDisplay: "long",
      });
      parts.push(nf.format(remainingSeconds));
    } catch {
      parts.push(`${remainingSeconds} sec`);
    }
  }

  return parts.join(" ");
}

export function formatCurrency(value: number, currency: string = "USD"): string {
  const locale = getLocale();
  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency,
  }).format(value);
}

export function formatDateShort(date: Date | string | number): string {
  return formatDate(date, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

export function formatDateTime(date: Date | string | number): string {
  return formatDate(date, {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function formatTime(date: Date | string | number): string {
  return formatDate(date, {
    hour: "2-digit",
    minute: "2-digit",
  });
}
