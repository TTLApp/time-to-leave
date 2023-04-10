import argparse
import json
import os
import re
from math import floor
from pathlib import Path
from urllib.parse import urlencode, unquote, urlparse, parse_qsl, ParseResult

LOCALES_PATH = 'locales/'
BASELINE_LANGUAGE = 'en'
LANG_CONFIG_FILE = 'src/configs/app.config.js'
SCOPE_KEY_TO_IGNORE = {'$Menu' : ['ttl-github']}

LANG_SCOPE_KEY_TO_IGNORE = {'de-DE': {'$Preferences' : ['themes', 'hours-per-day'],
                                      '$Menu' : ['export', 'import', 'ok'],
                                      '$DateUtil' : ['april', 'august', 'september', 'november']},
                             'pl': {'$Preferences' : ['cadentStar', 'hours-per-day'],
                                    '$Menu' : ['menu']},
                             'mr': {'$Preferences' : ['hours-per-day']},
                             'it': {'$Preferences' : ['hours-per-day'],
                                    '$Menu' : ['menu', 'ok', 'report'],
                                    '$FlexibleDayCalendar' : ['no'],
                                    '$FlexibleMonthCalendar' : ['no'],
                                    '$WorkdayWaiver' : ['no']},
                             'zh-TW': {'$Preferences' : ['hours-per-day']},
                             'pt-BR': {'$Preferences' : ['hours-per-day'],
                                       '$Menu' : ['menu', 'ok'],
                                       '$FlexibleMonthCalendar' : ['total']},
                             'hi': {'$Preferences' : ['hours-per-day']},
                             'gu': {'$Preferences' : ['hours-per-day']},
                             'es': {'$Preferences' : ['flexible', 'hours-per-day'],
                                    '$Menu' : ['ok'],
                                    '$FlexibleMonthCalendar' : ['no', 'total'],
                                    '$FlexibleDayCalendar' : ['no'],
                                    '$WorkdayWaiver' : ['no']},
                             'nl': {'$Preferences' : ['hours-per-day'],
                                    '$Menu' : ['help', 'menu'],
                                    '$DateUtil' : ['april', 'september', 'november', 'december']},
                             'id': {'$Preferences' : ['cadentStar', 'hours-per-day'],
                                    '$Menu' : ['edit', 'help', 'menu', 'ok'],
                                    '$FlexibleMonthCalendar' : ['total'],
                                    '$DateUtil' : ['april', 'september', 'november']},
                             'fr-FR': {'$Preferences' : ['notification', 'flexible', 'hours-per-day'],
                                       '$Menu' : ['menu', 'ok'],
                                       '$FlexibleMonthCalendar' : ['total'],
                                       '$WorkdayWaiver' : ['date']},
                             'ko': {'$Preferences' : ['hours-per-day']},
                             'ca': {'$Preferences' : ['flexible', 'hours-per-day'],
                                       '$Menu' : ['menu', 'ok'],
                                       '$FlexibleDayCalendar' : ['no'],
                                       '$FlexibleMonthCalendar' : ['total', 'no'],
                                       '$WorkdayWaiver' : ['no']},
                             'ja': {'$Menu' : ['ok']},
                             'ta': {'$Preferences' : ['hours-per-day']},
                             'bn': {'$Preferences' : ['hours-per-day']},
                             'fa-IR': {'$Preferences' : ['hours-per-day']},
                             'he': {'$Preferences' : ['hours-per-day']},
                             'sv-SE': {'$Preferences' : ['hours-per-day'],
                                       '$DateUtil' : ['april', 'september', 'november', 'december'],
                                       '$FlexibleMonthCalendar' : ['total', 'no'],
                                       '$Menu' : ['ok']},
                             'pt-MI': {'$Preferences' : ['hours-per-day'],
                                     '$Menu' : ['menu', 'ok'],
                                     '$FlexibleMonthCalendar' : ['total']}}

def get_locales_information_from_config():
    # Parses the language configuration file to retrieve the locale code
    # and language name. As the file is JS, we are parsing it with regex.
    with open(LANG_CONFIG_FILE, encoding="utf8") as f:
        lines = f.readlines()
        locales_info = {}
        # We want only the lines that contain the locales
        regexp = re.compile(".*'([a-zA-Z-]+)': '(.*)'.*")
        for line in lines:
            match = regexp.match(line)
            if match:
                locales_info[match.group(1)] = match.group(2)
        return locales_info

def get_locale_name(locale):
    locales_map = get_locales_information_from_config()
    return f'{locales_map[locale]} ({locale})' if locale in locales_map else locale

# Source: https://stackoverflow.com/a/25580545/3821823
def add_url_params(url : str , params : dict) -> str:
    """ Add GET params to provided url being aware of existing params.
    :param url: string of target url
    :param params: dict containing requested params to be added
    :return: string with updated url
    >> url = 'http://stackoverflow.com/test?answers=true'
    >> new_params = {'answers': False, 'data': ['some','values']}
    >> add_url_params(url, new_params)
    'http://stackoverflow.com/test?data=some&data=values&answers=false'
    """
    # Unquoting url first so we don't loose existing args
    url = unquote(url)
    # Extracting url info
    parsed_url = urlparse(url)
    # Extracting url arguments from parsed url
    get_args = parsed_url.query
    # Converting url arguments to dict
    parsed_get_args = dict(parse_qsl(get_args))
    # Merging url arguments dict with new params
    parsed_get_args.update(params)

    # Bool and Dict values should be converted to json-friendly values
    parsed_get_args.update(
        {k: json.dumps(v) for k, v in parsed_get_args.items()
            if isinstance(v, (bool, dict))}
    )

    # Converting url argument to proper query string
    encoded_get_args = urlencode(parsed_get_args, doseq=True)
    # Creating new parsed result object based on provided with new
    # url arguments. Same thing happens inside of urlparse.
    new_url = ParseResult(
        parsed_url.scheme, parsed_url.netloc, parsed_url.path,
        parsed_url.params, encoded_get_args, parsed_url.fragment
    ).geturl()

    return new_url

# Return all supported locales
def get_locales() -> list:
    languages = os.listdir(LOCALES_PATH)
    languages.remove(BASELINE_LANGUAGE)
    return sorted(languages)

# Reurns the dict of translations for a language
def get_language(language : str) -> dict:
    with open('{}/{}/translation.json'.format(LOCALES_PATH, language), encoding="utf8") as f:
        return json.load(f)

# Count number of strings for translation from locale
def get_total_strings_for_translation(locale : str) -> int:
    baseline_language = get_language(locale)
    return count_total_string(baseline_language)

# Count number of strings for translation from language dict
def count_total_string(language : dict) -> int:
    total = 0
    for scope in language:
        total += len(language[scope])
    return total

# Returns the values that haven't changed between the baseline scope and the scope
# Ignore keys supplied in keys_to_ignore
def find_equal_values(keys_to_ignore : list, baseline_scope : dict, scope : dict) -> dict:
    translations_baseline = baseline_scope.items()
    translations = scope.items()
    different_items = translations_baseline - translations
    for item in different_items:
        if item[0] in scope:
            scope.pop(item[0])

    for key_to_ignore in keys_to_ignore:
        if key_to_ignore in scope:
            scope.pop(key_to_ignore)

    return scope

# Get which keys should be ignored based on the information waived on the top of this file
def get_keys_to_ignore(locale : str, scope : str) -> list:
    keys_to_ignore = []
    if scope in  SCOPE_KEY_TO_IGNORE:
        keys_to_ignore.extend(SCOPE_KEY_TO_IGNORE[scope])
    if locale in LANG_SCOPE_KEY_TO_IGNORE and scope in LANG_SCOPE_KEY_TO_IGNORE[locale]:
        keys_to_ignore.extend(LANG_SCOPE_KEY_TO_IGNORE[locale][scope])
    return keys_to_ignore

# Compare two languages, passing over all scopes, returning the erros for the language
def compare_language(locale : str, baseline_language : dict, language : dict) -> dict:
    scopes = [x for x in baseline_language]
    errors = {}
    for scope in scopes:
        if scope in language:
            keys_to_ignore = get_keys_to_ignore(locale, scope)
            equal_values = find_equal_values(keys_to_ignore, baseline_language[scope], language[scope])
            if equal_values:
                errors[scope] = equal_values

    return errors

# Check if there's any missing key or scope in language, returning the erros
def get_missing_keys(baseline_language : dict, language : dict) -> dict:
    scopes = [x for x in baseline_language]
    missing_keys = {}
    for scope in scopes:
        baseline_keys = baseline_language[scope].keys()
        if scope in language:
            keys = language[scope].keys()
            missing_keys_in_scope = baseline_keys - keys
            if missing_keys_in_scope:
                missing_keys[scope] = list(missing_keys_in_scope)
        else:
            missing_keys[scope] = []
    return missing_keys

def get_arguments():
    parser = argparse.ArgumentParser()
    parser.add_argument("-locale", action='store', type=str, nargs='+', default=get_locales(), help="Locale to analyze")
    parser.add_argument("-output", help="Output markdown report file")
    parser.add_argument("-report_summary", help="Include a summary of the translations", action='store_true')
    parser.add_argument("-report_key_mismatch", help="Include missing/extra keys", action='store_true')
    parser.add_argument("-report_missing_translations", help="Prints missing string translations", action='store_true')
    parser.add_argument("-link_to_missing", help="Includes a link to the missing translations", action='store_true')
    parser.add_argument("-raw_report", help="File path for the raw report")
    return parser.parse_args()

def percentage_not_translated(total_strings_for_translation : int, missing_keys : dict) -> float:
    number_missing_keys = count_total_string(missing_keys)
    return (100 * number_missing_keys)/total_strings_for_translation

def percentage_translated(total_strings_for_translation : int, missing_keys : dict) -> float:
    return 100 - percentage_not_translated(total_strings_for_translation, missing_keys)

# Returns a string for the error report
def get_report_from_error(total_strings_for_translation : int, errors : dict) -> str:
    result = ''
    for language in errors:
        missing_keys = errors[language]
        number_missing_keys = count_total_string(missing_keys)
        result += '## {}\n{}/{} - {:.2f}% missing:\n'.format(language,
                                                 number_missing_keys,
                                                 total_strings_for_translation,
                                                 percentage_not_translated(total_strings_for_translation, missing_keys))
        try:
            result += '\n```\n{}\n```\n\n'.format(json.dumps(missing_keys, indent=2))
        except:
            result += '\n```\n{}\n```\n\n'.format(missing_keys)

    return result

def get_count_total_string_with_link(locale : str, missing_translations : dict, link_to_missing : bool) -> str:
    if not missing_translations or not link_to_missing:
        return f'{count_total_string(missing_translations)}'
    missing_translations_count = count_total_string(missing_translations)
    locale = locale.lower()
    return f'{missing_translations_count} [(See missing)](#{locale})'

def get_progress_bar(total_strings_for_translation : int, missing_strings : dict) -> str:
    percentage = percentage_translated(total_strings_for_translation, missing_strings)
    return f'![Progress](https://progress-bar.dev/{floor(percentage)}/?width=200)'

def get_new_issue_url(locale : str, missing_translations : dict) -> str:
    language = get_locale_name(locale)
    if not missing_translations:
        return ''
    body = f'Add translations for locale {language}\nRelevant file: `locales\\{locale}\\translation.json`\n\n'
    body += 'Please only translate into languages you are fluent on. :)\n\n'
    try:
        body += '\n```\n{}\n```\n\n'.format(json.dumps(missing_translations, indent=2))
    except:
        body += '\n```\n{}\n```\n\n'.format(missing_translations)
    base_url = f'https://github.com/thamara/time-to-leave/issues/new?labels=localization,good+first+issue,Hacktoberfest'
    opts = { 'body': body , 'title': f'Add missing translations for {language}'}
    return f'[(Open issue)]({add_url_params(base_url, opts)})'

def get_summary_report(total_strings_for_translation : int, link_to_missing : bool, missing_translations : dict) -> str:
    output = '| Locale | Translation progress | Missing strings |\n'
    output += '|--------|----------------------|-----------------|\n'
    output += '\n'.join('| {} | {} | {} {} |'.format(k,
                        get_progress_bar(total_strings_for_translation, v),
                        get_count_total_string_with_link(k, v, link_to_missing),
                        get_new_issue_url(k, v)) for k, v in missing_translations.items())
    return output + '\n\n'

class Config:
    def __init__(self, report_summary: bool, link_to_missing: bool, report_key_mismatch: bool, report_missing_translations: bool, output: str):
        self.report_summary = report_summary
        self.link_to_missing = link_to_missing
        self.report_key_mismatch = report_key_mismatch
        self.report_missing_translations = report_missing_translations
        self.output = output

class Report:
    def __init__(self, config : Config, errors_missing_keys : dict, errors_extra_keys : dict, missing_translations : dict):
        self.config = config
        self.errors_missing_keys = errors_missing_keys
        self.errors_extra_keys = errors_extra_keys
        self.missing_translations = missing_translations
    
    def toJson(self):
        return json.dumps(self, default=lambda o: o.__dict__, sort_keys=True, indent=4)
    
    def fromJSON(json_data):
        dictionary = json.loads(json_data)
        return Report(**dictionary)

    # Report in stdout and on the output file (if passed) the errors found
    def generate(self):
        total_strings_for_translation = get_total_strings_for_translation(BASELINE_LANGUAGE)
        config = self.config
        
        if config.report_summary:
            # +1 for the baseline language (en)
            print(f'Summary - {len(self.missing_translations) + 1} languages supported ({total_strings_for_translation} strings)')
            print("\n".join("- {}: {:.2f}".format(k,
                percentage_translated(total_strings_for_translation, v)) 
                    for k, v in self.missing_translations.items()))

        if config.report_key_mismatch and self.errors_missing_keys:
            print('Missing Keys/Scopes:')
            print(self.errors_missing_keys)

        if config.report_key_mismatch and self.errors_extra_keys:
            print('Extra Keys/Scopes:')
            print(self.errors_extra_keys)

        languages_with_missing_keys = dict((k, v) for k, v in self.missing_translations.items() if v)
        if config.report_missing_translations and languages_with_missing_keys:
            print('Missing Translations')
            print(json.dumps(languages_with_missing_keys, indent=2))

        if config.output:
            with open(config.output, 'w') as f:
                if config.report_summary:
                    # +1 for the baseline language (en)
                    f.write(f'# Summary - {len(self.missing_translations) + 1} languages supported ({total_strings_for_translation} strings)\n')
                    f.write(get_summary_report(total_strings_for_translation, config.link_to_missing, self.missing_translations))
                if config.report_key_mismatch and self.errors_missing_keys:
                    f.write('# Missing Keys/Scopes:\n')
                    f.write(get_report_from_error(total_strings_for_translation, self.errors_missing_keys))
                if config.report_key_mismatch and self.errors_extra_keys:
                    f.write('# Extra Keys/Scopes:\n')
                    f.write(get_report_from_error(total_strings_for_translation, self.errors_extra_keys))
                if config.report_missing_translations and languages_with_missing_keys:
                    f.write('# Missing Translations:\n')
                    f.write(get_report_from_error(total_strings_for_translation, languages_with_missing_keys))

def main():
    args = get_arguments()
    locales = args.locale
    output = args.output

    baseline_language = get_language(BASELINE_LANGUAGE)

    errors_missing_keys = {}
    errors_extra_keys = {}

    for locale in locales:
        mising_keys = get_missing_keys(baseline_language, get_language(locale))
        extra_keys = get_missing_keys(get_language(locale), baseline_language)
        if mising_keys:
            errors_missing_keys[locale] = mising_keys
        if extra_keys:
            errors_extra_keys[locale] = extra_keys

    missing_translations = {}
    for locale in locales:
        language = get_language(locale)
        language_error = compare_language(locale, baseline_language, language)
        missing_translations[locale] = language_error

    config = Config(args.report_summary, args.link_to_missing, args.report_key_mismatch, args.report_missing_translations, output)
    report = Report(config, errors_missing_keys, errors_extra_keys, missing_translations)
    report.generate()
    
    if args.raw_report:
        Path(args.raw_report).write_text(report.toJson())

if __name__ == "__main__":
    main()
