import { app } from "./app";
import { config } from "./config";

app.listen(config.port, () => {
  console.log(`FB-CM Factory V2 backend listening on http://localhost:${config.port}`);
});

