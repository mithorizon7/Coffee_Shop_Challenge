import { useTranslation } from 'react-i18next';
import { Globe } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { SUPPORTED_LANGUAGES } from '@/lib/i18n';

export function LanguageSwitcher() {
  const { i18n, t } = useTranslation();
  const currentLanguage = SUPPORTED_LANGUAGES.find(
    (lang) => lang.code === i18n.language
  ) || SUPPORTED_LANGUAGES[0];

  const handleLanguageChange = (langCode: string) => {
    i18n.changeLanguage(langCode);
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          aria-label={t('aria.languageSelector')}
          data-testid="button-language-switcher"
        >
          <Globe className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" data-testid="language-menu">
        {SUPPORTED_LANGUAGES.map((lang) => (
          <DropdownMenuItem
            key={lang.code}
            onClick={() => handleLanguageChange(lang.code)}
            className={lang.code === currentLanguage.code ? 'bg-accent' : ''}
            data-testid={`language-option-${lang.code}`}
          >
            <span className="font-medium">{lang.nativeName}</span>
            {lang.code !== 'en' && (
              <span className="ml-2 text-muted-foreground text-xs">
                ({lang.name})
              </span>
            )}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
