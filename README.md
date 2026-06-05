# OBer

OBer is an application project with a separate frontend and backend in one repository.

## Project Structure

```text
OBer/
  client/   # frontend
  server/   # backend
```

## Frontend

The frontend will be built with React.

Frontend developers should use [Bruno](https://www.usebruno.com) to view and test backend APIs during development. It is easy to navigate and lightweight.

## Backend

The backend is built with:

- Node.js
- Express.js
- PostgreSQL

The backend currently provides a basic introduction endpoint and a health endpoint for checking the API and database connection.

See [server/README.md](server/README.md) for backend setup instructions.



## Team Workflow


```text
OBer/
  client/
  server/
```

Frontend developers should work inside `client/` and commit only frontend changes:

```bash
git clone {repo url}
cd OBer
git pull
git add client
git commit -m "Update frontend"
git push
```

Backend developers should work inside `server/` and commit only backend changes:

```bash
git clone {repo url}
cd OBer
git pull
git add server
git commit -m "Update backend"
git push
```

Before committing, check what changed:

```bash
git status
```

Avoid using `git add .` when working independently, because it may include changes from both stacks.
