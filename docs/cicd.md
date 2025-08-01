# CICD

## CI

Pretty simple, just run the following commands in the CI [workflow](../.github/workflows/lint.yml).

```sh
npm run typecheck
npm run lint
npm run test
```

> [!NOTE]
> Some environment should be set to bypass the env check, you can check it in the [env.js](../src/env.js).

## CD

The production environment runs on a server based on Kubernetes, check the [Dockerfile](../devtools/Dockerfile) and [entrypoint.sh](../devtools/entrypoint.sh) for more details.

> ![Note]
> For some reason, this project uses a `-sta` suffix for the workload name in the staging(testnet) environment, but no suffix in the production(mainnet) environment.