import argparse
import re
import os

RESOURCES_DIR = "resources"
OUTPUT_DIR = "."
DEFAULT_OUTPUT_FILE = r"release_v{V}.md"
DEFAULT_RELEASE_TEMPLATE = "release_template.md"


class ReleaseComposer:
    _version = ""
    _changes = []
    _users = []

    def __init__(
        self,
        output_file_name: str = DEFAULT_OUTPUT_FILE,
        template_file: str = DEFAULT_RELEASE_TEMPLATE,
    ):
        if not output_file_name:
            output_file_name = DEFAULT_OUTPUT_FILE
        script_path = os.path.dirname(os.path.realpath(__file__))
        self._template = os.path.join(script_path, RESOURCES_DIR, template_file)
        assert os.path.isfile(self._template)
        self._release = os.path.join(OUTPUT_DIR, output_file_name)

    def with_version(self, version: str):
        if not version:
            print("No version provided. Will use first version from changelog file")
        self._version = version
        return self

    def with_changes(self, changes: list):
        self._changes = self._stringfy_list(changes)
        return self

    def with_users(self, users: list):
        self._users = self._stringfy_list(users)
        return self

    def _stringfy_list(self, items: list) -> str:
        return "\n".join(items)

    def write(self):
        output_file = self._release.replace(r"{V}", self._version)
        with open(output_file, "w", encoding="utf-8") as output:
            with open(self._template, "r") as template:
                for line in template:
                    output.write(
                        line.replace(r"{APP_VERSION}", self._version)
                        .replace(r"{UPDATES}", self._changes)
                        .replace(r"{PEOPLE}", self._users)
                    )


class ChangeLogParser:
    _g_prefix_line = "-   "
    _g_begin_changes = "<!--- Begin changes - Do not remove -->"
    _g_end_changes = "<!--- End changes - Do not remove -->"
    _g_begin_users = "<!--- Begin users - Do not remove -->"
    _g_end_users = "<!--- End users - Do not remove -->"

    version = ""
    changes = []
    users = []

    def __init__(self, changelog_file: str, version: str = None):
        self._file_path = str(changelog_file)
        self.version = version

    def parse(self):
        with open(self._file_path, "r") as self._file:
            if not self.version:
                self._parse_version()
            self._parse_changes()
            self._parse_users()

    def _parse_version(self):
        version_regex = re.compile(r"#* *(\d+.\d+.\d+)")
        for line in self._file:
            if match := version_regex.match(line):
                self.version = match.group(1)
                return

    def _parse_changes(self):
        self.changes = self._get_list_between(
            self._g_begin_changes, self._g_end_changes
        )

    def _parse_users(self):
        self.users = self._get_list_between(self._g_begin_users, self._g_end_users)

    def _get_list_between(self, start_str: str, end_str: str):
        # retrieves a list of lines between a start and an end token
        in_items = False
        items = []
        for line in self._file:
            if start_str in line:
                in_items = True
            elif in_items and end_str in line:
                in_items = False
                break
            elif in_items and "-" in line[0]:
                items.append(line.strip())

        return items

    def __repr__(self):
        return (
            "VERSION:"
            + self.version
            + "\nCHANGES:"
            + "\n".join(self.changes)
            + "\nUSERS:".join(self.users)
        )


def get_arguments():
    parser = argparse.ArgumentParser(
        description="Parses a changelog file to produce a release file."
    )
    parser.add_argument("-changelog-file", help="Changelog file", required=True)
    parser.add_argument(
        "-output-file", help="The output file name. If omitted will be {OUTPUT_FILE}"
    )
    parser.add_argument(
        "-version",
        default=None,
        help="Version of current changelong. (Default is the top-most change version in changelog file)",
    )
    return parser.parse_args()


def main():
    args = get_arguments()

    if not os.path.isfile(args.changelog_file):
        print("Could not find file {parser.changelog_file}")
        return

    parser = ChangeLogParser(args.changelog_file, args.version)
    parser.parse()

    composer = ReleaseComposer(output_file_name=args.output_file)
    composer\
        .with_version(parser.version)\
        .with_changes(parser.changes)\
        .with_users(parser.users)\
        .write()


if __name__ == "__main__":
    main()