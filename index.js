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

const convert_class_to_map = (class_of_reviewers) => {
  // "team A: 1, team B: 1" を Map(["team A",1]["team B",2]) に変換する
  return new Map(class_of_reviewers.split(",").map(c => c.split(":").map(e => e.trim())))
}

const fisher_yates_shuffle = ([...array]) => {
  for (let i = array.length - 1; i >= 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
  return array
}

const draft_reviewers = () => {
  const default_label = core.getInput('default_label')
  const number = core.getInput('number_of_reviewers')
  const validated_number = (number >= 0 && number <= 15) ? number : 15

  // 優先度高: default_label が設定されていれば、その中で number_of_reviewers 人を指定
  if (default_label) {
    return fisher_yates_shuffle(request_reviewers()[default_label])
      .filter(n => n !== pull_request().author)
      .slice(0, validated_number)
  }

  // 優先度中: class_of_reviewers が設定されていれば、その通りに指定
  const class_of_reviewers = core.getInput('class_of_reviewers')
  if (class_of_reviewers) {
    const classes = convert_class_to_map(class_of_reviewers)
    const reviewers = new Array()
    classes.forEach((number, team) => {
      reviewers.push(fisher_yates_shuffle(request_reviewers()[team])
        .filter(n => n !== pull_request().author)
        .slice(0, number)
      )
    })
    return reviewers
  }

  // 優先度低: ラベル名に属するレビュアーを number_of_reviewers 人指定
  if (pull_request().label in request_reviewers()) {
    return fisher_yates_shuffle(request_reviewers()[pull_request().label])
      .filter(n => n !== pull_request().author)
      .slice(0, validated_number)
  }

  return []
}

const run = async () => {
  try {
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
