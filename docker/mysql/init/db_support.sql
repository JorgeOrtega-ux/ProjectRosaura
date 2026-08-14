-- ==========================================================
-- Database Schema for Technical Support & Live Chat Module
-- ProjectRosaura - db_support
-- ==========================================================

CREATE DATABASE IF NOT EXISTS db_support;

USE db_support;

-- --------------------------------------------------------
-- Table: support_tickets
-- --------------------------------------------------------
CREATE TABLE IF NOT EXISTS `support_tickets` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `uuid` CHAR(36) NOT NULL,
  `user_id` INT(11) NOT NULL,
  `category` VARCHAR(50) NOT NULL DEFAULT 'general',
  `subject` VARCHAR(200) NOT NULL,
  `message` TEXT NOT NULL,
  `status` ENUM('open', 'in_progress', 'resolved', 'closed') NOT NULL DEFAULT 'open',
  `priority` ENUM('low', 'medium', 'high', 'urgent') NOT NULL DEFAULT 'medium',
  `ip_address` VARCHAR(45) DEFAULT NULL,
  `user_agent` TEXT DEFAULT NULL,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `idx_support_tickets_uuid` (`uuid`),
  KEY `idx_support_tickets_user_id` (`user_id`),
  KEY `idx_support_tickets_status` (`status`),
  KEY `idx_support_tickets_created_at` (`created_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------
-- Table: support_chat_sessions
-- --------------------------------------------------------
CREATE TABLE IF NOT EXISTS `support_chat_sessions` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `uuid` CHAR(36) NOT NULL UNIQUE,
  `user_id` INT(11) DEFAULT NULL,
  `department_level` ENUM('l1', 'l2', 'l3') NOT NULL DEFAULT 'l1',
  `status` ENUM('waiting_in_queue', 'active', 'escalated', 'closed', 'abandoned') NOT NULL DEFAULT 'waiting_in_queue',
  `assigned_agent_id` INT(11) DEFAULT NULL,
  `category` VARCHAR(50) NOT NULL DEFAULT 'general',
  `language` VARCHAR(10) NOT NULL DEFAULT 'es-419',
  `subject` VARCHAR(200) NOT NULL,
  `initial_message` TEXT DEFAULT NULL,
  `priority` ENUM('low', 'medium', 'high', 'urgent') NOT NULL DEFAULT 'medium',
  `started_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `accepted_at` TIMESTAMP NULL DEFAULT NULL,
  `closed_at` TIMESTAMP NULL DEFAULT NULL,
  `closed_by` ENUM('user', 'agent', 'system', 'timeout') DEFAULT NULL,
  `resolution_summary` TEXT DEFAULT NULL,
  `user_rating` TINYINT DEFAULT NULL,
  `user_feedback` TEXT DEFAULT NULL,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_scs_user_id` (`user_id`),
  KEY `idx_scs_agent_id` (`assigned_agent_id`),
  KEY `idx_scs_status_level` (`status`, `department_level`),
  KEY `idx_scs_created_at` (`created_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------
-- Table: support_chat_messages
-- --------------------------------------------------------
CREATE TABLE IF NOT EXISTS `support_chat_messages` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `uuid` CHAR(36) NOT NULL UNIQUE,
  `session_id` BIGINT UNSIGNED NOT NULL,
  `sender_type` ENUM('user', 'agent', 'system', 'internal_note') NOT NULL,
  `sender_id` INT(11) DEFAULT NULL,
  `sender_name` VARCHAR(100) NOT NULL,
  `message` TEXT NOT NULL,
  `attachments` JSON DEFAULT NULL,
  `is_internal` TINYINT(1) NOT NULL DEFAULT 0,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_scm_session_id` (`session_id`),
  KEY `idx_scm_created_at` (`created_at`),
  KEY `idx_scm_sender_id` (`sender_id`),
  CONSTRAINT `fk_scm_session` FOREIGN KEY (`session_id`) REFERENCES `support_chat_sessions`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------
-- Table: support_chat_transfers
-- --------------------------------------------------------
CREATE TABLE IF NOT EXISTS `support_chat_transfers` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `session_id` BIGINT UNSIGNED NOT NULL,
  `from_agent_id` INT(11) DEFAULT NULL,
  `to_agent_id` INT(11) DEFAULT NULL,
  `from_level` ENUM('l1', 'l2', 'l3') NOT NULL,
  `to_level` ENUM('l1', 'l2', 'l3') NOT NULL,
  `reason` VARCHAR(255) NOT NULL,
  `internal_note` TEXT DEFAULT NULL,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_sct_session_id` (`session_id`),
  KEY `idx_sct_from_agent` (`from_agent_id`),
  KEY `idx_sct_to_agent` (`to_agent_id`),
  CONSTRAINT `fk_sct_session` FOREIGN KEY (`session_id`) REFERENCES `support_chat_sessions`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------
-- Table: support_agent_status
-- --------------------------------------------------------
CREATE TABLE IF NOT EXISTS `support_agent_status` (
  `agent_id` INT(11) NOT NULL,
  `status` ENUM('online', 'busy', 'away', 'offline') NOT NULL DEFAULT 'offline',
  `current_active_chats` INT NOT NULL DEFAULT 0,
  `max_concurrent_chats` INT NOT NULL DEFAULT 3,
  `level` ENUM('l1', 'l2', 'l3') NOT NULL DEFAULT 'l1',
  `last_heartbeat` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`agent_id`),
  KEY `idx_sas_status_level` (`status`, `level`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------
-- Table: support_canned_responses
-- --------------------------------------------------------
CREATE TABLE IF NOT EXISTS `support_canned_responses` (
  `id` INT(11) NOT NULL AUTO_INCREMENT,
  `uuid` CHAR(36) NOT NULL UNIQUE,
  `shortcut` VARCHAR(50) NOT NULL,
  `title` VARCHAR(100) NOT NULL,
  `content` TEXT NOT NULL,
  `category` VARCHAR(50) NOT NULL DEFAULT 'general',
  `language` VARCHAR(10) NOT NULL DEFAULT 'es-419',
  `min_level` ENUM('l1', 'l2', 'l3') NOT NULL DEFAULT 'l1',
  `created_by` INT(11) DEFAULT NULL,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_scr_category` (`category`),
  KEY `idx_scr_language` (`language`),
  KEY `idx_scr_created_by` (`created_by`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------
-- Seed Data: Canned Responses Multilingual
-- --------------------------------------------------------
INSERT IGNORE INTO `support_canned_responses` (`id`, `uuid`, `shortcut`, `title`, `content`, `category`, `language`, `min_level`) VALUES
  -- Español (Latinoamérica)
  (1, UUID(), 'saludo', 'Saludo Inicial de Soporte', '¡Hola! Gracias por comunicarte con el equipo de soporte técnico de Rosaura. ¿En qué podemos colaborarte hoy?', 'general', 'es-419', 'l1'),
  (2, UUID(), 'pedir_captura', 'Solicitud de Captura de Pantalla', 'Para poder analizar tu caso en detalle, ¿podrías adjuntarnos una captura o describir exactamente el paso a paso donde ocurre el error?', 'technical', 'es-419', 'l1'),
  (3, UUID(), 'escalar_l2', 'Aviso de Transferencia Especializada', 'He verificado tu caso y para brindarte una solución más ágil lo he transferido a un Especialista de Nivel 2. Por favor mantente en línea mientras revisamos tu expediente.', 'technical', 'es-419', 'l1'),
  (4, UUID(), 'escalar_l3', 'Aviso de Transferencia a Supervisión', 'Tu caso ha sido escalado al Departamento de Supervisión e Ingeniería (Nivel 3). Estamos investigando a fondo la incidencia en el servidor.', 'technical', 'es-419', 'l2'),
  (5, UUID(), 'despedida', 'Despedida y Cierre', 'Ha sido un placer ayudarte. Si tienes alguna otra duda o consulta adicional no dudes en escribirnos nuevamente. ¡Que tengas un excelente día!', 'general', 'es-419', 'l1'),

  -- Español (México)
  (6, UUID(), 'saludo', 'Saludo Inicial de Soporte', '¡Hola! Gracias por comunicarte con el equipo de soporte técnico de Rosaura. ¿En qué te podemos ayudar hoy?', 'general', 'es-MX', 'l1'),
  (7, UUID(), 'pedir_captura', 'Solicitud de Captura de Pantalla', 'Para analizar tu caso con mayor detalle, ¿nos podrías compartir una captura o explicar los pasos exactos donde se presenta la falla?', 'technical', 'es-MX', 'l1'),
  (8, UUID(), 'escalar_l2', 'Aviso de Transferencia Especializada', 'Revisé tu caso y para darte una solución rápida lo transferí con un Especialista de Nivel 2. Por favor mantente en línea mientras lo revisamos.', 'technical', 'es-MX', 'l1'),
  (9, UUID(), 'escalar_l3', 'Aviso de Transferencia a Supervisión', 'Tu caso fue escalado al Departamento de Supervisión e Ingeniería (Nivel 3). Estamos revisando la situación en el servidor.', 'technical', 'es-MX', 'l2'),
  (10, UUID(), 'despedida', 'Despedida y Cierre', 'Fue un gusto atenderte. Si tienes más dudas estamos para servirte. ¡Que tengas un excelente día!', 'general', 'es-MX', 'l1'),

  -- Español (España)
  (11, UUID(), 'saludo', 'Saludo Inicial de Soporte', '¡Hola! Gracias por contactar con el soporte técnico de Rosaura. ¿En qué te podemos ayudar hoy?', 'general', 'es-ES', 'l1'),
  (12, UUID(), 'pedir_captura', 'Solicitud de Captura de Pantalla', 'Para estudiar tu incidencia con detalle, ¿podrías facilitarnos una captura de pantalla o describir los pasos en los que sucede el error?', 'technical', 'es-ES', 'l1'),
  (13, UUID(), 'escalar_l2', 'Aviso de Transferencia Especializada', 'He revisado tu caso y lo he transferido a un Especialista de Nivel 2 para gestionarlo con mayor rapidez. Por favor, permanece a la espera.', 'technical', 'es-ES', 'l1'),
  (14, UUID(), 'escalar_l3', 'Aviso de Transferencia a Supervisión', 'Tu caso ha sido escalado al Departamento de Supervisión e Ingeniería (Nivel 3). Estamos analizando la incidencia técnica en el servidor.', 'technical', 'es-ES', 'l2'),
  (15, UUID(), 'despedida', 'Despedida y Cierre', 'Ha sido un placer ayudarte. Si necesitas cualquier otra cosa, no dudes en escribirnos de nuevo. ¡Un saludo cordial!', 'general', 'es-ES', 'l1'),

  -- English (United States)
  (16, UUID(), 'greeting', 'Initial Support Greeting', 'Hello! Thank you for reaching out to Rosaura technical support team. How may we assist you today?', 'general', 'en-US', 'l1'),
  (17, UUID(), 'request_screenshot', 'Request Screenshot / Details', 'In order to investigate your case in detail, could you please provide a screenshot or describe the exact steps where the error occurs?', 'technical', 'en-US', 'l1'),
  (18, UUID(), 'escalate_l2', 'Transfer to Tier 2 Support', 'I have reviewed your case and transferred it to a Tier 2 Support Specialist for faster resolution. Please stay on the line while we review your details.', 'technical', 'en-US', 'l1'),
  (19, UUID(), 'escalate_l3', 'Transfer to Supervision / Engineering', 'Your case has been escalated to Engineering and Supervision (Tier 3). We are investigating the server issue in depth.', 'technical', 'en-US', 'l2'),
  (20, UUID(), 'farewell', 'Farewell and Closure', 'It has been a pleasure assisting you. If you have any further questions, please do not hesitate to contact us again. Have a great day!', 'general', 'en-US', 'l1'),

  -- English (United Kingdom)
  (21, UUID(), 'greeting', 'Initial Support Greeting', 'Hello! Thank you for getting in touch with Rosaura technical support. How may we help you today?', 'general', 'en-GB', 'l1'),
  (22, UUID(), 'request_screenshot', 'Request Screenshot / Details', 'To help us investigate your enquiry thoroughly, could you please supply a screenshot or clarify the precise steps leading to the error?', 'technical', 'en-GB', 'l1'),
  (23, UUID(), 'escalate_l2', 'Transfer to Tier 2 Support', 'I have assessed your case and escalated it to a Tier 2 Specialist for priority resolution. Please kindly remain connected.', 'technical', 'en-GB', 'l1'),
  (24, UUID(), 'escalate_l3', 'Transfer to Supervision / Engineering', 'Your case has been escalated to our Engineering and Operations team (Tier 3). We are investigating the matter on the server.', 'technical', 'en-GB', 'l2'),
  (25, UUID(), 'farewell', 'Farewell and Closure', 'It has been our pleasure to assist you. If you require further assistance, please feel free to reach out. Have a wonderful day!', 'general', 'en-GB', 'l1'),

  -- Français (France)
  (26, UUID(), 'salutation', 'Salutation Initiale du Support', 'Bonjour ! Merci d''avoir contacté le support technique de Rosaura. Comment pouvons-nous vous aider aujourd''hui ?', 'general', 'fr-FR', 'l1'),
  (27, UUID(), 'demander_capture', 'Demande de Capture d''Écran', 'Afin d''analyser votre demande en détail, pourriez-vous nous transmettre une capture d''écran ou décrire les étapes exactes où l''erreur survient ?', 'technical', 'fr-FR', 'l1'),
  (28, UUID(), 'escalader_n2', 'Transfert vers Spécialiste Niveau 2', 'J''ai examiné votre dossier et l''ai transmis à un Spécialiste Niveau 2 pour un traitement plus rapide. Veuillez patienter en ligne.', 'technical', 'fr-FR', 'l1'),
  (29, UUID(), 'escalader_n3', 'Transfert vers Supervision et Ingénierie', 'Votre demande a été transmise à notre équipe d''ingénierie (Niveau 3). Nous étudions l''incident sur les serveurs.', 'technical', 'fr-FR', 'l2'),
  (30, UUID(), 'remerciement', 'Clôture et Remerciement', 'Ce fut un plaisir de vous aider. Si vous avez d''autres questions, n''hésitez pas à nous recontacter. Excellente journée à vous !', 'general', 'fr-FR', 'l1'),

  -- Deutsch (Deutschland)
  (31, UUID(), 'begruessung', 'Support-Begrüßung', 'Hallo! Vielen Dank, dass Sie sich an den technischen Support von Rosaura wenden. Wie können wir Ihnen heute helfen?', 'general', 'de-DE', 'l1'),
  (32, UUID(), 'screenshot_anfordern', 'Screenshot anfordern', 'Um Ihren Fall genau zu prüfen, senden Sie uns bitte einen Screenshot oder beschreiben Sie die genauen Schritte, bei denen der Fehler auftritt.', 'technical', 'de-DE', 'l1'),
  (33, UUID(), 'weiterleitung_l2', 'Weiterleitung an Level-2-Spezialisten', 'Ich habe Ihren Vorgang geprüft und an einen Level-2-Spezialisten weitergeleitet. Bitte bleiben Sie kurz in der Leitung.', 'technical', 'de-DE', 'l1'),
  (34, UUID(), 'weiterleitung_l3', 'Eskalation an Supervision / IT', 'Ihr Anliegen wurde an unser Engineering-Team (Level 3) eskaliert. Wir untersuchen das Problem auf dem Server.', 'technical', 'de-DE', 'l2'),
  (35, UUID(), 'verabschiedung', 'Abschluss und Verabschiedung', 'Es war uns ein Vergnügen, Ihnen zu helfen. Bei weiteren Fragen stehen wir Ihnen gerne zur Verfügung. Einen schönen Tag noch!', 'general', 'de-DE', 'l1'),

  -- Italiano (Italia)
  (36, UUID(), 'saluto', 'Saluto Iniziale Supporto', 'Ciao! Grazie per aver contattato l''assistenza tecnica di Rosaura. Come possiamo aiutarti oggi?', 'general', 'it-IT', 'l1'),
  (37, UUID(), 'richiesta_screenshot', 'Richiesta Screenshot / Dettagli', 'Per poter analizzare la tua richiesta in dettaglio, potresti allegare uno screenshot o descrivere i passaggi in cui si verifica l''errore?', 'technical', 'it-IT', 'l1'),
  (38, UUID(), 'trasferimento_l2', 'Trasferimento a Specialista Livello 2', 'Ho verificato il tuo caso e l''ho trasferito a uno Specialista di Livello 2 per una risoluzione rapida. Ti preghiamo di rimanere in linea.', 'technical', 'it-IT', 'l1'),
  (39, UUID(), 'trasferimento_l3', 'Trasferimento a Ingegneria / Livello 3', 'Il tuo caso è stato inoltrato al Reparto Ingegneria (Livello 3). Stiamo analizzando l''anomalia sul server.', 'technical', 'it-IT', 'l2'),
  (40, UUID(), 'congedo', 'Chiusura e Saluti', 'È stato un piacere aiutarti. Se hai altre domande, non esitare a contattarci di nuevo. Buona giornata!', 'general', 'it-IT', 'l1'),

  -- Português (Brasil)
  (41, UUID(), 'saudacao', 'Saudação Inicial de Suporte', 'Olá! Obrigado por entrar em contato com o suporte técnico da Rosaura. Como podemos ajudar você hoje?', 'general', 'pt-BR', 'l1'),
  (42, UUID(), 'pedir_print', 'Solicitação de Captura de Tela', 'Para que possamos analisar seu caso detalhadamente, você poderia nos enviar um print ou descrever o passo a passo exato do erro?', 'technical', 'pt-BR', 'l1'),
  (43, UUID(), 'escalar_n2', 'Transferência para Nível 2', 'Verifiquei seu caso e o transferi para um Especialista de Nível 2 para agilizar o atendimento. Por favor, aguarde em linha.', 'technical', 'pt-BR', 'l1'),
  (44, UUID(), 'escalar_n3', 'Transferência para Engenharia (Nível 3)', 'Seu caso foi encaminhado ao time de Engenharia e Supervisão (Nível 3). Estamos investigando a ocorrência no servidor.', 'technical', 'pt-BR', 'l2'),
  (45, UUID(), 'despedida', 'Encerramento e Despedida', 'Foi um prazer ajudar você! Se tiver qualquer outra dúvida, fique à vontade para nos chamar novamente. Tenha um excelente dia!', 'general', 'pt-BR', 'l1'),

  -- Português (Portugal)
  (46, UUID(), 'saudacao', 'Saudação Inicial de Suporte', 'Olá! Obrigado por contactar o suporte técnico da Rosaura. Em que lhe podemos ser úteis hoje?', 'general', 'pt-PT', 'l1'),
  (47, UUID(), 'pedir_captura', 'Solicitação de Captura de Ecrã', 'Para podermos analisar a sua questão em pormenor, podría enviar-nos uma captura de ecrã ou descrever os passos exatos em que ocorre o erro?', 'technical', 'pt-PT', 'l1'),
  (48, UUID(), 'escalar_n2', 'Transferência para Nível 2', 'Analisei o seu caso e encaminhei-o para um Especialista de Nível 2 para um tratamento mais célere. Por favor, aguarde em linha.', 'technical', 'pt-PT', 'l1'),
  (49, UUID(), 'escalar_n3', 'Transferência para Engenharia (Nível 3)', 'O seu caso foi escalado para a equipa de Engenharia e Supervisão (Nível 3). Estamos a averiguar a anomalia no servidor.', 'technical', 'pt-PT', 'l2'),
  (50, UUID(), 'despedida', 'Encerramento e Despedida', 'Foi um gosto prestar-lhe assistência. Se necessitar de mais algum esclarecimento, não hesite em contactar-nos. Tenha um ótimo dia!', 'general', 'pt-PT', 'l1');
