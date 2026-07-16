<?php
namespace App\Core\System;

class StatusConstants {
    public const REQUEST_PENDING = 'pending';
    public const REQUEST_APPROVED = 'approved';
    public const REQUEST_REJECTED = 'rejected';

    public const JOB_PENDING = 'pending';
    public const JOB_IN_PROGRESS = 'in_progress';
    public const JOB_COMPLETED = 'completed';
    public const JOB_FAILED = 'failed';
}
