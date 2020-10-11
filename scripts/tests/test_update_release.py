from unittest import TestCase
from update_release import ChangeLogParser
import os

changes = [
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

users = [
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


class UnitBaseTest(TestCase):
    def setUp(self):
        self.changelog_file = os.path.join(os.path.dirname(os.path.realpath(__file__)), "changelog_mock.md")

    def test_parse_version(self):
        with ChangeLogParser(self.changelog_file) as parser:
            parser.parse_version()
            self.assertEqual(parser.version, "1.25.6")

    def test_parse_changes(self):
        with ChangeLogParser(self.changelog_file) as parser:
            parser.parse_changes()
            self.assertEqual(len(parser.changes), len(changes))
            for i in range(len(changes)):
                self.assertEqual(parser.changes[i], changes[i])

    def test_parse_users(self):
        with ChangeLogParser(self.changelog_file) as parser:
            parser.parse_users()
            self.assertEqual(len(parser.users), len(users))
            for i in range(len(users)):
                self.assertEqual(parser.users[i], users[i])