import cx from 'clsx-tw';
import * as React from 'react';
import { FormProvider, useForm } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { Select } from 'ui/form';
import { changeLanguage, languages, type SupportedLanguage, supportedLanguages } from '#webapp/i18n.ts';

type LanguageSelectProps = {
  className?: string;
};

export const LanguageSelect = ({ className }: LanguageSelectProps) => {
  const { i18n } = useTranslation();
  const [isChanging, setIsChanging] = React.useState(false);
  const currentLanguage = (i18n.resolvedLanguage ?? i18n.language) as SupportedLanguage;
  const selectedLanguage = supportedLanguages.includes(currentLanguage) ? currentLanguage : 'en';
  const form = useForm({ defaultValues: { language: selectedLanguage } });

  const handleChange = async (language: SupportedLanguage) => {
    if (!language) return;
    setIsChanging(true);

    try {
      await changeLanguage(language);
    } catch (error) {
      console.error('Could not change application language.', error);
    } finally {
      setIsChanging(false);
    }
  };

  return (
    <FormProvider {...form}>
      <Select
        className={cx('fixed bottom-5 left-5 z-10 w-36', className)}
        disabled={isChanging}
        name="language"
        onChange={(event) => {
          void handleChange(event.target.value as SupportedLanguage);
        }}
      >
        {supportedLanguages.map((language) => (
          <option key={language} value={language}>
            {languages[language].flag} {languages[language].name}
          </option>
        ))}
      </Select>
    </FormProvider>
  );
};
