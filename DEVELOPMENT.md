# Development Guide

<a href="https://app.codesee.io/maps/public/798d8e40-19c3-11ec-b873-35f335ec68d2"><img src="https://codesee-docs.s3.amazonaws.com/badge.svg"></a>

We are so glad you are interested in building Time to Leave! In this file you'll find all the information to be able to build and change the source code, from setting up the environment, up to creating a package.

Working on your first Pull Request? You can learn how from this _free_ series [How to Contribute to an Open Source Project on GitHub](https://app.egghead.io/playlists/how-to-contribute-to-an-open-source-project-on-github)), or you can contact us on our [Discord server](https://discord.gg/P3KkEF5) and we will be excited to help you in this journey!

<!-- toc -->

-   [Development Guide](#development-guide)
    -   [Environment](#environment)
    -   [Setup](#setup)
        -   [Clone the repository](#clone-the-repository)
        -   [Install dependencies](#install-dependencies)
    -   [Running Time to Leave](#running-time-to-leave)
    -   [Linting & formatting](#linting--formatting)
        -   [Running and Fixing issues](#running-and-fixing-issues)
        -   [Specific lint checks](#specific-lint-checks)
    -   [Tests](#tests)
        -   [Run locally](#run-locally)
            -   [Running specific tests](#running-specific-tests)
    -   [Releasing](#releasing)
-   [Opening a Pull Request (PR)](#opening-a-pull-request-pr)

<!-- tocstop -->

## Environment

-   Install [Node.js](https://nodejs.org/en/): version 14.15 or higher
-   Install [git](https://git-scm.com/)

## Setup

If you intend on contributing to the project, you will need to [fork the main repository](https://guides.github.com/activities/forking/) first, and then clone it to your local machine.
If you just want to build it locally, you can clone directly from the main repository: `https://github.com/thamara/time-to-leave`

### Clone the repository

To clone your the repository:

```bash
git clone https://github.com/<YOUR USER>/time-to-leave.git
cd time-to-leave
```

### Install dependencies

```bash
npm install
```

## Running Time to Leave

To run Time to Leave, after the steps above:

```bash
npm start
```

## Linting & formatting

Time to Leave uses several linting and formatting tools in order to guarantee that code is homogeneous and consistent.

### Running and Fixing issues

Run the following before committing to guarantee the code you changed/added follows these rules:

```bash
npm run lint-fix
```

This will automatically fix the lint issues too.
If you want to just check the potential issues, without modifying the code, use

```bash
npm run lint
```

### Specific lint checks

Each type of file is related to a lint rule, and those can be run separately:

```bash
# css
npm run lint:css

# Node and Javascript
npm run lint:eslint
npm run lint:standard

# markdown
npm run lint:markdown
```

## Tests

Time to Leave has tests that will verify the correctness of the flow using [Jest](https://jestjs.io/). All tests are located in `__tests__` directory.
We have a workflow in the repository that will run all the tests when a Pull Request is submitted, and the change is only approved if the tests are passing.

### Run locally

To run all tests locally:

```bash
npm run test:jest
```

After running, you'll see a message like:

```bash
Test Suites: 12 passed, 12 total
Tests:       83 passed, 83 total
Snapshots:   0 total
Time:        31.007 s
Ran all test suites in 2 projects.
```

If you got any errors (failed tests), you need to scroll up and check the module and the test that has failed. The error will look something like:

```bash
 FAIL   RENDERER  __tests__/__renderer__/themes.js
  Theme Functions
    isValidTheme()
      ✓ should validate (2 ms)
      ✓ should not validate (1 ms)
    applyTheme()
      ✕ should apply (3 ms)
      ✓ should not apply
```

The error message will tell you more on why it failed, in terms of what was expected and what was got.

#### Running specific tests

You can run a specific test, when debugging, for example, by including the name of the test file in the command line. For example, to run only the `themes.js` tests, you can do:

```bash
npm run test:jest themes.js
```

More information on jest settings available for use can be seen [on jest's docs](https://jestjs.io/docs/en/cli#running-from-the-command-line).

Note: Although possible to run just a few tests, it's highly suggested that you run all tests when changing the code.

## Adding new dependencies

We are trying to keep exact versions in the package.json file so that every user that runs `npm install` gets similar results.
`npm install --save` adds packages by default with a `^` notation, that indicates freedom to install versions above the specified.
Thus, if you are adding a new dependency, you must use `npm install --save --save-exact` to add a specific version to the list of dependencies.

## Releasing

After building and testing, you may want to package the App, which is basically creating a single executable/installer that can be shared with others (without the necessity of installing other dependencies). This is not very common and you can skip this step during the development process (if you just want to contribute opening PRs).
If a release is what you want, you can use the following commands:

```bash
# macOS
npm run package:mac

# Windows
npm run package:win

# Debian
npm run package:deb
```

These will create the respective file under `release-builds/` directory.

# Opening a Pull Request (PR)

All PRs are very welcome, and we'll do our best to review them as fast as possible.
If you want to work on a specific issue, just shout out to us and we'll assign the issue to you.
Once you are done, just submit a PR with a relevant description of the change, and provide screenshots, if applicable.
Issues without activity for 7 days will be deemed stale and unassigned, unless justified.
Tip: Before pushing the PR, make sure the [tests](#Tests) are passing, and that no [lint](#Linting--formatting) issue is present. :)

# Feeling kind of lost?

Check out the [architecture diagram on CodeSee](https://app.codesee.io/maps/public/798d8e40-19c3-11ec-b873-35f335ec68d2).
