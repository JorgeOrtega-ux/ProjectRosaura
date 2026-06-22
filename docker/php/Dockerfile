FROM php:8.2-apache

RUN a2enmod rewrite

RUN apt-get update && apt-get install -y \
    libzip-dev \
    unzip \
    git \
    tzdata \
    libpng-dev \
    libjpeg-dev \
    libfreetype6-dev \
    && docker-php-ext-configure gd --with-freetype --with-jpeg \
    && docker-php-ext-install pdo pdo_mysql zip gd

COPY --from=composer:latest /usr/bin/composer /usr/bin/composer

WORKDIR /var/www/html

# Crear el enlace simbólico dinámico para que 'public/storage' apunte a 'storage/public'
RUN mkdir -p public && ln -sf ../storage/public public/storage

# Copiar el script de arranque al contenedor
COPY docker/php/entrypoint.sh /usr/local/bin/entrypoint.sh

# TRUCO PARA WINDOWS: Eliminar los retornos de carro (CRLF a LF) para que Linux no explote y dar permisos de ejecución
RUN sed -i 's/\r$//' /usr/local/bin/entrypoint.sh \
    && chmod +x /usr/local/bin/entrypoint.sh

RUN chown -R www-data:www-data /var/www/html

# Establecer el script como el punto de entrada principal
ENTRYPOINT ["/usr/local/bin/entrypoint.sh"]

# Iniciar Apache
CMD ["apache2-foreground"]