FROM nginx:alpine

# Copiamos nuestras apps Angular a la raíz del servidor
COPY dist/mundial/browser /var/www/mundial
# Copiamos la configuración personalizada de nginx
COPY nginx-default.conf /etc/nginx/conf.d/default.conf

EXPOSE 80
