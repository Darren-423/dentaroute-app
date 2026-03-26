import { app } from "./runtime";
import { env } from "./config/env";

app.listen(env.PORT, () => {
  console.log(`Concourse API listening on port ${env.PORT}`);
});
