# OBer Backend

Backend API for the OBer project, built with Node.js, Express.js, and PostgreSQL.

## Project Structure

```text
server/
  src/
    db.js
    server.js
  .env.example
  package.json
  README.md
```

## Requirements

- Node.js
- PostgreSQL
- npm

## Setup

Install dependencies:

```bash
npm install
```

Set up PostgreSQL:

```bash
sudo -u postgres psql
```

Inside the PostgreSQL prompt, set the `postgres` user password and create the project database:

```sql
ALTER USER postgres WITH PASSWORD 'newpassword';
CREATE DATABASE ober;
\q
```

Test the database connection:

```bash
PGPASSWORD=newpassword psql -h localhost -U postgres -d ober
```

Create an environment file:

```bash
cp .env.example .env
```

Update `.env` with your local PostgreSQL connection string:

```text
PORT=5000
NODE_ENV=development
DATABASE_URL=postgresql://postgres:newpassword@localhost:5432/ober
```

Start the development server:

```bash
npm run dev
```

Start the production server:

```bash
npm start
```

## Endpoints

### `GET /`

Introduction endpoint for the project.

Example response:

```json
{
  "name": "OBer API",
  "message": "Welcome to the OBer backend service.",
  "description": "This API will power the OBer application with Node.js, Express.js, and PostgreSQL.",
  "status": "running",
  "version": "1.0.0"
}
```

### `GET /health`

Checks whether the API is running and whether PostgreSQL is reachable.
