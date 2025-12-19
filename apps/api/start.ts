// Start both API server and worker in the same process
import "./src/index.ts";
import "./src/worker/suktaWorker.ts";

console.log("Started API server and worker");
