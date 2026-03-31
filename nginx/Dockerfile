FROM nginx:alpine

# Instalar openssl para generación de certificados
RUN apk add --no-cache openssl

COPY nginx.conf /etc/nginx/nginx.conf

EXPOSE 443

CMD ["nginx", "-g", "daemon off;"]
