const axios = require('axios');

const JIRA_BASE_URL = process.env.JIRA_BASE_URL;
const JIRA_EMAIL = process.env.JIRA_EMAIL;
const JIRA_API_TOKEN = process.env.JIRA_API_TOKEN;
const GITHUB_TOKEN = process.env.GITHUB_TOKEN;
const REPO = process.env.GITHUB_REPOSITORY;

const GITHUB_API = 'https://api.github.com';
const JIRA_AUTH = {
  username: JIRA_EMAIL,
  password: JIRA_API_TOKEN,
};

// Utility to safely create GitHub labels
function safeLabel(str) {
  return str
    .toLowerCase()
    .replace(/[^a-z0-9-_:.]/g, '-') // sanitize label
    .slice(0, 50);
}

// Construct GitHub issue title
function buildGithubTitle(issue) {
  const base = `[JIRA ${issue.key}] ${issue.fields.summary}`;
  return base.length > 250 ? base.slice(0, 250) + '…' : base;
}

// Construct GitHub issue body with description and relation info
function buildGithubBody(issue) {
  const descBlocks = issue.fields.description?.content?.map(block =>
    block.content?.map(text => text.text).join(' ')
  ).join('\n') || issue.fields.description || '*No description provided.*';

  let relationInfo = '';
  // Epic Link field usually stored in customfield_10008 (adjust if needed)
  const epicKey = issue.fields.customfield_10008;
  const parentKey = issue.fields.parent?.key;

  if (epicKey) {
    relationInfo += `\n\n**Epic:** [${epicKey}](${JIRA_BASE_URL}/browse/${epicKey})`;
  }
  if (parentKey) {
    relationInfo += `\n\n**Parent Issue:** [${parentKey}](${JIRA_BASE_URL}/browse/${parentKey})`;
  }

  return `
**JIRA URL:** [${issue.key}](${JIRA_BASE_URL}/browse/${issue.key})

**Summary:** ${issue.fields.summary}

**Status:** ${issue.fields.status.name}

**Description:**

${descBlocks.trim()}
${relationInfo}
  `.trim();
}

// Fetch JIRA issues (non-Done by default)
async function fetchJiraIssues() {
  // Change 'SWF' to your project key as needed
  const jql = encodeURIComponent('project=XYZ AND statusCategory != Done');
  const url = `${JIRA_BASE_URL}/rest/api/3/search?jql=${jql}&expand=names`;
  console.log(`Fetching JIRA issues from: ${url}`);

  const res = await axios.get(url, {
    auth: JIRA_AUTH,
    headers: { Accept: 'application/json' },
  });

  return res.data.issues;
}

// Fetch all GitHub issues (open and closed)
async function fetchGithubIssues() {
  const res = await axios.get(`${GITHUB_API}/repos/${REPO}/issues?state=all&per_page=100`, {
    headers: { Authorization: `Bearer ${GITHUB_TOKEN}` },
  });
  return res.data;
}

// Create GitHub issue
async function createGithubIssue(title, body, labels, state='open') {
  console.log(`Creating GitHub issue with title: "${title}"`);
  await axios.post(`${GITHUB_API}/repos/${REPO}/issues`, {
    title,
    body,
    labels,
    state,
  }, {
    headers: {
      Authorization: `Bearer ${GITHUB_TOKEN}`,
      Accept: 'application/vnd.github+json',
    },
  });
}

// Update GitHub issue
async function updateGithubIssue(issueNumber, body, labels, state) {
  console.log(`Updating GitHub issue #${issueNumber} (state: ${state})`);
  await axios.patch(`${GITHUB_API}/repos/${REPO}/issues/${issueNumber}`, {
    body,
    labels,
    state,
  }, {
    headers: {
      Authorization: `Bearer ${GITHUB_TOKEN}`,
      Accept: 'application/vnd.github+json',
    },
  });
}

async function main() {
  const jiraIssues = await fetchJiraIssues();
  const githubIssues = await fetchGithubIssues();

  for (const jira of jiraIssues) {
    const title = buildGithubTitle(jira);
    const body = buildGithubBody(jira);
    const defaultLabels = ['synced-from-jira'];

    // Status label
    const statusLabel = safeLabel(`jira-status:${jira.fields.status.name}`);

    // Epic and parent relations as labels
    const labels = [...defaultLabels, statusLabel];
    const epicKey = jira.fields.customfield_10008;
    const parentKey = jira.fields.parent?.key;
    if (epicKey) labels.push(`epic:${epicKey}`);
    if (parentKey) labels.push(`parent:${parentKey}`);

    // Determine GitHub issue state based on JIRA status category
    const isDone = jira.fields.status.statusCategory.key === 'done';
    const githubState = isDone ? 'closed' : 'open';

    const existing = githubIssues.find(gh => gh.title === title);

    if (existing) {
      // Update if body, labels, or state differ
      const existingLabels = existing.labels.map(l => l.name).sort();
      const newLabels = labels.sort();
      if (existing.body !== body || JSON.stringify(existingLabels) !== JSON.stringify(newLabels) || existing.state !== githubState) {
        await updateGithubIssue(existing.number, body, labels, githubState);
      } else {
        console.log(`No update needed for ${title}`);
      }
    } else {
      await createGithubIssue(title, body, labels, githubState);
    }
  }
}

main().catch(err => {
  if (err.response) {
    console.error('Sync failed:', err.response.status, err.response.statusText);
    console.error('Response body:', JSON.stringify(err.response.data, null, 2));
  } else {
    console.error('Sync failed:', err.message);
  }
  process.exit(1);
});
