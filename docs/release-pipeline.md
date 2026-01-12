# Continuous Release Pipeline

## Workflow Overview
- .github/workflows/release.yml triggers on every push to main plus manual workflow_dispatch, guarded by the elease-main concurrency group so only one run executes at a time.
- alidate job reruns the entire extension quality stack (lint, metadata, build, unit, integration, packaging) and uploads logs plus the VSIX + six.sha256 artifacts.
- ersion_and_release downloads the artifacts, verifies the VSIX checksum, bumps package.json/package-lock.json/CHANGELOG.md, commits with [skip release] (preventing recursive runs), tags X.Y.Z, and publishes a GitHub Release using the release notes extracted from the changelog.

## Secrets & Permissions
- The workflow-level permissions block sets contents: write and id-token: write; alidate reduces its scope to contents: read.
- GITHUB_TOKEN **must** retain contents:write on main to push version bump commits and tags. If branch protection blocks the Actions bot, create a scoped PAT and store it as RELEASE_BOT_TOKEN, then replace usages in the workflow.
- VSCE_PAT is not yet consumed, but Security owns the secret. Store it as an org/repo secret named VSCE_PAT, rotate every 90 days, and scope usage to the eventual Marketplace publish step only.

## Guardrails
- All GitHub Actions are pinned to immutable SHAs.
- VSIX artifacts are hashed in alidate and verified before every release; checksum files are attached to GitHub Releases for independent validation.
- Release commits include [skip release] so the follow-up push does not re-trigger the workflow.

## Rollback
- Use scripts/rollback-release.sh vX.Y.Z to delete the GitHub Release and remote tag. The script assumes gh CLI authentication (GH_TOKEN or gh auth login).
- After running the script, revert the release commit on main (to restore changelog/package versions) and re-open any reverted changelog entries under ## [Unreleased].
- Document rollback actions in the incident ticket so the GO/NO-GO log stays auditable.

## Operational Checklist
1. Verify elease-assets artifact contains both the VSIX and six.sha256 after every run.
2. Ensure elease-notes.md matches the changelog section before approving the release.
3. Tabletop the rollback script quarterly (Release Eng + Security) to confirm tag deletion + changelog revert steps are still valid.
