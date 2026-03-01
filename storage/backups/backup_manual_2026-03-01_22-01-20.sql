-- MariaDB dump 10.19  Distrib 10.4.32-MariaDB, for Win64 (AMD64)
--
-- Host: localhost    Database: projectrosaura
-- ------------------------------------------------------
-- Server version	10.4.32-MariaDB

/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8mb4 */;
/*!40103 SET @OLD_TIME_ZONE=@@TIME_ZONE */;
/*!40103 SET TIME_ZONE='+00:00' */;
/*!40014 SET @OLD_UNIQUE_CHECKS=@@UNIQUE_CHECKS, UNIQUE_CHECKS=0 */;
/*!40014 SET @OLD_FOREIGN_KEY_CHECKS=@@FOREIGN_KEY_CHECKS, FOREIGN_KEY_CHECKS=0 */;
/*!40101 SET @OLD_SQL_MODE=@@SQL_MODE, SQL_MODE='NO_AUTO_VALUE_ON_ZERO' */;
/*!40111 SET @OLD_SQL_NOTES=@@SQL_NOTES, SQL_NOTES=0 */;

--
-- Table structure for table `auth_tokens`
--

DROP TABLE IF EXISTS `auth_tokens`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `auth_tokens` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `user_id` int(11) NOT NULL,
  `selector` varchar(255) NOT NULL,
  `hashed_validator` varchar(255) NOT NULL,
  `expires_at` datetime NOT NULL,
  `user_agent` varchar(255) DEFAULT NULL,
  `ip_address` varchar(45) DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `fk_user_tokens` (`user_id`),
  KEY `selector` (`selector`),
  CONSTRAINT `fk_user_tokens` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=20 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `auth_tokens`
--

LOCK TABLES `auth_tokens` WRITE;
/*!40000 ALTER TABLE `auth_tokens` DISABLE KEYS */;
INSERT INTO `auth_tokens` VALUES (15,1,'7d8977e15057721f58b2a243d065c979','45a058d59900844e2cb93e25f5e63074fa332066d2c7c676b2631f11b4e7c75b','2026-03-31 04:26:57','Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Safari/537.36','192.168.1.158'),(19,1,'aa6d9acb03c01533821acaa0bcd70288','f7223419d7b524bdf7ef7d016df30d7efdacabad0d25b7119ac8370cb90e82cb','2026-03-31 22:36:50','Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Safari/537.36','192.168.8.2');
/*!40000 ALTER TABLE `auth_tokens` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `moderation_logs`
--

DROP TABLE IF EXISTS `moderation_logs`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `moderation_logs` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `user_id` int(11) NOT NULL,
  `admin_id` int(11) DEFAULT NULL,
  `action_type` enum('suspended','unsuspended','deleted','restored','note_updated') NOT NULL,
  `reason` text DEFAULT NULL,
  `end_date` datetime DEFAULT NULL,
  `admin_notes` text DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id`),
  KEY `fk_mod_log_user` (`user_id`),
  KEY `fk_mod_log_admin` (`admin_id`),
  CONSTRAINT `fk_mod_log_admin` FOREIGN KEY (`admin_id`) REFERENCES `users` (`id`) ON DELETE SET NULL,
  CONSTRAINT `fk_mod_log_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=15 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `moderation_logs`
--

LOCK TABLES `moderation_logs` WRITE;
/*!40000 ALTER TABLE `moderation_logs` DISABLE KEYS */;
INSERT INTO `moderation_logs` VALUES (1,2,1,'suspended','Uso indebido o fraudulento del servicio','2026-03-14 22:01:00','TEST','2026-03-01 04:01:34'),(2,2,1,'unsuspended',NULL,NULL,'TEST','2026-03-01 04:02:33'),(3,2,1,'note_updated',NULL,NULL,'CAS','2026-03-01 05:06:57'),(4,2,1,'note_updated',NULL,NULL,'AS','2026-03-01 05:06:59'),(5,2,1,'note_updated',NULL,NULL,'T','2026-03-01 05:16:50'),(6,2,1,'note_updated',NULL,NULL,'T','2026-03-01 05:16:51'),(7,2,1,'note_updated',NULL,NULL,'T','2026-03-01 05:16:52'),(8,2,1,'note_updated',NULL,NULL,'T','2026-03-01 05:16:53'),(9,2,1,'note_updated',NULL,NULL,'T','2026-03-01 05:16:54'),(10,2,1,'note_updated',NULL,NULL,'T','2026-03-01 05:16:55'),(11,2,1,'note_updated',NULL,NULL,'T','2026-03-01 05:16:56'),(12,2,1,'note_updated',NULL,NULL,'T','2026-03-01 05:16:56'),(13,2,1,'note_updated',NULL,NULL,'T','2026-03-01 05:16:57'),(14,2,1,'note_updated',NULL,NULL,'T','2026-03-01 05:16:58');
/*!40000 ALTER TABLE `moderation_logs` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `profile_changes_log`
--

DROP TABLE IF EXISTS `profile_changes_log`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `profile_changes_log` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `user_id` int(11) NOT NULL,
  `change_type` enum('avatar','username','email','password','2fa') NOT NULL,
  `old_value` varchar(255) DEFAULT NULL,
  `new_value` varchar(255) DEFAULT NULL,
  `ip_address` varchar(45) NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id`),
  KEY `user_id` (`user_id`),
  KEY `change_type` (`change_type`),
  KEY `created_at` (`created_at`),
  CONSTRAINT `fk_user_profile_log` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=21 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `profile_changes_log`
--

LOCK TABLES `profile_changes_log` WRITE;
/*!40000 ALTER TABLE `profile_changes_log` DISABLE KEYS */;
INSERT INTO `profile_changes_log` VALUES (11,1,'avatar','public/storage/profilePictures/default/3b9475a1-65c1-40d2-95f4-1dcbc5cb2ef2.png','public/storage/profilePictures/uploaded/59de2835-82c6-4f2c-b324-0c98cf4eeaa4.png','192.168.1.158','2026-02-24 17:00:56'),(12,1,'avatar','public/storage/profilePictures/uploaded/59de2835-82c6-4f2c-b324-0c98cf4eeaa4.png','public/storage/profilePictures/default/3b9475a1-65c1-40d2-95f4-1dcbc5cb2ef2.png','192.168.1.158','2026-02-24 17:01:01'),(13,1,'avatar','public/storage/profilePictures/default/3b9475a1-65c1-40d2-95f4-1dcbc5cb2ef2.png','public/storage/profilePictures/uploaded/f963e67d-bd9e-4ba2-9a52-a461be4d3460.png','192.168.1.158','2026-02-25 20:29:19'),(14,1,'2fa','disabled','enabled','192.168.1.158','2026-02-26 06:31:11'),(15,1,'2fa','enabled','disabled','192.168.1.158','2026-02-26 06:42:15'),(16,1,'2fa','disabled','enabled','192.168.1.158','2026-02-26 06:42:56'),(17,1,'avatar','public/storage/profilePictures/uploaded/f963e67d-bd9e-4ba2-9a52-a461be4d3460.png','public/storage/profilePictures/default/3b9475a1-65c1-40d2-95f4-1dcbc5cb2ef2.png','192.168.1.158','2026-02-26 18:54:45'),(18,1,'avatar','public/storage/profilePictures/default/3b9475a1-65c1-40d2-95f4-1dcbc5cb2ef2.png','public/storage/profilePictures/uploaded/a85da793-afbe-4849-a338-d4bbadc92a59.png','192.168.1.158','2026-02-26 18:54:54'),(19,1,'avatar','public/storage/profilePictures/uploaded/a85da793-afbe-4849-a338-d4bbadc92a59.png','public/storage/profilePictures/default/3b9475a1-65c1-40d2-95f4-1dcbc5cb2ef2.png','192.168.1.158','2026-02-26 18:54:59'),(20,1,'username','Test-1556','Test-15','192.168.8.2','2026-03-01 05:32:33');
/*!40000 ALTER TABLE `profile_changes_log` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `server_config`
--

DROP TABLE IF EXISTS `server_config`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `server_config` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `min_password_length` int(11) NOT NULL DEFAULT 8,
  `max_password_length` int(11) NOT NULL DEFAULT 64,
  `min_username_length` int(11) NOT NULL DEFAULT 3,
  `max_username_length` int(11) NOT NULL DEFAULT 32,
  `max_avatar_size_mb` int(11) NOT NULL DEFAULT 2,
  `username_change_cooldown_days` int(11) NOT NULL DEFAULT 7,
  `username_change_max_attempts` int(11) NOT NULL DEFAULT 1,
  `email_change_cooldown_days` int(11) NOT NULL DEFAULT 7,
  `email_change_max_attempts` int(11) NOT NULL DEFAULT 1,
  `avatar_change_cooldown_days` int(11) NOT NULL DEFAULT 1,
  `avatar_change_max_attempts` int(11) NOT NULL DEFAULT 3,
  `login_rate_limit_attempts` int(11) NOT NULL DEFAULT 5,
  `login_rate_limit_minutes` int(11) NOT NULL DEFAULT 15,
  `forgot_password_rate_limit_attempts` int(11) NOT NULL DEFAULT 3,
  `forgot_password_rate_limit_minutes` int(11) NOT NULL DEFAULT 30,
  `admin_edit_avatar_attempts` int(11) NOT NULL DEFAULT 20,
  `admin_edit_avatar_minutes` int(11) NOT NULL DEFAULT 30,
  `admin_edit_username_attempts` int(11) NOT NULL DEFAULT 20,
  `admin_edit_username_minutes` int(11) NOT NULL DEFAULT 30,
  `admin_edit_email_attempts` int(11) NOT NULL DEFAULT 20,
  `admin_edit_email_minutes` int(11) NOT NULL DEFAULT 30,
  `admin_edit_prefs_attempts` int(11) NOT NULL DEFAULT 50,
  `admin_edit_prefs_minutes` int(11) NOT NULL DEFAULT 30,
  `admin_edit_role_attempts` int(11) NOT NULL DEFAULT 10,
  `admin_edit_role_minutes` int(11) NOT NULL DEFAULT 30,
  `admin_edit_status_attempts` int(11) NOT NULL DEFAULT 20,
  `admin_edit_status_minutes` int(11) NOT NULL DEFAULT 30,
  `admin_add_note_attempts` int(11) NOT NULL DEFAULT 30,
  `admin_add_note_minutes` int(11) NOT NULL DEFAULT 30,
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `server_config`
--

LOCK TABLES `server_config` WRITE;
/*!40000 ALTER TABLE `server_config` DISABLE KEYS */;
INSERT INTO `server_config` VALUES (1,8,64,3,32,2,7,1,7,1,1,3,5,15,3,30,20,30,20,30,20,30,50,30,10,30,20,30,10,30,'2026-03-01 05:16:48');
/*!40000 ALTER TABLE `server_config` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `user_preferences`
--

DROP TABLE IF EXISTS `user_preferences`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `user_preferences` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `user_id` int(11) NOT NULL,
  `language` varchar(10) DEFAULT 'en-US',
  `open_links_new_tab` tinyint(1) DEFAULT 1,
  `theme` enum('system','light','dark') DEFAULT 'system',
  `extended_alerts` tinyint(1) DEFAULT 0,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`id`),
  UNIQUE KEY `user_id` (`user_id`),
  CONSTRAINT `fk_user_preferences` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=4 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `user_preferences`
--

LOCK TABLES `user_preferences` WRITE;
/*!40000 ALTER TABLE `user_preferences` DISABLE KEYS */;
INSERT INTO `user_preferences` VALUES (1,1,'es-419',1,'light',0,'2026-02-23 21:19:36','2026-03-01 20:37:12'),(2,3,'es-419',1,'system',0,'2026-02-27 18:42:06','2026-02-27 18:42:48'),(3,2,'es-MX',1,'system',0,'2026-02-27 18:59:34','2026-03-01 05:15:08');
/*!40000 ALTER TABLE `user_preferences` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `user_restrictions`
--

DROP TABLE IF EXISTS `user_restrictions`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `user_restrictions` (
  `user_id` int(11) NOT NULL,
  `is_suspended` tinyint(1) DEFAULT 0,
  `suspension_type` enum('temporary','permanent') DEFAULT NULL,
  `suspension_reason` text DEFAULT NULL,
  `suspension_end_date` datetime DEFAULT NULL,
  `deleted_by` enum('user','admin') DEFAULT NULL,
  `deleted_reason` text DEFAULT NULL,
  `admin_notes` text DEFAULT NULL,
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`user_id`),
  CONSTRAINT `fk_user_restrictions` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `user_restrictions`
--

LOCK TABLES `user_restrictions` WRITE;
/*!40000 ALTER TABLE `user_restrictions` DISABLE KEYS */;
INSERT INTO `user_restrictions` VALUES (1,0,NULL,NULL,NULL,NULL,NULL,NULL,'2026-03-01 04:00:43'),(2,0,NULL,NULL,NULL,NULL,NULL,'TEST','2026-03-01 04:02:33'),(3,0,NULL,NULL,NULL,NULL,NULL,NULL,'2026-03-01 04:00:43');
/*!40000 ALTER TABLE `user_restrictions` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `users`
--

DROP TABLE IF EXISTS `users`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `users` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `uuid` varchar(36) NOT NULL,
  `username` varchar(50) NOT NULL,
  `email` varchar(100) NOT NULL,
  `password` varchar(255) NOT NULL,
  `two_factor_secret` varchar(64) DEFAULT NULL,
  `two_factor_enabled` tinyint(1) DEFAULT 0,
  `two_factor_recovery_codes` text DEFAULT NULL,
  `role` enum('user','moderator','administrator','founder') DEFAULT 'user',
  `user_status` enum('active','deleted') DEFAULT 'active',
  `admin_notes` text DEFAULT NULL,
  `profile_picture` varchar(255) NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id`),
  UNIQUE KEY `uuid` (`uuid`),
  UNIQUE KEY `email` (`email`)
) ENGINE=InnoDB AUTO_INCREMENT=4 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `users`
--

LOCK TABLES `users` WRITE;
/*!40000 ALTER TABLE `users` DISABLE KEYS */;
INSERT INTO `users` VALUES (1,'3b9475a1-65c1-40d2-95f4-1dcbc5cb2ef2','Test-15','al20328051890088@gmail.com','$2y$10$clrbBP2fuGi2YI0njBQ3fuTa16VI6gB5hfwi8JxxTzORO4tjuzIIW','XP3JSGLJR3VU6R3V',1,'[\"773cde05\",\"3c09d06e\",\"ec9b557d\"]','founder','active',NULL,'public/storage/profilePictures/default/3b9475a1-65c1-40d2-95f4-1dcbc5cb2ef2.png','2026-02-22 21:54:05'),(2,'c9ecc513-46cb-4b58-ba55-d5fac298944a','Test-166666666666666666666','al20328051890099@gmail.com','$2y$10$lwzq69iVEOfz9yCRGWIfQ..31OvvdkCuShpI.HM.wFehWhqeJ8bMG',NULL,0,NULL,'moderator','active','CSolo visible para el equipo administrativo. Agrega enlaces, IDs de transacciones o el contexto de la decisión para mantener un historial limpio.\n\nSolo visible para el equipo administrativo. Agrega enlaces, IDs de transacciones o el contexto de la decisión para mantener un historial limpio.\n\n','public/storage/profilePictures/default/c9ecc513-46cb-4b58-ba55-d5fac298944a.png','2026-02-22 23:21:55'),(3,'e4fad453-cb52-4a1c-b46a-67b57a499ada','Test-3345','jorgeortega2405@gmail.com','$2y$10$8r.ISHg6MWjUyN1aqZIqIezUoEHMt40d.3deFuC8Ghr03cSrwEvV2',NULL,0,NULL,'founder','active',NULL,'public/storage/profilePictures/uploaded/5f37401c-c9d2-4e35-b3cd-aa4ba1bde4c4.png','2026-02-23 00:04:34');
/*!40000 ALTER TABLE `users` ENABLE KEYS */;
UNLOCK TABLES;
/*!40103 SET TIME_ZONE=@OLD_TIME_ZONE */;

/*!40101 SET SQL_MODE=@OLD_SQL_MODE */;
/*!40014 SET FOREIGN_KEY_CHECKS=@OLD_FOREIGN_KEY_CHECKS */;
/*!40014 SET UNIQUE_CHECKS=@OLD_UNIQUE_CHECKS */;
/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
/*!40111 SET SQL_NOTES=@OLD_SQL_NOTES */;

-- Dump completed on 2026-03-01 15:01:20
