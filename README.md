# Request Reviewers with Added Labeled

Pull request reviewer with the added label

## Usage

### Create `.github/workflows/esmeralda/pr_reviewers.json`

format sample

```json
{
  "label name": [
    "Request Reviewer Name"
  ],
  "team A": [
    "Alice", "Angel"
  ],
  "team B": [
    "Bob", "Bobby"
  ]
}
```

### Create `.github/workflows/pr_reviewers.yml`

format sample

```yaml
name: Request Reviewers with Added Label
on:
  pull_request:
    types: [labeled]

jobs:
  assign_reviewer_job:
    runs-on: ubuntu-latest
    steps:
      - name: Checkout
        uses: actions/checkout@v2
      - name: Assign
        uses: marty-s-miyake/esmeralda@master
        with:
          github-token: ${{ secrets.GITHUB_TOKEN }}
          request_reviewers: .github/workflows/esmeralda/pr_reviewers.json
          number_of_reviewers: 1 # Optional (Default: 15)
          class_of_reviewers: "team B: 1" # Optional
          default_label: team B # Optional
          slack_webhook: ${{ secrets.SLACK_WEBHOOK_URL }} # Optional
```
