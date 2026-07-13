# event-forwarder

A small microservice that forwards domain events to downstream services over HTTP.
Today it pushes events to **billing-service**.

```ts
import { forward } from "./src/forwarder.js";
await forward(event, { endpoint: "https://billing-service/internal/events" });
```
