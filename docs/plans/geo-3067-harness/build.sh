#!/bin/zsh
# build.sh <label> [git-ref]: production build of apps/web, done in the .bench/build clone so both
# servers keep serving. With a ref, builds that commit's apps/web (plus the working tree's untracked
# .env files); without one, the working tree as it is. Saved to builds/<label>.
set -e
S=${0:a:h}
R=/Users/bryandoss/muxtree/worktrees/geogenesis/benchmark-ui-load
LABEL=$1; REF=$2
SRC=$R/apps/web
if [[ -n $REF ]]; then
  SRC=$S/src-$LABEL; rm -rf $SRC; mkdir -p $SRC
  (cd $R && git archive $REF apps/web | tar -x -C $SRC --strip-components 2)
  cp $R/apps/web/.env* $SRC/ 2>/dev/null || true
fi
rsync -a --delete --exclude .next --exclude node_modules $SRC/ $R/.bench/build/
(cd $R/.bench/build && rm -rf .next && DISABLE_SENTRY=1 \
  NEXT_PUBLIC_API_ENDPOINT_TESTNET="https://testnet-api-v2.geobrowser.io/graphql" \
  NEXT_PUBLIC_GEO_CHAT_API_BASE_URL="https://chat-api-testnet.geobrowser.io" \
  ./node_modules/.bin/next build > $S/results/build-$LABEL.log 2>&1)
mkdir -p $S/builds/$LABEL && rm -rf $S/builds/$LABEL/.next
cp -Rc $R/.bench/build/.next $S/builds/$LABEL/.next
if [[ -n $REF ]]; then echo "$(cd $R && git rev-parse --short $REF)" > $S/builds/$LABEL/REF; rm -rf $SRC
else (cd $R && echo "$(git rev-parse --short HEAD) + $(git status --short apps/web | grep -vc '^??') modified files" > $S/builds/$LABEL/REF); fi
echo "built $LABEL: $(cat $S/builds/$LABEL/REF)"
