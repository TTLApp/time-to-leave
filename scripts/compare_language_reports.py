import argparse
import itertools
import json
from check_languages import Report
from collections import defaultdict

def load_report(file : str) -> Report:
    with open(file, 'r') as f:
        return Report.fromJSON(f.read())

class ComparisonReport:
    def __init__(self, output_file : str):
        self.fixed_missing_keys = defaultdict(dict)
        self.introduced_missing_keys = defaultdict(dict)
        self.fixed_extra_keys = defaultdict(dict)
        self.introduced_extra_keys = defaultdict(dict)
        self.fixed_missing_translations = defaultdict(dict)
        self.introduced_missing_translations = defaultdict(dict)
        self.output_file = output_file

    def flattenize_keys(keys : dict):
        # keys are stored as in the translation file, that is, with a scope as a key
        # and then the list of strings. To allow comparison, we flattenize the keys,
        # creating a set of strings like '$scope.string' for example
        out = [list(zip(keys, x)) for x in itertools.product(*keys.values())]
        out = [f'{x[0][0]}.{x[0][1]}' if x else None for x in out]
        return set(filter(lambda x: x, out))

    def process(baseline_info : dict, target_info : dict):
        fixed_report = {}
        introduced_report = {}
        for locale in set(baseline_info | target_info):
            baseline = ComparisonReport.flattenize_keys(baseline_info.get(locale, {}))
            target = ComparisonReport.flattenize_keys(target_info.get(locale, {}))
            fixed = baseline - target
            new = target - baseline
            if fixed:
                fixed_report[locale] = list(fixed)
            if new:
                introduced_report[locale] = list(new)
        return fixed_report, introduced_report

    def get_snippet_report(fixed : dict, introduced : dict):
        out_str = ''
        if fixed:
            out_str += f'👍 Fixed: \n```\n{json.dumps(fixed, indent=2)}\n```\n'
        if introduced:
            out_str += f'**⚠️ Introduced**: \n```\n{json.dumps(introduced, indent=2)}\n```\n'
        return out_str

    def report(self, baseline_report : Report, target_report : Report):
        self.fixed_missing_keys, self.introduced_missing_keys = ComparisonReport.process(
            baseline_report.errors_missing_keys, target_report.errors_missing_keys)
        self.fixed_extra_keys, self.introduced_extra_keys = ComparisonReport.process(
            baseline_report.errors_extra_keys, target_report.errors_extra_keys)
        self.fixed_missing_translations, self.introduced_missing_translations = ComparisonReport.process(
            baseline_report.missing_translations, target_report.missing_translations)

        out_str = '# Localization report\n'
        if self.fixed_missing_keys or self.introduced_missing_keys:
            out_str += '## Missing Keys:\n'
            out_str += 'Strings defined in English, but not on other language files.\n\n'
            out_str += ComparisonReport.get_snippet_report(self.fixed_missing_keys, self.introduced_missing_keys)
        if self.fixed_extra_keys or self.introduced_extra_keys:
            out_str += '## Extra keys:\n'
            out_str += 'Extra strings defined specific language files, but not on the English one.\n\n'
            out_str += ComparisonReport.get_snippet_report(self.fixed_extra_keys, self.introduced_extra_keys)
        if self.fixed_missing_translations or self.introduced_missing_translations:
            out_str += '## Missing translation:\n'
            out_str += 'Strings missing translation. Introduced strings are not a problem if a new string is being introduced in TTL.\n\n'
            out_str += ComparisonReport.get_snippet_report(self.fixed_missing_translations, self.introduced_missing_translations)
        if not self.fixed_missing_keys and not self.introduced_missing_keys \
           and not self.fixed_extra_keys and not self.introduced_extra_keys \
           and not self.fixed_missing_translations and not self.introduced_missing_translations:
            out_str += 'No differences found.\n'
        
        print(out_str)
        if self.output_file:
            with open(self.output_file, 'w', encoding="utf8") as f:
                f.write(out_str)
        
def get_arguments():
    parser = argparse.ArgumentParser()
    parser.add_argument("-output", help="Output markdown report file")
    parser.add_argument("-baseline", help="File path for the baseline report")
    parser.add_argument("-target", help="File path for the target report")
    return parser.parse_args()

def main():
    args = get_arguments()

    if not args.baseline or not args.target:
        raise Exception("Missing arguments")

    baseline_report = load_report(args.baseline)
    target_report = load_report(args.target)
    report = ComparisonReport(args.output)
    report.report(baseline_report, target_report)

if __name__ == "__main__":
    main()
