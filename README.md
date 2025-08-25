# actions-pr-comment
> Internal action for creating comments on pull requests

## Assumptions
1. A message body is ready to be used as a comment.
<!-- 2. You have a identifier to be placed inside your message. This is in the event the same author has multiple different comments, this action can target the correct one to update/delete -->

## Usage
```yaml
- uses: colpal/action-pr-comment@v1
  with:
    # Name of the check. To be used in the identifying comment and as the display name of GitHub for this action
    # Required
    check_name: "my-check"

    # The contents of the text to be used as the message body
    # Optional - used instead of comment_body_path
    # Default: "./"
    comment_body: "example/custom-path"

    # The path where the markdown (.md) file is stored which holds the text to be used as the message body
    # Optional - used instead of comment_body
    # Default: ""
    comment_body_path: "My comment here"
    
    # The path where the markdown (.md) file is stored which holds the text to be used as the message body
    # Optional
    # Default: "${{ github.token }}"
    github_token: "${{ github.token }}"

    # How to handle existing comments. Options: 'replace' (overwrite), 'append' (add to end), 'create' (always make a new comment)
    # Required
    # Default: "create"
    update_mode: "create"
```

## Outputs
A comment will be placed (or updated) in the pull request. The comment will be the supplied `body` (or contents of `body_path`) as well as a hidden identifier that is placed at the beginning of the body (`check_name`).

A status check (see below for setup) will be emitted from the action run. When the job is triggered, it will create a status check and set the `status` to `in_progress`. Upon completion, the `status` will be updated to `completed` and the `conclusion` field will be populated with either `success` or `failure`. The `conclusion` field is determined via the contents of the message body. This is the way that this job will "prevent" merges. When the comment wants action from a user (e.g. there is a violation that needs remedying), then the `conclusion` will be `failure`. Assuming the repository has this job's status check as part of the ruleset, then it will prevent merge until the `conclusion` is set to `success`. 

## Status Check Setup
### Create New Ruleset
![createRuleset](docs/createRuleset.png)

### Choose Target Branch(es)
![targetBranchSelection](docs/targetBranchSelection.png)

### Add Check
![addCheck](docs/addCheck.png)
The check supplied here should match the name provided in the `check_name` input field on the action. If the action has been triggered before, it **should** show up in the "Suggestions" tab as you type it. If not, then the name can be supplied and it **should** detect on the first run of the action

## Examples
---

## Helpful Links
---