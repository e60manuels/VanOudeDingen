#!/bin/bash

# Deployment Skill Script with Semantic Versioning
# Path: /scripts/deploy.sh

VERSION_FILE="VERSION"
SW_FILE="bestanden/pwa/sw.js"
MANIFEST_FILE="bestanden/pwa/manifest.json"
CHANGELOG_FILE="CHANGELOG.md"

# 1. READ CURRENT VERSION
if [ ! -f "$VERSION_FILE" ]; then
    echo "1.0.0" > "$VERSION_FILE"
fi
CURRENT_VERSION=$(cat "$VERSION_FILE")

# 2. CALCULATE NEW VERSION
BUMP_TYPE=${1:-patch} # default to patch
IFS='.' read -r major minor patch <<< "$CURRENT_VERSION"

case $BUMP_TYPE in
  major)
    major=$((major + 1))
    minor=0
    patch=0
    ;;
  minor)
    minor=$((minor + 1))
    patch=0
    ;;
  patch)
    patch=$((patch + 1))
    ;;
  rollback)
    echo "Rolling back Firebase Hosting..."
    firebase hosting:rollback
    # Note: Git revert/rollback is manual to avoid data loss
    exit 0
    ;;
  *)
    echo "Usage: ./scripts/deploy.sh [patch|minor|major|rollback]"
    exit 1
    ;;
esac

NEW_VERSION="$major.$minor.$patch"
echo "Bumping version from $CURRENT_VERSION to $NEW_VERSION ($BUMP_TYPE)"

# 3. UPDATE VERSION FILE
echo "$NEW_VERSION" > "$VERSION_FILE"

# 4. SERVICE WORKER CACHE BUSTING
# Update: const VERSION = '...'; to const VERSION = '[new-version]';
sed -i "s/const VERSION = '.*';/const VERSION = '$NEW_VERSION';/" "$SW_FILE"

# 5. MANIFEST VERSION
# Update: "version": "...",
if [ -f "$MANIFEST_FILE" ]; then
    sed -i "s/\"version\": \".*\"/\"version\": \"$NEW_VERSION\"/" "$MANIFEST_FILE"
fi

# 5b. INDEX VERSION
# Update: <span id="appVersion">v...</span>
sed -i "s/<span id=\"appVersion\">v.*<\/span>/<span id=\"appVersion\">v$NEW_VERSION<\/span>/" "bestanden/pwa/index.html"

# 6. CHANGELOG
DATE=$(date +"%Y-%m-%d %H:%M:%S")
LAST_MSG=$(git log -1 --pretty=%B)
echo "## v$NEW_VERSION ($DATE)" >> "$CHANGELOG_FILE"
echo "Type: $BUMP_TYPE" >> "$CHANGELOG_FILE"
echo "Description: $LAST_MSG" >> "$CHANGELOG_FILE"
echo "" >> "$CHANGELOG_FILE"

# 7. GIT TAGGING
git add .
git commit -m "Release v$NEW_VERSION"
git tag "v$NEW_VERSION"
git push && git push --tags

echo "Release v$NEW_VERSION created and tagged. GitHub Actions will now handle the deployment!"
