FROM php:8.2-apache

RUN a2enmod rewrite

RUN echo "upload_max_filesize = 100M\npost_max_size = 100M" > /usr/local/etc/php/conf.d/uploads.ini

RUN apt-get update && apt-get install -y \
    libzip-dev \
    unzip \
    git \
    tzdata \
    libpng-dev \
    libjpeg-dev \
    libfreetype6-dev \
    && docker-php-ext-configure gd --with-freetype --with-jpeg \
    && docker-php-ext-install pdo pdo_mysql zip gd \
    && pecl install redis \
    && docker-php-ext-enable redis

COPY --from=composer:latest /usr/bin/composer /usr/bin/composer

WORKDIR /var/www/html


RUN mkdir -p public && ln -sf ../storage/public public/storage


COPY docker/php/entrypoint.sh /usr/local/bin/entrypoint.sh


RUN sed -i 's/\r$//' /usr/local/bin/entrypoint.sh \
    && chmod +x /usr/local/bin/entrypoint.sh

RUN chown -R www-data:www-data /var/www/html


ENTRYPOINT ["/usr/local/bin/entrypoint.sh"]


CMD ["apache2-foreground"]