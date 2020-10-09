import re
import os


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

    def parse(self):
        self.parse_version()
        self.parse_changes()
        self.parse_users()

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
    with ChangeLogParser(file_path) as parser:
        parser.parse()


if __name__ == "__main__":
    main()