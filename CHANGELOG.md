# CHANGELOG
## [1.1.0] - 2025-11-14
### Comment-Body and Comment-Body-Path Truly 'Optional'
#### Changed
- Providing neither `comment-body` or `comment-body-path` will generate an empty comment opposed to erroring out

## [1.0.0] - 2025-10-31
### Full Public Release
#### Added
- `render-markdown` flag added (default is `true`) which controls whether the comment body should be rendered as markdown or not. Useful for files like terraform plans which might not want to be rendered as markdown
- Apache 2.0 license
#### Changed
- `on-resolution-hide` flag is now called `sync-conclusion`. Functionality is the same
- Runners changed from `colpal` internal to `ubuntu-latest`
- Restructured the test workflow to be more modular and done via manual triggers
#### Removed
- Requirement for `comment-body-path` to reference a Markdown `(.md)` file type

## [0.5.0] - 2025-10-07
### Don't Create Initial Comment if Success and On-Resolution-Hide is True
#### Added
- If `on-resolution-hide` was true and `conclusion` was `success`, then don't even post the comment
#### Fixed
- Corrected documentation to note that `verbose-logging` and `on-resolution-hide` accept booleans, and not string-wrapped booleans 

## [0.4.0] - 2025-10-02
### Removing status checks
#### Added
- Adding pagination support on finding comments
  - Resolves an issue where if there were more than 100 comments on a pull request, this action may have trouble finding a previous one to hide or update
#### Removed
- Status checks are removed due to issue where they would not be attached to the calling action. Resulted in actions failing that didn't actually fail because the commenting of another action was placed onto it.
- `conclusion` no longer supports `"neutral"` type
  - This was used with status checks, which are no longer supported. `"neutral"` is not an output of `steps` and therefore not an accepted `conclusion` input here

## [0.3.0] - 2025-09-26
### Update-Mode `none`, Conclusion `skipped` and `cancelled`
#### Added
- `update-mode` supports `"none"` type
  - This is intended for uses like one-time checklists to be commented on the top of pull requests
- `conclusion` supports `"skipped"` and `"cancelled"` types
  - This is intended for use cases that align with the common `conclusion` pattern: `conclusion: ${{ steps.previous-step.outcome }}`

## [0.2.0] - 2025-09-25
### On-Resolution-Hide Input
#### Added
- `on-resolution-hide` input added (default is `false` (off))
  - When enabled, will hide comments automatically once its conclusion is `success`

## [0.1.0] - 2025-09-02
### Initial Release
#### Added
- Create and update comments on a pull request
- Find previous comments to update on
- Create and update status checks
- Hide and unhide comments
- Supports comment contents being supplied directly or via a file.

<!--
Repeat format:
## [Release Version] - YYYY-MM-DD
### Change Summary
#### Type of change
- <Change 1>
- <Change 2>
-->

<!--
Types of changes
    Added - for new features.
    Changed - for changes in existing functionality.
    Deprecated - for soon-to-be removed features.
    Removed - for now removed features.
    Fixed - for any bug fixes.
    Security - in case of vulnerabilities.
https://keepachangelog.com/en/1.1.0/
-->