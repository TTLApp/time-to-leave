Guide on how to release Time to Leave:

First, make sure the `changelog.md` displays the correct new version (`## X.Y.Z (in development)`).

1. Update `package.json` to the release version (no -dev)
2. `git commit -am "Release vX.Y.Z"`
3. `git tag -a stable/vX.Y.Z`
4. `git push origin main stable/vX.Y.Z`

This will trigger the release action which creates a draft for the release notes.

If something goes wrong:

1. Delete tag locally: `git tag --delete stable/v3.0.0`
2. Delete tag on remote: `git push --delete origin stable/v3.0.0`

Try again :)

After publushing the release:

1. Bump `changelog.md` to developer version (version + 1)-dev. Use the following template:

```md
## X.Y.Z (in development)

<!--- Begin changes - Do not remove -->

<!--- End changes - Do not remove -->

Who built X.Y.Z:

<!--- Begin users - Do not remove -->

<!--- End users - Do not remove -->
```

2. Bump `package.json` to developer version (version + 1)-dev
3. Bump the links in website/src/index.html (search for the old version tag)
4. `git commit -am "Bump to version vX.Y.Z-dev"`
5. `git push`
6. Create PR in HomeBrew cask updating version. See [example](https://github.com/Homebrew/homebrew-cask/pull/105569/files).
