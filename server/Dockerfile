# Builder
FROM node:20 AS client-builder
LABEL author="Andreas Sehr"
ENV BUILD_BASE_URL=/replacemeurl/
WORKDIR /usr/src/
COPY client ./

RUN npm ci && \
    node_modules/ember-cli/bin/ember build --environment='production'

# server
FROM node:lts
LABEL author="Andreas Sehr"

ENV SERVER_SALT=6548ee70d7d258e34eaf4daf9d8c30214bf8163e
ENV ADMIN_HASH=98962591ddd626a5857a82e4ad876975e71e1a9cf586ff4cc4c57eb453d172cd
ENV BASE_URL=/
ENV PORT=3000
ENV STORAGE_DIR=/mnt/sorted/
ENV CACHE_DIR=/mnt/cache/

WORKDIR /usr/src/shatabang

COPY server/*.json ./
COPY server/docker_start.sh .

# Install app dependencies
RUN npm ci && \
# Create config
  echo '{"redisHost":"redis"}' > config_server.json && \
  chmod +x docker_start.sh 

# Copy the application and client
COPY server/*.js ./
COPY server/routes routes/
COPY modules common/
COPY --from=client-builder /usr/src/dist client/dist

EXPOSE 3000
CMD ["./docker_start.sh && sh"]
