# actions-pr-comment
> Internal action for creating comments on pull requests

## Assumptions
1. A message body is ready to be used as a comment, either passed directly via `comment-body` or as a markdown file via `comment-body-path`
2. The "result" of the job that generates the comment is known. Such that this job can be told whether to mark the commit as a `success` or `failure` (via the `conclusion` input)

## Usage
```yaml
- uses: colpal/action-pr-comment@v0.1.0
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
    
    # Result of the workflows that are providing the comments to be posted. Will be set to "success", "skipped", "cancelled", "neutral", or "failure" such that this action can prevent merge whilst posting comments explaining the problem
    # Optional
    # Default: "neutral"
    conclusion: "success"

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
  checks: write
  pull-requests: write
```
- `checks: write` -> this is to create and update the [status check](#add-check) 
- `pull-requests: write` -> this is to create and update comments on a pull-request
  - `write` permissions come with `read` permissions which is required to find all comments on a pull-request in order to find previous comments to update.

## Outputs
A comment will be placed (or updated) in the pull request. The comment will be the supplied `comment-body` (or contents of `comment-body-path`) as well as a hidden identifier that is placed at the beginning of the body via `comment-id`.

A status check (see below for setup) will be emitted from the action run. When the job is triggered, it will create a status check and set the `status` to `in_progress`. Upon completion, the `status` will be updated to `completed`. The `conclusion` field will be populated with either `success` or `failure` (or `neutral`). The `conclusion` field is received as an input and is a way to tell this job to prevent or allow merges.

If the comment wants an action from a user (e.g. there is a violation that needs remedying), then the `conclusion` can be set to `failure` and since the status check has failed, merges should be prevented (if the ruleset is configured properly). If the comment is to notify the user that everything looks good, can set the `conclusion` to `success` and the commit is passed and a merge can be performed.

## Status Check Setup
### Create New Ruleset
![createRuleset](docs/createRuleset.png)

### Choose Target Branch(es)
![targetBranchSelection](docs/targetBranchSelection.png)

### Add Check
![addCheck](docs/addCheck.png)
The check supplied here should match the name provided in the `comment-id` input field on the action. If the action has been triggered before, it **should** show up in the "Suggestions" tab as you type it. If not, then the name can be supplied and it **should** detect on the first run of the action
#### Annoying Known Issue
Checks seemingly cannot be attached to a specific actions. Since this action is a composite action, it is not standalone and is called upon by other actions. One would think that the status check would then be associated with the calling action in the GitHub UI, yet it is not. Meaning that if, for example, the `actions-terraform` action called upon the `actions-pr-comment` action, then the failed status check should be attached to the `actions-terraform` action. However it does not. Nor is there a way to assign an action to attach the status check to. GitHub seemingly places it on some other condition, that does not necessarily align with calling action. 

**As a result, it is recommended that your `comment-id` is a meaningful name that includes the action that is utilizing the `actions-pr-comment`.** For instance, in `actions-terraform`, the `comment-id` when calling `actions-pr-comment` is "Terraform Actions: OPA Conftest Validation". Therefore even when the status check is saying it belongs to another action, the user can look at the specific check itself and see that it should belong to `actions-terraform` instead.

## Conclusion
The `conclusion` input determines the outcome of the status check that will be created or updated. This affects whether pull requests can be merged when branch protection rules are configured.

### Neutral
Sets the status check conclusion to `neutral`. This is the default value and typically indicates that the check completed but doesn't affect merge requirements.

### Success
Sets the status check conclusion to `success`, indicating the check passed. This allows merges to proceed when branch protection rules require this check.

### Failure
Sets the status check conclusion to `failure`, indicating the check failed. This will block merges when branch protection rules require this check to pass.

### Skipped
Sets the status check conclusion to `skipped`, indicating the check was not run due to conditions not being met. Typically doesn't block merges.

### Cancelled
Sets the status check conclusion to `cancelled`, indicating the check was cancelled before completion. Typically doesn't block merges.

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
    conclusion: "success"
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
    conclusion: "failure"
    github-token: "${{ secrets.github-token }}"
    verbose-logging: true
    update-mode: "replace"
    on-resolution-hide: false
```

This example posts the contents of `path/test-results.md` as the comment body and sets the status check to `failure`, replacing any previous comment for the same check.

## Changelog

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