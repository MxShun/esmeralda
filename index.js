const core = require('@actions/core')
const github = require('@actions/github')
const { IncomingWebhook } = require('@slack/webhook')
const fs = require('fs')

const repository = () => {
  return {
    owner: github.context.repo.owner,
    name: github.context.repo.repo,
  }
}

const pull_request = () => {
  return {
    number: github.context.payload.pull_request.number,
    title: github.context.payload.pull_request.title,
    url: github.context.payload.pull_request.html_url,
    author: github.context.payload.pull_request.user.login,
    label: github.context.payload.label.name
  }
}

const request_reviewers = () => {
  const path = core.getInput('request_reviewers')
  return JSON.parse(fs.readFileSync(path, 'utf8'))
}

const fisher_yates_shuffle = ([...array]) => {
  for (let i = array.length - 1; i >= 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
  return array
}

const draft_reviewers = () => {
  const reviewers = request_reviewers()
  const forwards = fisher_yates_shuffle(reviewers["FW"]).filter(n => n !== pull_request().author)
  const defenders = fisher_yates_shuffle(reviewers["DF"]).filter(n => n !== pull_request().author)
  return forwards.slice(0, 1).concat(defenders.slice(0, 1))
}

const run = async () => {
  try {
    const is_labeled_in_review = pull_request().label.toLowerCase().replace(" ", "") == "inreview"
    if (!is_labeled_in_review) return

    const webhook = core.getInput('slack_webhook')
    const token = core.getInput('github-token')
    const octokit = github.getOctokit(token)
    const reviewers = draft_reviewers()

    await octokit.pulls.requestReviewers({
      owner: repository().owner,
      repo: repository().name,
      pull_number: pull_request().number,
      reviewers: reviewers
    })

    if (webhook) {
      await new IncomingWebhook(webhook).send({
        "blocks": [
          {
            "type": "section",
            "text": {
              "type": "mrkdwn",
              "text": "*<" + pull_request().url + "|" + pull_request().title + ">*"
            }
          },
          {
            "type": "section",
            "fields": [
              {
                "type": "mrkdwn",
                "text": "*Reviewee:*\n" + pull_request().author
              },
              {
                "type": "mrkdwn",
                "text": "*Reviewers:*\n" + reviewers
              }
            ]
          }
        ]
      })
    }
  }
  catch (error) {
    core.error(error)
    core.setFailed(error.message)
  }
}

run()
