FROM python:3.12-slim AS base

# System packages: Node.js for the web dashboard (installed once, used later)
RUN apt-get update && apt-get install -y --no-install-recommends \
      curl \
      gnupg \
  && curl -fsSL https://deb.nodesource.com/setup_22.x | bash - \
  && apt-get install -y --no-install-recommends nodejs \
  && rm -rf /var/lib/apt/lists/*

WORKDIR /workspace

# Install Python packages in editable mode.
# Source code is mounted at runtime so no COPY of the packages is needed —
# just install the pyproject.toml metadata layer first for caching.
COPY packages/core/pyproject.toml  /tmp/core/pyproject.toml
COPY packages/cli/pyproject.toml   /tmp/cli/pyproject.toml

# Minimal stub so pip can resolve dependencies without full source.
RUN mkdir -p /tmp/core/lecore /tmp/cli/loopctl \
  && touch /tmp/core/lecore/__init__.py /tmp/cli/loopctl/__init__.py \
  && pip install --no-cache-dir \
       "rich>=13.0" \
       "typer>=0.12"

# The actual packages are installed editable from the mounted workspace.
# docker-compose runs `pip install -e packages/core -e packages/cli` via
# the command override so live edits take effect without rebuilding.

ENTRYPOINT []
CMD ["bash"]
