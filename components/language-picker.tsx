"use client";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useI18n } from "@/lib/i18n-context";
import { LANGUAGE_NAMES } from "@/lib/i18n";
import type { Language } from "@/lib/types";
import { Check, ChevronDown, Languages } from "lucide-react";

const LANGUAGE_OPTIONS: Language[] = ["bg", "en", "de"];

export function LanguagePicker() {
  const { language, setLanguage, translate } = useI18n();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className="gap-2 text-sm"
          aria-label={translate("language.change")}
        >
          <Languages className="h-4 w-4" />
          <span className="hidden sm:inline">{LANGUAGE_NAMES[language]}</span>
          <span className="sm:hidden">{language.toUpperCase()}</span>
          <ChevronDown className="h-3 w-3 opacity-50" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-48">
        {LANGUAGE_OPTIONS.map((option) => (
          <DropdownMenuItem
            key={option}
            onClick={() => setLanguage(option)}
            className="cursor-pointer gap-2"
          >
            <span>{LANGUAGE_NAMES[option]}</span>
            {option === language ? <Check className="ml-auto h-4 w-4 text-primary" /> : null}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
