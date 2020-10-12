from unittest import TestCase
from update_release import ChangeLogParser
import os

expected_changes = [
    "-   Enhancement: [#328] Swap position for overall and month balance on day view",
    "-   Enhancement: [#333] Adding start date for overall balance on preferences",
    "-   Enhancement: [#357] Adding flexible table format for month calendar with variable number of entries per day",
    "-   Enhancement: [#369] Adding flexible table format for day calendar as well",
    "-   Enhancement: [#383] Adding system default theme that auto-detect if dark or light mode is set",
    "-   Enhancement: [#394] Adding option to control the behavior of the Minimize button",
    "-   Enhancement: [#414] Right-align content of selection boxes from Preferences Window",
    "-   Enhancement: [#442] Modernizing scrollbar styling",
    "-   Fix: Fixed behavior of calendar when moving to next/previous month when current day is in the range of 29-31.",
    "-   Fix: [#214] Check that lunch has beginning and end, if there is lunch",
    "-   Fix: [#334] Improving performance of overall balance calculation and fixing balance target date after month change",
    "-   Fix: [#362] Fixed initial size of preferences window",
    "-   Fix: [#377] Fixed the layout which was broken when width < 768px",
    "-   Fix: [#395] Fixing uncaught exception in main.js on day refresh",
]

expected_users = [
    "-   06b",
    "-   akaash11",
    "-   anatdagan",
    "-   araujoarthur0",
    "-   daretobedifferent18",
    "-   greyGroot",
    "-   ibamibrhm",
    "-   kumaranshu72",
    "-   michaelknowles",
    "-   parikhdhruv24791",
    "-   sajeevan16",
    "-   skevprog",
    "-   thamara",
]


class TestChangelogParser(TestCase):
    def setUp(self):
        self.changelog_file = os.path.join(
            os.path.dirname(os.path.realpath(__file__)), "changelog_mock.md"
        )

    def test_parsing_changelog(self):
        parser = ChangeLogParser(self.changelog_file)
        parser.parse()

        # Version
        self.assertEqual(parser.version, "1.25.6")

        # Changelog changes list
        self.assertEqual(len(parser.changes), len(expected_changes))
        for i, change in enumerate(parser.changes):
            self.assertEqual(change, expected_changes[i])

        # Changelog users
        self.assertEqual(len(parser.users), len(expected_users))
        for i, user in enumerate(parser.users):
            self.assertEqual(user, expected_users[i])

    def test_parging_providing_fix_version(self):
        parser = ChangeLogParser(self.changelog_file, "1.2.42")
        parser.parse()

        self.assertEqual(parser.version, "1.2.42")