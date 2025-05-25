# 🌀 JIRA to GitHub Issue Sync

This GitHub Action automatically syncs **open JIRA issues** from your project into **GitHub Issues**, keeping titles, descriptions, and status labels in sync. It creates or updates GitHub issues based on changes in JIRA.

---

## 🚀 Features

- 🔁 One-way sync from **JIRA → GitHub**
- ✅ Updates GitHub issue body & labels if JIRA issue changes
- 🏷️ Applies `synced-from-jira` and `jira-status:<status>` labels
- 🧼 Handles long titles, invalid labels, and empty descriptions gracefully
- 📅 Updates GitHub issue state based on JIRA status category
- 📝 Maps JIRA Issue hierarchy (parent-child relationships) to GitHub Issues via labels

---

## 📁 Project Structure

```
.github/
  workflows/
    sync-jira-to-github.yml   # GitHub Action to run the sync
  scripts/
    sync-jira.js              # Node.js script that performs the sync
```

---

## 🛠 Setup Instructions

### 1. Clone this repo or copy the files

Copy `.github/workflows/sync-jira-to-github.yml` and `.github/scripts/sync-jira.js` into your own repo.

---

### 2. Create GitHub Secrets

Go to your repo → **Settings** → **Secrets and variables** → **Actions** → **New repository secret**.

| Name              | Description                                          |
|-------------------|------------------------------------------------------|
| `JIRA_BASE_URL`   | e.g. `https://yourcompany.atlassian.net`            |
| `JIRA_EMAIL`      | Your Atlassian user email                           |
| `JIRA_API_TOKEN`  | Your JIRA API token [(generate here)](https://id.atlassian.com/manage-profile/security/api-tokens) |
| `GITHUB_TOKEN`    | (optional) uses default token with `issues: write` permission |

---

### 3. Configure your workflow file

Check `.github/workflows/sync-jira-to-github.yml`:

```yaml
permissions:
  contents: read
  issues: write
```

This grants the workflow permission to read and write GitHub Issues.

The sync runs:
- Every hour (`cron: '0 * * * *'`)
- Or manually via **workflow dispatch**

---

## 📌 Assumptions

- Your JIRA project key is `XYZ` (you can change this in the script)
- You want to sync only **non-Done** issues (editable in the JQL query)

To customize:
```js
const jql = encodeURIComponent('project=XYZ AND statusCategory != Done');
```

---

## ✅ Example GitHub Issue Output

```markdown
**JIRA URL:** [XYZ-40](https://yourcompany.atlassian.net/browse/XYZ-40)

**Summary:** Add login flow for mobile app

**Status:** In Progress

**Description:**

We need to support Google and Apple Sign-In.
```

---

## 🙌 Credits

Created by [Szabolcs Fruhwald](https://github.com/szab100) to simplify cross-tool workflows between JIRA and GitHub.

---

## 📄 License

MIT — free to use and modify!
