# Action PR Comment

## Changelog
### [2025-10-07] - 0.5.0
#### Don't Create Initial Comment if Success and On-Resolution-Hide is True
- If `on-resolution-hide` was true and `conclusion` was `success`, then don't even post the comment
- Corrected documentation to note that `verbose-logging` and `on-resolution-hide` accept booleans, and not string-wrapped booleans 

### [2025-10-02] - 0.4.0
#### Removing status checks
- Status checks are removed due to issue where they would not be attached to the calling action. Resulted in actions failing that didn't actually fail because the commenting of another action was placed onto it.
- Adding pagination support on finding comments
  - Resolves an issue where if there were more than 100 comments on a pull request, this action may have trouble finding a previous one to hide or update
- `conclusion` no longer supports `"neutral"` type
  - This was used with status checks, which are no longer supported. `"neutral"` is not an output of `steps` and therefore not an accepted `conclusion` input here

### [2025-09-26] - 0.3.0
#### Update-Mode `none`, Conclusion `skipped` and `cancelled`
- `update-mode` supports `"none"` type
  - This is intended for uses like one-time checklists to be commented on the top of pull requests
- `conclusion` supports `"skipped"` and `"cancelled"` types
  - This is intended for use cases that align with the common `conclusion` pattern: `conclusion: ${{ steps.previous-step.outcome }}`

### [2025-09-25] - 0.2.0
#### On-Resolution-Hide Input
- `on-resolution-hide` input added (default is `false` (off))
  - When enabled, will hide comments automatically once its conclusion is `success`

### [2025-09-02] - 0.1.0
#### Initial Release
- Create and update comments on a pull request
- Find previous comments to update on
- Create and update status checks
- Hide and unhide comments
- Supports comment contents being supplied directly or via a file.

<!--
Repeat format:
#### [YYYY-MM-DD] <Release Title>
- <Change 1>
- <Change 2>
-->