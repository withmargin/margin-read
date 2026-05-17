# Release Checklist

Margin releases are driven by version tags. A `vX.Y.Z` tag builds the extension
package, creates the GitHub Release, and runs the Chrome Web Store submission
job.

## Before Tagging

- Confirm the version is updated consistently:
  - root `package.json`
  - `apps/extension/package.json`
  - `apps/extension/public/manifest.json`
- Update `CHANGELOG.md`.
- Confirm the release notes describe user-visible changes, privacy changes, and
  known risks.
- Run the extension checks locally when possible:

```sh
pnpm --filter @margin/extension lint
pnpm --filter @margin/extension test
pnpm --filter @margin/extension build
pnpm --filter @margin/extension check:extension
```

- Confirm Chrome Web Store secrets and variables exist:
  - `CWS_SERVICE_ACCOUNT_JSON`
  - `CWS_ITEM_ID`
  - `CWS_PUBLISHER_ID`
- Run the manual Chrome Web Store status workflow if the store state is unclear.
- Confirm the `chrome-web-store` GitHub environment is configured with the
  intended approval rules.

## Tagging

Create and push a version tag:

```sh
git tag vX.Y.Z
git push origin vX.Y.Z
```

The tag triggers `.github/workflows/release.yml`.

## Automated Release Workflow

The release workflow:

- installs dependencies with pnpm
- checks that the release version matches the tag
- runs type checks, lint, tests, and extension validation
- packages the extension ZIP
- writes `SHA256SUMS`
- uploads the release artifact
- creates the GitHub Release
- checks the Chrome Web Store item status
- skips submission when the same version is already published or pending review
- uploads the package draft when needed
- submits the item for Chrome Web Store review

If the `chrome-web-store` environment has required reviewers, the store
submission job pauses until the environment is approved.

## After Tagging

- Check the GitHub Actions run.
- Confirm the GitHub Release has:
  - `margin-read-vX.Y.Z.zip`
  - `SHA256SUMS`
- Confirm the Chrome Web Store summary in the workflow output.
- Confirm the item is either submitted for review or skipped because that
  version is already published or pending review.
- If submitted, wait for Chrome Web Store review.
- After approval, verify the listed version from a clean Chrome profile.
- Update beta testers with the version number, highlights, and known limits.

## Manual Release Package Test

Use this when a tester needs a GitHub Release package before store approval:

1. Download `margin-read-vX.Y.Z.zip` from the GitHub Release.
2. Verify the checksum when desired:

```sh
shasum -a 256 margin-read-vX.Y.Z.zip
```

3. Unzip the package.
4. Load the extracted directory from `chrome://extensions` with Developer mode
   enabled.
5. Confirm the version shown by Chrome matches `X.Y.Z`.

## Hotfixes

- Use a patch version for a beta-breaking regression.
- Keep the changelog focused on the regression and fix.
- Tag the hotfix normally.
- Chrome Web Store review is still required for the new package.

## Rollback Notes

Chrome Web Store releases cannot be instantly rolled back from the repository.
For critical issues:

- disable or pause communication about the affected version
- prepare a hotfix release
- submit the hotfix for review
- document the issue in the GitHub Release notes when relevant

