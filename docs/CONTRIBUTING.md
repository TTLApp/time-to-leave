Contributing to Time to Leave
=============================
1. Hey there! We are so happy you are interested in contributing to TTL. Thank you in advance for your help! :)

1. Documentation, design, ideas for improvement, new tests, bugs from a user's standpoint; Whether you are a coder or not, first find out if there is [already an issue](https://github.com/thamara/time-to-leave/issues), and if there is not, [create a new one](https://github.com/thamara/time-to-leave/issues/new) for the changes you wish to make. Make note of the issue number for your branch name later on. _When opening an issue, please provide a good description of the problem you are facing, or the feature you'd like to have._ There is a template to help you with this. If you want to work on a pre-existing issue, or the one you just created, just shout out to us and we'll assign the issue to you.

For bugs, it's good to provide some step-by-step instructions to reproduce the issue, as well as some screenshots, if applicable. It's also important to inform the operating system you are using and the version of TTL.

Github Collaborative Workflow
=============================
We make use of Github's [actions](https://github.com/thamara/time-to-leave/actions) heavily in order to automate much of the process of contributing, reviewing, and publishing Time to Leave. There are some protocols and things to keep in mind when you are making your contribution. Don't fret if it isn't perfect, we will help you.

1. Fork the [official repository](https://github.com/thamara/time-to-leave).

1. Clone _your fork_ locally. You will work mostly with your local repo and only push changes when ready or when testing with a [workflow]() before you make a [pull request]():

```git clone git@github.com:YOURNAME/time-to-leave```

1. Code! Commit early and commit often, make sure tests are succeeding. You will need to add the main repository to the list of your remotes:

```git remote add upstream git://github.com/thamara/time-to-leave```

1. If your tree isn't already clean, commit or stash any changes and switch to the master branch:

```git checkout master```

1. Then, you can pull in any changes made upstream to keep current. Do this before each coding session to stay in sync with what's happening upstream:

```git pull upstream master```

1. If you are ready to push your changes up to your own repository, first commit your changes, and make sure both linting and testing pass, and create a new branch; this is the part where you need the issue number for those changes. Prefix the branch name depending on if this is a new feature, or a fix.
      
```git checkout -b [feature|fix]-ISSUE_NUMBER```
   
1. If you have written new modules or functions, you must write tests for the new code as well (see [Coding Guidelines]()); please feel free to ask for help in the [Discord](https://discordapp.com/channels/673998893339639809/677468377534431232). Check that everything compiles cleanly and passes all tests; again, ask for help if you need to! The issue you opened earlier is a great place to start as well. When you want to try out your code, push to your repository:
   
```git push origin [feature|fix]-ISSUE_NUMBER```

1. Now that your commit has been pushed to your fork, open a pull request to the `staging` branch of Thamara's repository; you do this in the github web interface, when you push a new branch on the cli you will also get a link to do this. When you have opened the request, the tests will run and other checks as well. The maintainers will decide whether or when to pull those changes, and may suggest you make additional changes to satisfy needs.

Coding Guidelines
=================
Time to Leave is created on top of [Electron], and there are some things to keep in mind when coding because of that:

1. **Tests** are required for all new modules and functions. The best way to keep the bugs out is to make sure to test well! Done well, the tests will often be larger than the actual code itself. This is okay! The tests do not impact the size of the app. If you don't know how to write tests, take a look at some of the [ones we have so far], and experiment. There are a lot of different ways, and many guides to find elsewhere. If you need help, ask for help!

1. **Separate Your Code** Some parts of the application can be run in Main, but others need to be in the Render process. It's a good rule of thumb to attempt to use the Main for all that you can, and the Renderer when need be. In testing, you may simply place your tests in `__tests__/__main__/` or `__tests__/__renderer__/` respectively. If you do not know, then try the test from Main first, and move it to Renderer if it passes there.

1. **Stay Current**. We are coding to a target which updates and changes; make sure you keep to the same API that is already in use. Currently, this is `node ^10.0.0` and `electron ^7.0.0`.

1. **Documentation** required for all new modules and functions, as well as any significant changes in existing parts. Documentation should be written in line with the style of the comments already in the codebase, as well as in a markdown document within docs/ if needed, for the most part this will be in cases of new functionality, or breaking changes.

1. **Screen Shots** You wouldn't believe how helpful screenshots can be in conveying your changes for anything on the UX. Remember to update your issue with your progress, and get new input on your PR.

1. **Good Tools** The writer of this document prefers to use Git on a Bash commandline. This section of this document should be ammended by the maintainers of Time to Leave.

Have fun! And if in doubt, remember to _ask for help_! We will support you as much as we can.
