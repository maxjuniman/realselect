import { loadEnv } from "./lib/env.js";

loadEnv();

const { start } = await import("./server.js");
await start();
