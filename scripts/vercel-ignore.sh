#!/bin/bash
set -euo pipefail

cd "$(git rev-parse --show-toplevel)"

PREVIOUS_SHA=${VERCEL_GIT_PREVIOUS_SHA:-}

if [[ -z "$PREVIOUS_SHA" ]] || ! git cat-file -e "$PREVIOUS_SHA^{commit}" 2>/dev/null; then
  if git rev-parse --verify HEAD^ >/dev/null 2>&1; then
    PREVIOUS_SHA="HEAD^"
  else
    exit 1
  fi
fi

git diff "$PREVIOUS_SHA" HEAD --quiet -- ":(top)apps/web" ":(top)packages"
