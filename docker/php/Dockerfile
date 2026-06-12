FROM php:8.2-apache

# Habilitar mod_rewrite de Apache
RUN a2enmod rewrite

# Instalar dependencias del sistema y extensiones de PHP (Se agregaron librerías para GD)
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

# Instalar Composer globalmente
COPY --from=composer:latest /usr/bin/composer /usr/bin/composer

# Configurar el directorio de trabajo
WORKDIR /var/www/html

# Dar permisos a las carpetas de almacenamiento y logs
RUN chown -R www-data:www-data /var/www/html