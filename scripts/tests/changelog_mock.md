## 1.25.6 (in development)

<!--- Begin changes - Do not remove -->

-   Enhancement: [#328] Swap position for overall and month balance on day view
-   Enhancement: [#333] Adding start date for overall balance on preferences
-   Enhancement: [#357] Adding flexible table format for month calendar with variable number of entries per day
-   Enhancement: [#369] Adding flexible table format for day calendar as well
-   Enhancement: [#383] Adding system default theme that auto-detect if dark or light mode is set
-   Enhancement: [#394] Adding option to control the behavior of the Minimize button
-   Enhancement: [#414] Right-align content of selection boxes from Preferences Window
-   Enhancement: [#442] Modernizing scrollbar styling
-   Fix: Fixed behavior of calendar when moving to next/previous month when current day is in the range of 29-31.
-   Fix: [#214] Check that lunch has beginning and end, if there is lunch
-   Fix: [#334] Improving performance of overall balance calculation and fixing balance target date after month change
-   Fix: [#362] Fixed initial size of preferences window
-   Fix: [#377] Fixed the layout which was broken when width < 768px
-   Fix: [#395] Fixing uncaught exception in main.js on day refresh

<!--- End changes - Do not remove -->

Who built 1.5.6:

<!--- Begin users - Do not remove -->

-   06b
-   akaash11
-   anatdagan
-   araujoarthur0
-   daretobedifferent18
-   greyGroot
-   ibamibrhm
-   kumaranshu72
-   michaelknowles
-   parikhdhruv24791
-   sajeevan16
-   skevprog
-   thamara

<!--- End users - Do not remove -->

## 1.5.5

Enhancement: [#11] Introducing an easy way of sourcing holidays based on user location
Enhancement: [#164] Overall Balance to replace Month Sum - Now you get an all time balance of your working hours. (Too much overtime huh?!)
Enhancement: [#299] Introducing new theme: Cadent Star

Who built 1.5.5:

thamara
tupaschoal
araujoarthur0

## 1.5.4

Fix: [#276] Fixed launch of app in debian

Who built 1.5.3:

thamara

## 1.5.3 - Skipped

## 1.5.2

Fix: [#27] Adding day balance on when to leave bar after day is done
Fix: [#209] Punch time button to only fill one entry (not the entire row)
Fix: [#210] Count today preference is respected
Fix: [#211] Adjusted preferences window size to fit the whole content
Fix: [#213] Count today preference fixed to work as expected.
Fix: [#215] Fixed exception: isNan is not defined
Fix: [#229] Count Today in totals no longer causes problem in the month balance
Fix: [#232] Total bar not updating on day change
Fix: [#233] Fixes crash when opening the waiver for a day
Fix: [#239] Punch button is disabled when current day is waived
Fix: [#240] Waiver using electron dialog instead of js confirm/alert
Fix: [#244] Waiver opens with filled date when clicking from calendar
Fix: [#249] Fix loading preferences
Fix: [#250] Silently ignoring waiver on non-working day or non-working day range
Fix: [#252] Prevent multiple preferences and workday waiver windows to be opened
Fix: [#255] Avoiding issue when closing preferences window without changing anything
Fix: [#258] Fixing crash when changing network while opening TTL
Enhancement: [#152] Adding a "Copy" option in the "About message", making it easier to copy information when opening an issue
Enhancement: [#228] Improved performance of TTL - Now moving through the calendar is much faster
Enhancement: [#241] Changing input format for notification interval and hours per day on preferences
Enhancement: [#245] DevTools shortcut (Ctrl+Shift+I) on Preferences and Waiver windows
Enhancement: [#247] Day View - new minimalist view that shows the calendar day by day