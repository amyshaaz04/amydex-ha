FROM node:24-bookworm-slim AS frp
ARG TARGETARCH
COPY download-frpc.mjs /tmp/download-frpc.mjs
RUN cd /tmp && node download-frpc.mjs && tar -xzf frp.tar.gz && install -m 755 /tmp/frp_*_linux_*/frpc /usr/local/bin/frpc

FROM node:24-bookworm-slim
WORKDIR /app
COPY --from=frp /usr/local/bin/frpc /usr/local/bin/frpc
COPY start.mjs ./
ENTRYPOINT ["node", "/app/start.mjs"]
