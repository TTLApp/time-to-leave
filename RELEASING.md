Guide on how to release Time To Leave:

1 - Update all entries in `changelog.md` and on `package.json` to the release version (no -dev)
2 - `git commit -am "Release vX.Y.Z"`
3 - `git tag -a stable/vX.Y.Z`
4 - `git push origin main stable/vX.Y.Z`
5 - Bump `changelog.md` and on `package.json` to developer version (version + 1)-dev
6 - `git commit -am "Bump to version vX.Y.Z-dev"`
7 - `git push`
