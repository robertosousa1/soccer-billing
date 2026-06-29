import { initNewRelic } from "./config/newrelic";
initNewRelic(); // precisa ser a 1ª coisa carregada no boot

import { app } from "./app";
import { env } from "./config/env";

app.listen(env.port, () => {
  // eslint-disable-next-line no-console
  console.log(`@pelada/api ouvindo na porta ${env.port}`);
});
