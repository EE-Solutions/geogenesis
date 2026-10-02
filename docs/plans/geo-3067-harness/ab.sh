#!/bin/zsh
# ab.sh <labelA> <labelB> "<flow> <flow> ..." [runs=4] [concurrency=4]
# Serves A on :3000 and B on :3001 (B browsers keep the localhost:3000 origin via --map), alternates
# runs between them (same load on both), then prints the comparison to results/<A>-vs-<B>.md.
S=${0:a:h}
A=$1; B=$2; FLOWS=(${=3}); RUNS=${4:-4}; CONC=${5:-4}
TAG=$A-vs-$B
$S/server.sh start $A 3000 >/dev/null && $S/server.sh start $B 3001 >/dev/null || { echo "server start failed"; exit 1; }
JOBS=$S/jobs/$TAG.txt
: > $JOBS
for i in $(seq 1 $RUNS); do for f in $FLOWS; do
  if (( i % 2 )); then echo "$TAG.$A $f $i --expect $A" >> $JOBS; echo "$TAG.$B $f $i --map 3001 --expect $B" >> $JOBS
  else echo "$TAG.$B $f $i --map 3001 --expect $B" >> $JOBS; echo "$TAG.$A $f $i --expect $A" >> $JOBS; fi
done; done
for L in $A $B; do [[ -f $S/results/$TAG.$L.jsonl ]] && mv $S/results/$TAG.$L.jsonl $S/results/$TAG.$L.$(date +%H%M%S).jsonl.old; done
rm -f $S/results/$TAG.log
node $S/runq.mjs $JOBS $CONC $TAG.log
python3 $S/analyze.py summary $TAG.$A $TAG.$B | tee $S/results/$TAG.md
