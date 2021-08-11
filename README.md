# Request Reviewers with Added Labeled

Pull request reviewer with the added label

## Usage

### Create `.github/workflows/esmeralda/pr_reviewers.json`

format sample

```json
{
  "label name": [
    {"name": "Request Reviewer Name", "id": "Slack ID"}
  ],
  "team A": [
    {"name": "Alice", "id": "U01E1234H01"},
    {"name": "Angel", "id": "U01E1235H02"}
  ],
  "team B": [
    {"name": "Bob", "id": "U01E1235H03"},
    {"name": "Bobby", "id": "U01E1235H04"}
  ]
}
```

### Create `.github/workflows/pr_reviewers.yml`

format sample 1: Request a reviewer of labeled team

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
          # class_of_reviewers: # Optional
          # default_label: # Optional
          # slack_webhook: ${{ secrets.SLACK_WEBHOOK_URL }} # Optional
```

format sample 2: Request up to 15 reviewers of "team B" and notify them in Slack

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
          # number_of_reviewers: # Optional (Default: 15)
          # class_of_reviewers: # Optional
          default_label: team B # Optional
          slack_webhook: ${{ secrets.SLACK_WEBHOOK_URL }} # Optional
```

format sample 3: Request a reviewer of team A and 2 reviewers of team B

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
          # number_of_reviewers: # Optional (Default: 15)
          class_of_reviewers: "team A: 1, team B: 2" # Optional
          # default_label: # Optional
          # slack_webhook: ${{ secrets.SLACK_WEBHOOK_URL }} # Optional
```
