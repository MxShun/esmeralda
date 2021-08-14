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

const notify_reviewers = async (webhook, reviewee_slack_id, reviewers_slack_id) => {
  let reviewee = pull_request().owner
  if (reviewers_slack_id) {
    reviewee = "<@" + reviewee_slack_id + ">"
  }

  let reviewers = ""
  if (reviewers_slack_id) {
    reviewers = "<@" + reviewers_slack_id.join(">, <@") + ">"
  }

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
            "text": "*Reviewee:*\n" + reviewee
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

const request_reviewers = () => {
  const path = core.getInput('request_reviewers')
  return JSON.parse(fs.readFileSync(path, 'utf8'))
}

const get_owner_slack_id = () => {
  const all_reviewers = request_reviewers()
  let owner_slack_id = pull_request().author

  Object.values(all_reviewers).forEach(elems => {
    elems.forEach(elem => {
      if (elem.name == pull_request().author) owner_slack_id = elem.id
    })
  })
  return owner_slack_id
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
  const all_reviewers = request_reviewers()

  // 優先度高: default_label が設定されていれば、その中で number_of_reviewers 人を指定
  if (default_label) {
    return fisher_yates_shuffle(all_reviewers[default_label])
      .filter(n => n.name !== pull_request().author)
      .slice(0, validated_number)
  }

  // 優先度中: class_of_reviewers が設定されていれば、その通りに指定
  const class_of_reviewers = core.getInput('class_of_reviewers')
  if (class_of_reviewers) {
    const classes = convert_class_to_map(class_of_reviewers)
    const reviewers_of_class = new Array()
    classes.forEach((num, team) => {
      reviewers_of_class.push(fisher_yates_shuffle(all_reviewers[team])
        .filter(n => n.name !== pull_request().author)
        .slice(0, num)
      )
    })
    return reviewers_of_class.flat()
  }

  // 優先度低: ラベル名に属するレビュアーを number_of_reviewers 人指定
  if (pull_request().label in all_reviewers) {
    return fisher_yates_shuffle(all_reviewers[pull_request().label])
      .filter(n => n.name !== pull_request().author)
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
    const reviewers_github_name = reviewers.map(r => r.name)
    const reviewers_slack_id = reviewers.map(r => r.id)
    const reviewee_slack_id = get_owner_slack_id()
    
    await octokit.pulls.requestReviewers({
      owner: repository().owner,
      repo: repository().name,
      pull_number: pull_request().number,
      reviewers: reviewers_github_name
    })

    if (webhook) {
      notify_reviewers(webhook, reviewee_slack_id, reviewers_slack_id)
    }
  }
  catch (error) {
    core.error(error)
    core.setFailed(error.message)
  }
}

run()
