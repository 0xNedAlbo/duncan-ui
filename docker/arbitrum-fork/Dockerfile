FROM debian:bookworm-slim

# Tools für Install/Healthcheck
RUN apt-get update && apt-get install -y --no-install-recommends \
    ca-certificates curl bash jq git && \
    rm -rf /var/lib/apt/lists/*

# Unprivileged User
RUN useradd -ms /bin/bash foundry
USER foundry
WORKDIR /home/foundry

# Foundry (anvil) installieren
ENV PATH="/home/foundry/.foundry/bin:${PATH}"
RUN curl -L https://foundry.paradigm.xyz | bash && \
    /home/foundry/.foundry/bin/foundryup && \
    anvil --version

USER root
COPY entrypoint.sh /usr/local/bin/entrypoint.sh
RUN chmod +x /usr/local/bin/entrypoint.sh

EXPOSE 8545
ENTRYPOINT ["/usr/local/bin/entrypoint.sh"]
