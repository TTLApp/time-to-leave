import argparse
import json
import os

LOCALES_PATH = 'locales/'
BASELINE_LANGUAGE = 'en'
SCOPE_KEY_TO_IGNORE = {'$Menu' : ['ttl-github'],
                       '$FlexibleDayCalendar' : ['time-to-leave'],
                       '$FlexibleMonthCalendar' : ['time-to-leave'],
                       '$Calendar' : ['time-to-leave'],
                       '$WorkdayWaiver' : ['time-to-leave']}

LANG_SCOPE_KEY_TO_IGNORE = {'de-DE': {'$Preferences' : ['themes', 'hours-per-day'],
                                      '$Menu' : ['export', 'import', 'ok'],
                                      '$DateUtil' : ['april', 'august', 'september', 'november']},
                             'pl': {'$Preferences' : ['cadentStar', 'hours-per-day'],
                                    '$Menu' : ['menu']},
                             'mr': {'$Preferences' : ['hours-per-day']},
                             'it': {'$Preferences' : ['hours-per-day'],
                                    '$Menu' : ['menu', 'ok'],
                                    '$FlexibleDayCalendar' : ['no'],
                                    '$FlexibleMonthCalendar' : ['no'],
                                    '$WorkdayWaiver' : ['no']},
                             'zh-TW': {'$Preferences' : ['hours-per-day']},
                             'pt-BR': {'$Preferences' : ['hours-per-day'],
                                       '$Menu' : ['menu', 'ok'],
                                       '$FlexibleMonthCalendar' : ['total']},
                             'hi': {'$Preferences' : ['hours-per-day']},
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
                             'ko': {'$Preferences' : ['hours-per-day']}}

# Return all supported locales
def get_locales() -> list:
    languages = os.listdir(LOCALES_PATH)
    languages.remove(BASELINE_LANGUAGE)
    return languages

# Reurns the dict of translations for a language
def get_language(language : str) -> dict:
    with open('{}/{}/translation.json'.format(LOCALES_PATH, language)) as f:
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
    errors = dict()
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
    missing_keys = dict()
    for scope in scopes:
        baseline_keys = baseline_language[scope].keys()
        if scope in language:
            keys = language[scope].keys()
            missing_keys_in_scope = baseline_keys - keys
            if missing_keys_in_scope:
                missing_keys[scope] = missing_keys_in_scope
        else:
            missing_keys[scope] = {}
    return missing_keys

def get_arguments():
    parser = argparse.ArgumentParser()
    parser.add_argument("-locale", action='store', type=str, nargs='+', default=get_locales(), help="Locale to analyze")
    parser.add_argument("-output", help="Output markdown report file")
    return parser.parse_args()

# Returns a string for the error report
def get_report_from_error(total_strings_for_translation : int, errors : dict) -> str:
    result = ''
    for language in errors:
        missing_keys = errors[language]
        number_missing_keys = count_total_string(missing_keys)
        result += '## {} ({}/{} - {:.2f}% missing):\n'.format(language,
                                                 number_missing_keys,
                                                 total_strings_for_translation,
                                                 (100 * number_missing_keys)/total_strings_for_translation)
        try:
            result += '\n```\n{}\n```\n\n'.format(json.dumps(missing_keys, indent=2))
        except:
            result += '\n```\n{}\n```\n\n'.format(missing_keys)

    return result

# Report in stdout and on the output file (if passed) the errors found
def report(output : str, errors_missing_keys : dict, errors : dict):
    total_strings_for_translation = get_total_strings_for_translation(BASELINE_LANGUAGE)
    if errors_missing_keys:
        print('Missing Keys/Scopes:')
        print(errors_missing_keys)

    if errors:
        print('Missing Translations')
        print(json.dumps(errors, indent=2))

    if output:
        with open(output, 'w') as f:
            if errors_missing_keys:
                f.write('# Missing Keys/Scopes:\n')
                f.write(get_report_from_error(total_strings_for_translation, errors_missing_keys))
            if errors:
                f.write('# Missing Translations:\n')
                f.write(get_report_from_error(total_strings_for_translation, errors))

def main():
    args = get_arguments()
    locales = args.locale
    output = args.output

    baseline_language = get_language(BASELINE_LANGUAGE)

    errors_missing_keys = dict()
    for locale in locales:
        mising_keys = get_missing_keys(baseline_language, get_language(locale))
        if mising_keys:
            errors_missing_keys[locale] = mising_keys

    errors = dict()
    for locale in locales:
        language = get_language(locale)
        language_error = compare_language(locale, baseline_language, language)
        if language_error:
            errors[locale] = language_error

    report(output, errors_missing_keys, errors)

if __name__ == "__main__":
    main()