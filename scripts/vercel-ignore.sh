#!/bin/bash
SHA=${VERCEL_GIT_PREVIOUS_SHA:-HEAD^}
git diff "$SHA" HEAD --quiet -- apps/web/ packages/
