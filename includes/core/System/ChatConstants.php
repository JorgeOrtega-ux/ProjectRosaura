<?php

namespace App\Core\System;

class ChatConstants {
    public const CHAT_MAX_UPLOAD_MB = 10;
    public const CHAT_MAX_IMAGES = 6;

    public const MSG_TYPE_TEXT = 'text';
    public const MSG_TYPE_IMAGE = 'image';
    public const MSG_TYPE_SYSTEM = 'system';
    public const MAX_MESSAGE_LENGTH = 1000;
}
