# OBer

OBer is a transport system software for connecting students and drivers around campus.

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

## Socketio Realtime Integration

The server exposes Socket.IO on the same URL and port as the REST API. Realtime
updates complement the HTTP endpoints; the existing REST endpoints continue to
work when the frontend is not connected to Socket.IO.

### Install the Socket.IO client

Run this inside `client/`:

```bash
npm install socket.io-client
```

### Create one shared socket connection

The socket uses the same token returned by the login endpoint and stored by the
frontend in `localStorage`.

```js
// client/src/services/socket.js
import { io } from "socket.io-client";

const API_URL = import.meta.env.VITE_API_URL || window.location.origin;

let socket;

export function getSocket() {
  const token = localStorage.getItem("token");

  if (!token) return null;

  if (!socket) {
    socket = io(API_URL, {
      auth: { token },
      autoConnect: false
    });
  }

  return socket;
}

export function disconnectSocket() {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
}
```

Use one shared connection instead of creating a new socket in every component.
Disconnect it when the user logs out.

### Load active hotspots

Drivers should use the REST endpoint for the initial map state:

```http
GET /api/hotspots/active?latitude=<latitude>&longitude=<longitude>&radius=<km>
Authorization: Bearer <token>
```

Example response item:

```json
{
  "placeName": "SUB",
  "coordinates": [4.524, 7.521],
  "passengerCount": 12,
  "distance": 0.8
}
```

Calling `GET /api/hotspots/active` without query parameters returns all grouped
active hotspots. When filtering, `radius` defaults to 5 km.

### Listen for realtime changes

```js
const socket = getSocket();

if (socket) {
  socket.connect();

  socket.on("hotspots:snapshot", ({ hotspots }) => {
    // Replace the current hotspot state.
  });

  socket.on("hotspot:updated", (hotspot) => {
    // Add the grouped hotspot or update its passengerCount.
  });

  socket.on("hotspot:removed", (hotspot) => {
    // Remove the hotspot marker because its count reached zero.
  });

  socket.on("driver:location", (driver) => {
    // Add or move the marker identified by driver.driverId.
  });

  socket.on("driver:visibility", (driver) => {
    // Add or remove the driver's marker using driver.isVisible.
  });
}
```

Remove listeners when a React component unmounts to avoid duplicate handlers:

```js
return () => {
  socket.off("hotspots:snapshot");
  socket.off("hotspot:updated");
  socket.off("hotspot:removed");
  socket.off("driver:location");
  socket.off("driver:visibility");
};
```

Hotspot socket events currently contain all changed locations. A driver using a
selected radius should ignore updates outside that radius or refetch the nearby
REST endpoint after receiving an update.

### Send driver location updates

Only authenticated driver accounts can send these events:

```js
socket.emit(
  "driver:location:update",
  { latitude, longitude, heading },
  (response) => {
    if (!response.success) {
      console.error(response.message);
    }
  }
);
```

To toggle whether the driver appears to passengers:

```js
socket.emit(
  "driver:visibility:update",
  { isVisible: false },
  (response) => console.log(response)
);
```

The existing HTTP alternatives remain available:

```http
PUT /api/location
PUT /api/location/visibility
POST /api/hotspot/arm
POST /api/hotspot/disarm
```

HTTP updates are saved normally and are also broadcast to connected Socket.IO
clients.


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
