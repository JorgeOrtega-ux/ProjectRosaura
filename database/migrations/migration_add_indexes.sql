USE db_canvases;

ALTER TABLE canvas_chat_messages 
ADD INDEX idx_canvas_id_desc (canvas_id, id DESC);

ALTER TABLE canvas_favorites
ADD INDEX idx_user_created (user_id, created_at DESC);
