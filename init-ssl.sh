#!/bin/bash
# Script to obtain Let's Encrypt SSL certificate for rent.txlcomp.co.il
# Run this on the server after docker compose up

DOMAIN="rent.txlcomp.co.il"
EMAIL="admin@txlcomp.co.il"

# Install certbot if not present
if ! command -v certbot &> /dev/null; then
    echo "Installing certbot..."
    apt-get update && apt-get install -y certbot
fi

# Get the certbot-webroot volume mount path
WEBROOT=$(docker volume inspect txlrent_certbot-webroot -f '{{.Mountpoint}}')
CERTDIR=$(docker volume inspect txlrent_certbot-certs -f '{{.Mountpoint}}')

echo "Webroot: $WEBROOT"
echo "Cert dir: $CERTDIR"

# Obtain certificate using webroot method
certbot certonly --webroot \
    -w "$WEBROOT" \
    -d "$DOMAIN" \
    --email "$EMAIL" \
    --agree-tos \
    --non-interactive

# Copy certs to the docker volume
cp /etc/letsencrypt/live/$DOMAIN/fullchain.pem "$CERTDIR/fullchain.pem"
cp /etc/letsencrypt/live/$DOMAIN/privkey.pem "$CERTDIR/privkey.pem"

# Reload nginx
docker exec txlrent-frontend-1 nginx -s reload

echo "SSL certificate installed for $DOMAIN"
echo ""
echo "To auto-renew, add this cron job:"
echo "0 3 * * * certbot renew --quiet && cp /etc/letsencrypt/live/$DOMAIN/fullchain.pem $CERTDIR/fullchain.pem && cp /etc/letsencrypt/live/$DOMAIN/privkey.pem $CERTDIR/privkey.pem && docker exec txlrent-frontend-1 nginx -s reload"
