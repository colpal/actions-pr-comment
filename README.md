# actions-pr-comment
> Internal action for creating comments on pull requests

## Assumptions
1. A message body is ready to be used as a comment.
<!-- 2. You have a identifier to be placed inside your message. This is in the event the same author has multiple different comments, this action can target the correct one to update/delete -->

## Usage
```yaml
- uses: colpal/action-pr-comment@v1
  with:
    # The path where the markdown (.md) file is stored which holds the text to be used as the message body
    # Optional
    # Default: "./"
    body_path: "example/custom-path"

    # The contents of the text to be used as the message body
    # Optional
    # Default: ""
    body: "My comment here"
```

## Outputs
---

## Examples
---

## Helpful Links
---