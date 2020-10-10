import re
import os

RESOURCES_DIR = "resources"
OUTPUT_DIR = "."
RELEASE_DEFAULT_TEMPLATE = "release_template.md"


class ReleaseComposer:
    _version = ""
    _changes = []
    _users = []

    def __init__(self, template_file=RELEASE_DEFAULT_TEMPLATE):
        self._template = os.path.join("scripts", RESOURCES_DIR, template_file)
        self._release = os.path.join(OUTPUT_DIR, r"release_v{V}.md")

    def with_version(self, version):
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

    def __init__(self, changelog_file: str):
        self.file_path = str(changelog_file)

    def __enter__(self):
        self.file = open(self.file_path, "r")
        return self

    def __exit__(self, exc_type, exc_value, traceback):
        self.file.close()

    def get_list_between(self, start_str: str, end_str: str):
        in_items = False
        items = []
        for line in self.file:
            if start_str in line:
                in_items = True
            elif in_items and end_str in line:
                in_items = False
                break
            elif in_items and "-" in line[0]:
                items.append(line.replace("\n", ""))

        return items

    def parse(self):
        self.parse_version()
        self.parse_changes()
        self.parse_users()

    def parse_changes(self):
        self.changes = self.get_list_between(self._g_begin_changes, self._g_end_changes)

    def parse_users(self):
        self.users = self.get_list_between(self._g_begin_users, self._g_end_users)

    def parse_version(self):
        version_regex = re.compile(r"#* *(\d+.\d+.\d+)")
        for line in self.file:
            if match := version_regex.match(line):
                self.version = match.group(1)
                return

    def __repr__(self):
        return (
            "VERSION:"
            + self.version
            + "\nCHANGES:"
            + "\n".join(self.changes)
            + "\nUSERS:".join(self.users)
        )


def main():
    file_path = os.path.join(os.path.curdir, "scripts", "tests", "changelog_mock.md")
    with ChangeLogParser(file_path) as p:
        p.parse()

    composer = ReleaseComposer()
    composer.with_version(p.version).with_changes(p.changes).with_users(p.users).write()


if __name__ == "__main__":
    main()