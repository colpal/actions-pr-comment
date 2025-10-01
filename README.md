# actions-pr-comment
> Internal action for creating, updating, and hiding comments on pull requests

## Assumptions
1. A message body is ready to be used as a comment, either passed directly via `comment-body` or as a markdown file via `comment-body-path`

## Inputs
All inputs for this action are summarized below for quick reference:

| Name                | Type   | Default                | Required? | Description                                                                                  |
|---------------------|--------|------------------------|-----------|----------------------------------------------------------------------------------------------|
| `comment-id`        | string | —                      | Yes       | Unique identifier for the comment/check.                                                     |
| `comment-body`      | string | —                      | No        | Text to use as the comment body. Required if `comment-body-path` is not provided.                |
| `comment-body-path` | string | —                      | No        | Path to markdown file for comment body. Required if `comment-body` is not provided.              |
| `conclusion`        | string | —                      | Yes       | Workflow result: `success`, `failure`, `skipped`, or `cancelled`.                           |
| `github-token`      | string | `${{ github.token }}`  | No        | GitHub token for authentication.                                                   |
| `update-mode`       | string | `create`               | No        | How to handle existing comments: `replace`, `append`, `create`, or `none`.                   |
| `on-resolution-hide`| string   | `"false"`                | No        | Hide previous failure comment when resolved.                                       |
| `verbose-logging`   | string   | `"false"`                | No        | Enable verbose logging.                                                            |

### Example Usage
```yaml
- uses: colpal/action-pr-comment@v1.0.0
  if: ${{ !cancelled() }}
  with:
    comment-id: "my-check"
    comment-body: "My comment here"
    conclusion: "${{ steps.<step_id>.outcome }}"
    github-token: "${{ github.token }}"
    update-mode: "create"
    on-resolution-hide: "false"
    verbose-logging: "false"
```

### Why use `if: ${{ !cancelled() }}`?

To ensure this action runs after a workflow step, even if that step fails, use `if: ${{ !cancelled() }}`. This lets the comment action run unless the workflow is cancelled.

Avoid using `continue-on-error: true` on the previous step. While it allows the comment action to run after a failure, it also marks the workflow as successful, which can be misleading.

**Use `if: ${{ !cancelled() }}` on this action to run it after any step, regardless of success or failure, while keeping the workflow status accurate.**

## Permissions
For this action to do its job to the fullest, it will require some permissions. In the workflow file that is calling this action, there should be a permission block. The following permissions are required for `secrets.GITHUB_TOKEN` in the workflow:
```yaml
permissions:
  pull-requests: write
```
- `pull-requests: write` → this is to create and update comments on a pull request
  - `write` permissions come with `read` permissions, which are required to find all comments on a pull request in order to find previous comments to update.

## Outputs
The action places or updates a comment in the pull request. The comment includes:

- The supplied `comment-body` or contents of `comment-body-path`.
- Hidden identifiers at the beginning of the body:
  - `<!-- comment-id: my-check -->` (for identifying the comment)
  - `<!-- conclusion: success -->` (for tracking status and visibility)

## Conclusion
The `conclusion` input is a hidden identifier that tracks the status of the current run. It works with [`on-resolution-hide`](#on-resolution-hide) to control comment visibility. Use `steps.<step_id>.outcome` for this value. Possible values and their effects:

| Value      | Effect                                                                                   |
|------------|-----------------------------------------------------------------------------------------|
| `success`  | Sets hidden identifier to `success`. Indicates the step succeeded.                      |
| `failure`  | Sets hidden identifier to `failure`. Indicates the step failed.                         |
| `skipped`  | Sets hidden identifier to `skipped`. No new comment created/updated. May hide existing. |
| `cancelled`| Sets hidden identifier to `cancelled`. No new comment created/updated.                  |

## Update Mode

The `update-mode` input controls how the action handles existing comments with the same `comment-id`.

| Option    | Description                                                                                   |
|-----------|----------------------------------------------------------------------------------------------|
| `replace` | Overwrites the content of an existing comment entirely with the new comment body. If no existing comment is found, creates a new one. |
| `append`  | Adds the new comment body to the end of an existing comment, separated by a timestamp. If no existing comment is found, creates a new one. |
| `create`  | Always creates a new comment, regardless of whether previous comments with the same `comment-id` exist. This can result in multiple comments for the same check; outdated ones are hidden in the GitHub UI. |
| `none`    | Does not create a new comment or update existing comments after the initial one. Will create the initial comment when no matching `comment-id` is found, but will not perform any updates after. |

## On-Resolution-Hide
This flag controls whether successful comments are hidden automatically. When set to `true`:

- If `conclusion` is `success`, the comment is hidden (even if it's the first comment).
- If updating a previous comment with `failure` or `neutral`, it will be hidden after update.
- If a future comment is no longer `success`, it will update and unhide itself according to `update-mode`.
- Hidden comments remain up-to-date, so if you unhide them, the content is correct.

## Logging
Set `verbose-logging: "true"` to enable detailed logs for debugging.

## Examples

### Basic Usage
Posts a comment to the pull request with the message "Linting passed successfully!" and sets the conclusion to `success`.

```yaml
- uses: colpal/action-pr-comment@v1.0.0
  if: ${{ !cancelled() }}
  with:
    comment-id: "lint-check"
    comment-body: "Linting passed successfully!"
    conclusion: "${{ steps.<step_id>.outcome }}"
    github-token: "${{ secrets.github-token }}"
  update-mode: "create"
  on-resolution-hide: "true"
```

### Example: Using a Markdown File
Posts the contents of path/test-results.md as the comment body and sets the conclusion to failure, replacing any previous comment for the same check.

```yaml
- uses: colpal/action-pr-comment@v1.0.0
  if: ${{ !cancelled() }}
  with:
    comment-id: "test-results"
    comment-body-path: "path/test-results.md"
    conclusion: "${{ steps.<step_id>.outcome }}"
    github-token: "${{ secrets.github-token }}"
  verbose-logging: "true"
  update-mode: "replace"
  on-resolution-hide: "false"
```

This example posts the contents of `path/test-results.md` as the comment body and sets the conclusion to `failure`, replacing any previous comment for the same check.

## Changelog

### [2025-10-02] Removing status checks - 0.4.0
- Status checks are removed due to issue where they would not be attached to the calling action. Resulted in actions failing that didn't actually fail because the commenting of another action was placed onto it.
- Adding pagination support on finding comments
  - Resolves an issue where if there were more than 100 comments on a pull request, this action may have trouble finding a previous one to hide or update
- `conclusion` no longer supports `"neutral"` type
  - This was used with status checks, which are no longer supported. `"neutral"` is not an output of `steps` and therefore not an accepted `conclusion` input here

### [2025-09-26] Update-Mode `none`, Conclusion `skipped` and `cancelled` - 0.3.0
- `update-mode` supports `"none"` type
  - This is intended for uses like one-time checklists to be commented on the top of pull requests
- `conclusion` supports `"skipped"` and `"cancelled"` types
  - This is intended for use cases that align with the common `conclusion` pattern: `conclusion: ${{ steps.previous-step.outcome }}`

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