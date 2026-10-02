#!/bin/zsh
# server.sh start <label> [port] | stop [port]
# Serves a saved build (builds/<label>/.next). Port 3000 uses apps/web, 3001 uses its clone apps/web-b,
# so two builds can be served side by side.
S=/private/tmp/claude-501/-Users-bryandoss-muxtree-worktrees-geogenesis-benchmark-ui-load/63e2a027-75d6-40cb-94df-8058e589ca6a/scratchpad/bench2
R=/Users/bryandoss/muxtree/worktrees/geogenesis/benchmark-ui-load/apps
PORT=${3:-3000}
[[ $1 == stop ]] && PORT=${2:-3000}
W=$R/web; [[ $PORT == 3001 ]] && W=/Users/bryandoss/muxtree/worktrees/geogenesis/benchmark-ui-load/.bench/web
stop() { for p in $(lsof -nP -iTCP:$PORT -sTCP:LISTEN -t 2>/dev/null); do kill $p; done; for i in $(seq 1 20); do lsof -nP -iTCP:$PORT -sTCP:LISTEN -t >/dev/null 2>&1 || return 0; sleep 0.5; done; }
if [[ $1 == stop ]]; then stop; exit 0; fi
stop
if [[ "$(cat $W/.next/BENCH_LABEL 2>/dev/null)" != "$2" ]]; then
  rm -rf $W/.next && cp -Rc $S/builds/$2/.next $W/.next && echo $2 > $W/.next/BENCH_LABEL
fi
(cd $W && DISABLE_SENTRY=1 nohup ./node_modules/.bin/next start -p $PORT > $S/results/server-$2-$PORT.log 2>&1 &)
for i in $(seq 1 60); do curl -s -o /dev/null -m 5 http://localhost:$PORT/tools && break; sleep 1; done
# Warm server-side caches so the first measured run isn't paying for them.
for p in /tools /root /home /explore /bounties /space/41e851610e13a19441c4d980f2f2ce6b /space/41e851610e13a19441c4d980f2f2ce6b/debates; do curl -s -o /dev/null -m 120 "http://localhost:$PORT$p"; done
echo "serving $2 on $PORT"
