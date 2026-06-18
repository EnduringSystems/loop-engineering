FROM python:3.12-slim

RUN apt-get update && apt-get install -y --no-install-recommends \
      curl gnupg \
  && curl -fsSL https://deb.nodesource.com/setup_22.x | bash - \
  && apt-get install -y --no-install-recommends nodejs \
  && rm -rf /var/lib/apt/lists/*

WORKDIR /workspace

# Copy source and install editable at build time.
# The volume mount at runtime overlays the same paths, so live edits
# take effect without rebuilding — editable metadata stays valid.
COPY packages/core/ packages/core/
COPY packages/cli/  packages/cli/
RUN pip install --no-cache-dir -e packages/core -e packages/cli

CMD ["loopctl"]
