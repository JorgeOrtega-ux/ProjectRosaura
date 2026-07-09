-- Ejecuta este script en tu base de datos para habilitar el chat premium

-- 1. Añadir allow_chat a la tabla canvases
ALTER TABLE canvases ADD COLUMN allow_chat TINYINT(1) DEFAULT 0;

-- 2. Crear tabla canvas_chat_messages
CREATE TABLE IF NOT EXISTS canvas_chat_messages (
    id INT AUTO_INCREMENT PRIMARY KEY,
    canvas_id INT NOT NULL,
    user_id INT NOT NULL,
    message TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    INDEX (canvas_id),
    INDEX (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
