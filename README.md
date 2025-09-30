# actions-pr-comment
> Internal action for creating, updating, and hiding comments on pull requests

## Assumptions
1. A message body is ready to be used as a comment, either passed directly via `comment-body` or as a markdown file via `comment-body-path`

## Usage
```yaml
- uses: colpal/action-pr-comment@v0.4.0
  with:
    # Name of the check. To be used in the identifying comment and as the display name of GitHub for this action
    # Required
    comment-id: "my-check"

    # The contents of the text to be used as the message body
    # Optional - used instead of comment-body-path
    comment-body: "My comment here"

    # The path where the markdown (.md) file is stored which holds the text to be used as the message body
    # Optional - used instead of comment-body
    comment-body-path: "example/custom-path"
    
    # Result of the workflows that are providing the comments to be posted. Will be set to "success", "failure", "skipped", or "cancelled". Expected to be supplied by steps.<step_id>.outcome where the step_id is the step that needs commenting on (usually previous step).
    # Required
    conclusion: "${{ steps.<step_id>.outcome }}"

    # The GitHub token used for authentication
    # Optional
    # Default: "${{ github.token }}"
    github-token: "${{ github.token }}"

    # How to handle existing comments. Options: 'replace' (overwrite), 'append' (add to end), 'create' (always make a new comment), 'none' (does not create a new comment or update an existing one)
    # Required
    # Default: "create"
    update-mode: "create"

    # Determines whether to hide a previous failure comment when the conclusion changes to 'success' and update-mode is 'replace' or 'append'
    # Optional
    # Default: false
    on-resolution-hide: false

    # Verbose logging flag for more detailed information
    # Optional
    # Default: false
    verbose-logging: false
```

## Permissions
For this composite action to do its job to the fulliest, it will require some permissions. In the workflow file that is calling this action, there should be a permission block. This is for the permissions the `secrets.GITHUB_TOKEN` has. That requires the following permissions:
```yaml
permissions:
  pull-requests: write
```
- `pull-requests: write` -> this is to create and update comments on a pull-request
  - `write` permissions come with `read` permissions which is required to find all comments on a pull-request in order to find previous comments to update.

## Outputs
A comment will be placed (or updated) in the pull request. The comment will be the supplied `comment-body` (or contents of `comment-body-path`) as well as a hidden identifier that is placed at the beginning of the body via `comment-id`.

From the conclusion input, a hidden identifier is also placed int he beginning of the comment. This is to aid with the hiding of comments via the [`on-resolution-hide`](#on-resolution-hide) input.

## Conclusion
The `conclusion` input is utilized as a hidden identifier to maintain the status of the current run. This works alongside [`on-resolution-hide`](#on-resolution-hide) to ensure that, when desired, `succcess` messages are hidden. Without `conclusion`, there wouldn't be a mechanism to know when to hide certain message or not. The input for this field should look something like `steps.<step_id>.outcome` where `step_id` is the step that is generating the comment. The possible values for this action are limited to what the [steps context outputs](https://docs.github.com/en/actions/reference/workflows-and-actions/contexts#steps-context).

### Success
Sets the hidden conclusion identifier in the message to `success`, indicating the `<step-id>` step also succeeded. 

### Failure
Sets the hidden conclusion identifier in the message to `failure`, indicating the `<step-id>` step also failed. 

### Skipped
Sets the hidden conclusion identifier in the message to `skipped`, indicating the `<step-id>` step was also skipped. No new commment will be created or updated. Will hide existing comment if `on-resolution-hide: true`. If `on-resolution-hide: false`, then existing comment remains.

### Cancelled
Sets the hidden conclusion identifier in the message to `cancelled`, indicating there was an upstream cancellation before completion. No new comment will be created or updated as this job is never ran.

## Update Mode
The `update-mode` input controls how the action handles existing comments with the same `comment-id`.

### Replace
Overwrites the content of an existing comment entirely with the new comment body. If no existing comment is found, creates a new one.

### Append
Adds the new comment body to the end of an existing comment. Divider between comments are makred by a timestamp. If no existing comment is found, creates a new one.

### Create
Always creates a new comment, regardless of whether previous comments with the same `comment-id` exist. This can result in multiple comments for the same check, however outdated ones get hidden on GitHub UI.

### None
Does not create a new comment or update existing comments. Only updates the status check. Useful for scenarios where you only want to set the check status without adding commentary.

## On-Resolution-Hide
This flag is designed for when users do not care about the specifics of their successful runs. When this value is set to `true`, if the supplied `conclusion` is `success`, then a comment will not be visible. If this is the first comment, it will still be created, but will be hidden by instantly and automatically. If there was an already existing comment that was either `failure` or `neutral`, then when the comment body is updated in accordance to the `update-mode`, it will also then be hidden. This way, in the event of a future failure, or the user wants to unhide and see the comment, the content is correct and updated. Similarly, **if there is a future comment generated on that pull request that is no longer a `success`, the comment will update and unhide itself** in accordance with the `update-mode`.    

## Logging
To enable verbose logging to gather more information about the action as it is running, set the `verbose-logging` argument to `true`. Reference the [markdown file example](#example-using-a-markdown-file) below 

## Examples
### Example: Basic Usage

```yaml
- uses: colpal/action-pr-comment@v0.1.0
  with:
    comment-id: "lint-check"
    comment-body: "Linting passed successfully!"
    conclusion: "${{ steps.<step_id>.outcome }}"
    github-token: "${{ secrets.github-token }}"
    update-mode: "create"
    on-resolution-hide: true
```

This example posts a comment to the pull request with the message "Linting passed successfully!" and sets the status check to `success`.

### Example: Using a Markdown File

```yaml
- uses: colpal/action-pr-comment@v0.1.0
  with:
    comment-id: "test-results"
    comment-body-path: "path/test-results.md"
    conclusion: "${{ steps.<step_id>.outcome }}"
    github-token: "${{ secrets.github-token }}"
    verbose-logging: true
    update-mode: "replace"
    on-resolution-hide: false
```

This example posts the contents of `path/test-results.md` as the comment body and sets the status check to `failure`, replacing any previous comment for the same check.

## Changelog

### [2025-09-30] Removing status checks - 0.4.0
- Due to the annoying issue where the status check is typically not associated with the correct calling action. As a result, have made the decision to remove the status checks as a whole. To prevent merges or give approvals, the user is responsible for creating their own step either before or after this one
- Adding pagination support on finding comments
  - Resolves an issue where if there were more than 100 comments on a pull request, this action may have trouble finding a previous one to hide or update
- `conclusion` no longer supports `"neutral"` type
  - This was used with status checks, which are no longer supported. `"neutral"` is not an output of `steps` and therefore not an accepted `conclusion` input here

### [2025-09-26] Update-Mode `none`, Conclusion `skipped` and `cancelled` - 0.3.0
- `update-mode` supports `"none"` type
  - This is intended for uses like one-time checklists to be commented on the top of pull requests
- `conclusion` supports `"skipped"` and `"cancelled"` types
  - This is intended for uses that allign with this common `conclusion` use case `conclusion: ${{ steps.previous-step.outcome }}`  

### [2025-09-25] On-Resolution-Hide Input - 0.2.0
- `on-resolution-hide` input added (default is `false` (off))
  - When enabled, will hide comments automatically once its conclusion is `success`

### [2025-09-02] Initial Release - 0.1.0
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