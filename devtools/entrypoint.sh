set -e  # Exit immediately if a command exits with a non-zero status

# Default to "serve" if RUN_MODE is not set
RUN_MODE=${RUN_MODE}
JS_INTERPRETER=${JS_INTERPRETER:-"npx tsx"}

echo "Running in mode: $RUN_MODE"
echo "JS_INTERPRETER: $JS_INTERPRETER"

case "$RUN_MODE" in
  "aggregator-ckb")
    echo "Starting aggregator-ckb..."
    $JS_INTERPRETER ./devtools/aggregator-ckb/start.ts
    ;;
  "aggregator-ckb-ch")
    echo "Running data aggregator-ckb-ch..."
    $JS_INTERPRETER ./devtools/clickhouse/start-ckb.ts
    ;;
  "aggregator-btc")
    echo "Starting aggregator-btc..."
    $JS_INTERPRETER ./devtools/aggregator-btc/start.ts
    ;;
  "aggregator-btc-ch")
    echo "Running data aggregator-btc-ch..."
    $JS_INTERPRETER ./devtools/clickhouse/start-btc.ts
    ;;
  "api")
    echo "Starting api..."
    $JS_INTERPRETER .next/standalone/server.js
    ;;
  "cron")
    echo "Starting cron..."
    crond -f
    ;;
  *)
    echo "Error: Unknown RUN_MODE '$RUN_MODE'"
    exit 1
    ;;
esac