# Guía de Despliegue en Producción Multi-VPS - Project Rosaura

Esta guía describe cómo distribuir la infraestructura de **Project Rosaura** entre múltiples servidores virtuales privados (VPS) para lograr máxima seguridad, aislamiento y alta concurrencia.

---

## 🏗️ Topología de Arquitectura Recomendada

`
                         [ INTERNET / CLOUDFLARE ]
                                     │
                                     ▼
                ┌─────────────────────────────────────────┐
                │       VPS 1: LOAD BALANCER / EDGE       │
                │  - Nginx (Reverse Proxy + SSL)          │
                │  - Puertos Públicos: 80, 443, 8765      │
                │  - IP Privada: 10.0.0.1                 │
                └────────────────────┬────────────────────┘
                                     │ (Red Privada VPC)
        ┌────────────────────────────┼────────────────────────────┐
        ▼                            ▼                            ▼
┌────────────────────────┐  ┌────────────────────────┐  ┌────────────────────────┐
│   VPS 2: APP NODE 1    │  │   VPS 3: APP NODE 2    │  │   VPS 4: REALTIME / WS │
│ - PHP 8.2 + Apache     │  │ - PHP 8.2 + Apache     │  │ - Rust WebSocket Server│
│ - Go Microservice      │  │ - Go Microservice      │  │ - Python Workers (x4)  │
│ - IP Privada: 10.0.0.2 │  │ - IP Privada: 10.0.0.3 │  │ - IP Privada: 10.0.0.4 │
└───────────┬────────────┘  └───────────┬────────────┘  └───────────┬────────────┘
            │                           │                           │
            └───────────────────────────┼───────────────────────────┘
                                        │ (Red Privada VPC - CERO Puertos Públicos)
                                        ▼
                         ┌─────────────────────────────┐
                         │   VPS 5: DATA & STORAGE     │
                         │ - MySQL 8.0 (Relacional)    │
                         │ - Redis 7 (Caché & Sesiones)│
                         │ - Cassandra 4.1 (NoSQL Chat)│
                         │ - Typesense 26 (Búsqueda)   │
                         │ - MinIO (Almacenamiento S3) │
                         │ - IP Privada: 10.0.0.5      │
                         └─────────────────────────────┘
`

---

## 📋 Distribución de Componentes por Servidor

| Servidor | Rol Principal | Archivo Compose | Puertos Expuestos (Público / Privado) |
| :--- | :--- | :--- | :--- |
| **VPS 1** | Balanceador de Carga | deploy/docker-compose.lb.yml | **Público:** 80, 443, 8765<br>**Privado:** Salida a 10.0.0.2, 10.0.0.3, 10.0.0.4 |
| **VPS 2** | Web App (PHP + Go) | deploy/docker-compose.app.yml | **Privado:** 80 (PHP), 8080 (Go) para VPS 1 |
| **VPS 3** *(Opcional)* | Web App 2 (Escalado) | deploy/docker-compose.app.yml | **Privado:** 80 (PHP), 8080 (Go) para VPS 1 |
| **VPS 4** | WebSockets y Workers | deploy/docker-compose.workers.yml | **Privado:** 8765 (WS) para VPS 1 |
| **VPS 5** | Base de Datos & Storage | deploy/docker-compose.data.yml | **Privado:** 3306, 6379, 8108, 9000, 9001, 9042 |

> [!TIP]
> **¿Tienes menos servidores? (Opción 3 VPS):**
> * **VPS 1:** Load Balancer (docker-compose.lb.yml).
> * **VPS 2:** App PHP + Go + WebSockets + Workers (docker-compose.app.yml + docker-compose.workers.yml).
> * **VPS 3:** Data Layer (MySQL, Redis, Cassandra, Typesense, MinIO) (docker-compose.data.yml).

---

## 🛡️ Configuración de Firewall (UFW) Paso a Paso

### En VPS 1 (Load Balancer)
`ash
# Permitir SSH y tráfico web público
sudo ufw default deny incoming
sudo ufw default allow outgoing
sudo ufw allow 22/tcp
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw allow 8765/tcp
sudo ufw enable
`

### En VPS 2 y VPS 3 (Web App Nodes)
`ash
sudo ufw default deny incoming
sudo ufw default allow outgoing
sudo ufw allow 22/tcp
# Permitir tráfico HTTP/Go únicamente desde la IP privada del Load Balancer (VPS 1)
sudo ufw allow from 10.0.0.1 to any port 80 proto tcp
sudo ufw allow from 10.0.0.1 to any port 8080 proto tcp
sudo ufw enable
`

### En VPS 4 (WebSockets & Workers)
`ash
sudo ufw default deny incoming
sudo ufw default allow outgoing
sudo ufw allow 22/tcp
# Permitir WebSocket únicamente desde la IP privada del Load Balancer (VPS 1)
sudo ufw allow from 10.0.0.1 to any port 8765 proto tcp
sudo ufw enable
`

### En VPS 5 (Data & Storage)
`ash
sudo ufw default deny incoming
sudo ufw default allow outgoing
sudo ufw allow 22/tcp

# Permitir acceso a MySQL, Redis, Typesense, MinIO y Cassandra SOLO desde la red privada (10.0.0.0/24)
sudo ufw allow from 10.0.0.0/24 to any port 3306 proto tcp
sudo ufw allow from 10.0.0.0/24 to any port 6379 proto tcp
sudo ufw allow from 10.0.0.0/24 to any port 8108 proto tcp
sudo ufw allow from 10.0.0.0/24 to any port 9000 proto tcp
sudo ufw allow from 10.0.0.0/24 to any port 9001 proto tcp
sudo ufw allow from 10.0.0.0/24 to any port 9042 proto tcp
sudo ufw enable
`

---

## ⚙️ Configuración de Archivos .env por VPS

### 1. Variables para VPS 2 y VPS 3 (Web App)
En el archivo .env de cada nodo de aplicación:
`env
APP_NAME=ProjectRosaura
APP_URL=https://tudominio.com
APP_TIMEZONE=America/Mexico_City

# Conexión a VPS 5 (Datos)
DB_HOST=10.0.0.5
DB_PORT=3306
DB_USER=rosaura_user
DB_PASS=PasswordUltraSeguroSQL
DB_IDENTITY_NAME=db_identity
DB_CANVASES_NAME=db_canvases
DB_ADVERTISEMENTS_NAME=db_advertisements

# Redis en VPS 5
REDIS_HOST=10.0.0.5
REDIS_PORT=6379
REDIS_PASS=PasswordUltraSeguroRedis

# Typesense en VPS 5
TYPESENSE_HOST=10.0.0.5
TYPESENSE_PORT=8108
TYPESENSE_PROTOCOL=http
TYPESENSE_API_KEY=TypesenseSecretKey123

# MinIO en VPS 5
AWS_ENDPOINT=http://10.0.0.5:9000
AWS_ACCESS_KEY_ID=ClaveS3Privada
AWS_SECRET_ACCESS_KEY=SecretoS3Privado
AWS_BUCKET=rosaura-storage
AWS_PUBLIC_URL=https://tudominio.com/storage

# Cassandra en VPS 5
CASSANDRA_HOST=10.0.0.5
CASSANDRA_PORT=9042
CASSANDRA_KEYSPACE=db_canvases_nosql

INTERNAL_API_SECRET=SecretKeyRustToPhp999
`

### 2. Variables para VPS 4 (WebSockets & Workers)
En el archivo .env.ws:
`env
WS_PORT=8765
WS_MAX_CONNECTIONS=50000
WS_QOS_THRESHOLD=45000

REDIS_HOST=10.0.0.5
REDIS_PORT=6379
REDIS_PASS=PasswordUltraSeguroRedis

DB_HOST=10.0.0.5
DB_PORT=3306
DB_USER=rosaura_user
DB_PASS=PasswordUltraSeguroSQL
DB_CANVASES_NAME=db_canvases

PHP_API_INTERNAL_URL=http://10.0.0.2/api/index.php
INTERNAL_API_SECRET=SecretKeyRustToPhp999
`

---

## 🚀 Comandos de Arranque en Cada Servidor

1. **En VPS 5 (Data Layer):**
   `ash
   DATA_BIND_IP=10.0.0.5 docker compose -f deploy/docker-compose.data.yml up -d --build
   `

2. **En VPS 4 (Workers & WebSockets):**
   `ash
   WS_BIND_IP=10.0.0.4 docker compose -f deploy/docker-compose.workers.yml up -d --build
   `

3. **En VPS 2 / VPS 3 (Web App Nodes):**
   `ash
   APP_BIND_IP=10.0.0.2 docker compose -f deploy/docker-compose.app.yml up -d --build
   `

4. **En VPS 1 (Load Balancer):**
   `ash
   docker compose -f deploy/docker-compose.lb.yml up -d --build
   `

---

## 🔄 Verificación del Estado del Cluster
Para verificar que los servicios estén respondiendo correctamente entre sí:
`ash
# Probar conexión a MySQL desde un App Node
nc -zv 10.0.0.5 3306

# Probar conexión a Redis desde un App Node
nc -zv 10.0.0.5 6379

# Probar WebSocket desde el Load Balancer
nc -zv 10.0.0.4 8765
`
