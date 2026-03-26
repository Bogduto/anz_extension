# Anz Extension

The information system consists of three interconnected components: a Visual Studio Code extension, a backend built on Supabase, and a web user interface.

The VSCode extension automatically tracks user activity while working on programming projects and generates usage statistics. The collected data is sent to the backend for storage and further processing.

The web interface, implemented using React/Next.js, provides user authentication, visualizes statistics in the form of charts and reports, and enables productivity analysis for programming projects.

---

# Getting Started (Dev Mode)

### Prerequisites

* Install Node.js 18+

### Clone the repository

```bash
git clone <URL>
cd anz-extension
```

### Install dependencies

```bash
npm install
# or
yarn install
```

### Run in Dev Mode

1. Open the project in Visual Studio Code
2. Press `F5` > a new VSCode window will open with the extension activated
3. You should see a timer in the bottom-right panel, indicating the extension is working

---

# Authorization Setup (GitHub + Supabase)

### GitHub OAuth

1. Create an OAuth App on GitHub
2. Homepage URL > Supabase project URL
3. Authorization callback URL → Supabase callback URL
4. Copy the Client ID and Secret

### Supabase

1. Go to **Authentication > Sign in / Providers > GitHub**
2. Enter the Client ID and Secret
3. Enable the provider
4. Go to **Authentication > URL configuration** and set the redirect URL for the callback

### VSCode Extension

* For production → store credentials in `.env`
* For development → add credentials to `.vscode/launch.json` in the `env` field

---

# Database Schema

### Session

| Column        | Type                     | Description                      |
| ------------- | ------------------------ | -------------------------------- |
| id            | bigint                   | Unique session ID                |
| created_at    | timestamp with time zone | Creation date                    |
| updated_at    | timestamp with time zone | Last update                      |
| repos_id      | text                     | Repository ID                    |
| project_title | text                     | Project title                    |
| user_id       | uuid                     | Reference to user (`auth.users`) |

### Slice

| Column     | Type      | Description                   |
| ---------- | --------- | ----------------------------- |
| id         | bigint    | Unique slice ID               |
| created_at | timestamp | Creation date                 |
| start      | bigint    | Start time of the slice       |
| end        | bigint    | End time of the slice         |
| session_id | bigint    | Reference to `session.id`     |
| files      | ARRAY     | List of file paths            |
| langs      | ARRAY     | List of programming languages |
