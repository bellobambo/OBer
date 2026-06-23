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

## Driver Visibility

Drivers can toggle whether they appear on the passenger map.

### `PUT /api/location/visibility`

Requires a bearer token for a driver account.

Enable visibility:

```json
{
  "isVisible": true,
  "latitude": 6.5244,
  "longitude": 3.3792,
  "heading": 90.5
}
```

Disable visibility:

```json
{
  "isVisible": false
}
```

Only visible drivers with a location updated in the last five minutes are returned by `GET /api/location/nearby-drivers`.

## Active Hotspots

### `GET /api/hotspots/active`

Requires a bearer token. Returns unexpired active hotspots grouped by normalized
place name and coordinates rounded to five decimal places.

Without query parameters, all grouped active hotspots are returned:

```http
GET /api/hotspots/active
```

To return only hotspots within range of a driver's current position, provide
latitude and longitude. Radius is measured in kilometres, defaults to `5`, and
cannot exceed `50`:

```http
GET /api/hotspots/active?latitude=7.521&longitude=4.524&radius=5
```

```json
{
  "success": true,
  "message": "Active hotspots retrieved successfully.",
  "data": {
    "hotspots": [
      {
        "placeName": "SUB",
        "coordinates": [4.524, 7.521],
        "passengerCount": 12,
        "distance": 0.8
      }
    ],
    "searchArea": {
      "latitude": 7.521,
      "longitude": 4.524,
      "radius": 5,
      "unit": "kilometres"
    }
  }
}
```

When coordinates are provided, results are sorted nearest first. Both latitude
and longitude must be supplied together. The location is taken from the query,
so the driver frontend should send its latest GPS coordinates.

Arming a new hotspot automatically replaces any previous active hotspot owned
by the same passenger.

## Realtime Map Updates

The server exposes Socket.IO on the same host and port as the HTTP API. Connect
with the login token:

```js
const socket = io(API_URL, {
  auth: { token }
});
```

The server sends these events:

- `hotspots:snapshot`: all active grouped hotspots, sent after connecting.
- `hotspot:updated`: one grouped hotspot whose passenger count changed.
- `hotspot:removed`: one grouped hotspot whose passenger count reached zero.
- `driver:location`: a visible driver's latest location.
- `driver:visibility`: a driver's visibility state changed.

Drivers can send location updates:

```js
socket.emit(
  "driver:location:update",
  { latitude: 7.521, longitude: 4.524, heading: 90 },
  (response) => console.log(response)
);
```

Drivers can also toggle visibility:

```js
socket.emit(
  "driver:visibility:update",
  { isVisible: false },
  (response) => console.log(response)
);
```

Socket connections are authenticated and driver update events are restricted
to driver accounts. Hotspot expiry is checked every five seconds and reflected
through the same grouped hotspot events.

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
