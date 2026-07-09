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

## Admin Driver Onboarding

Admin endpoints are protected by the normal bearer token plus an email allowlist.
Add selected admin account emails to `.env`:

```text
ADMIN_EMAILS=transport.admin@example.com,ops@example.com
```

These users can call `/api/admin/*` after logging in through the existing auth
flow. Admin-created drivers are marked phone-verified because the account is
provisioned by the transport office.

### `GET /api/admin/me`

Confirms that the current bearer token belongs to an allowed admin email.

### `GET /api/admin/drivers/stats`

Returns the card counts for the admin dashboard:

```json
{
  "success": true,
  "message": "Driver stats retrieved successfully.",
  "data": {
    "stats": {
      "totalDrivers": 312,
      "driversOnDuty": 148,
      "readyDrivers": 298,
      "totalBusDrivers": 82,
      "totalTricycleDrivers": 230
    }
  }
}
```

- `totalDrivers`: all users with role `DRIVER`.
- `driversOnDuty`: drivers whose visibility is currently enabled.
- `readyDrivers`: drivers with `onboardingStatus` set to `COMPLETE`.
- `totalBusDrivers`: onboarded drivers assigned to a bus.
- `totalTricycleDrivers`: onboarded drivers assigned to a tricycle.

### `GET /api/admin/drivers`

Returns onboarded drivers. Optional `search` matches name, email, phone, driver
code, or vehicle ID:

```http
GET /api/admin/drivers?search=OAU-2207
```

### `POST /api/admin/drivers`

Creates a driver account, generates a unique driver code such as `OAU-2207`, and
stores the vehicle/document details used by the admin dashboard.

```json
{
  "fullName": "Adewale Kolawole",
  "email": "adewale@example.com",
  "phone": "08118228328",
  "password": "12345678",
  "vehicleId": "OAU-TR-114",
  "vehicleType": "TRICYCLE",
  "licenseNumber": "LCV-2207"
}
```

`vehicleType` must be either `BUS` or `TRICYCLE`. `licenseNumber` is optional.

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
