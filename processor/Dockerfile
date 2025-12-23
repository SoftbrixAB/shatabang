FROM node:22

ENV STORAGE_DIR=/mnt/sorted/
ENV CACHE_DIR=/mnt/cache/
ENV SERVER_DIR=/app
ENV CLIENT_DIR=/app/client

WORKDIR /app

RUN apt-get update && apt-get install -y --no-install-recommends \
  libimage-exiftool-perl \
  libvips-dev \
  ffmpeg \
  libgtk2.0-dev \
  libavcodec-dev \
  libavformat-dev \
  libswscale-dev && \
# Cleaning up
  apt autoremove -y && \
  rm -rf /var/lib/apt/lists/* 

# Create app directories
RUN  mkdir -p $STORAGE_DIR $CACHE_DIR $CLIENT_DIR

COPY processor/*.json ./

# Install app dependencies whitout removing node_modules folder
RUN npm install --only=production 

COPY processor/*.js ./
COPY processor/modules ./modules
COPY processor/common ./common
COPY processor/workers ./workers

# Create config
RUN echo '{"redisHost":"redis"}' > config_server.json 

# USER node

CMD ["node", "main.js"]
