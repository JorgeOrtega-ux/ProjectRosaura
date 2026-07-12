<?php
// 1. worker_canvas_jobs.py
$content = file_get_contents('scripts/worker_canvas_jobs.py');
$content = str_replace(
    'public_filepath = f"public/storage/snapshots_archive/{canvas_uuid}/{archive_filename}"',
    'public_filepath = f"snapshots_archive/{canvas_uuid}/{archive_filename}"',
    $content
);
file_put_contents('scripts/worker_canvas_jobs.py', $content);
echo "worker_canvas_jobs.py patched.\n";

// 2. worker_system_tasks.py
$content = file_get_contents('scripts/worker_system_tasks.py');

if (strpos($content, 'import boto3') === false) {
    $content = "import boto3\n" . $content;
}

if (strpos($content, 'S3_BUCKET = os.getenv("MINIO_BUCKET", "rosaura-storage")') === false) {
    $boto3_setup = <<<EOT
S3_BUCKET = os.getenv("MINIO_BUCKET", "rosaura-storage")
s3 = boto3.client('s3',
    endpoint_url=os.getenv("MINIO_ENDPOINT", "http://minio:9000"),
    aws_access_key_id=os.getenv("MINIO_ROOT_USER", "admin"),
    aws_secret_access_key=os.getenv("MINIO_ROOT_PASSWORD", "password")
)
EOT;
    $content = preg_replace('/APP_ROOT_PATH =/', $boto3_setup . "\nAPP_ROOT_PATH =", $content, 1);
}

$search_delete = <<<EOT
            if profile_pic and 'fallbacks/avatar-default.png' not in profile_pic:
                pic_relative = profile_pic.lstrip('/').replace('public/storage/', 'storage/public/')
                pic_path = os.path.join(APP_ROOT_PATH, pic_relative)
                
                if os.path.exists(pic_path) and os.path.isfile(pic_path):
                    try:
                        os.remove(pic_path)
                        Logger.info(f"Physical profile resource purged: {pic_path}")
                    except Exception as e:
                        Logger.error(f"Failed to purge profile resource: {e}")
EOT;

$replace_delete = <<<EOT
            if profile_pic and 'fallbacks/avatar-default.png' not in profile_pic:
                s3_key = profile_pic.lstrip('/')
                s3_key = re.sub(r'^/?public/storage/', '', s3_key)
                try:
                    s3.delete_object(Bucket=S3_BUCKET, Key=s3_key)
                    Logger.info(f"S3 profile resource purged: {s3_key}")
                except Exception as e:
                    Logger.error(f"Failed to purge profile resource from S3: {e}")
EOT;
$content = str_replace($search_delete, $replace_delete, $content);


$search_orphan = <<<EOT
            if uuid_str:
                orphan_default = os.path.join(APP_ROOT_PATH, f"storage/public/profilePictures/default/{uuid_str}.png")
                if os.path.exists(orphan_default) and os.path.isfile(orphan_default):
                    try:
                        os.remove(orphan_default)
                        Logger.info(f"Orphaned default resource purged: {orphan_default}")
                    except Exception:
                        pass
EOT;

$replace_orphan = <<<EOT
            if uuid_str:
                s3_key = f"profilePictures/default/{uuid_str}.png"
                try:
                    s3.delete_object(Bucket=S3_BUCKET, Key=s3_key)
                    Logger.info(f"Orphaned default S3 resource purged: {s3_key}")
                except Exception:
                    pass
EOT;
$content = str_replace($search_orphan, $replace_orphan, $content);


$search_heal = <<<EOT
                    file_name = f"{uuid_str}.png"
                    rel_path = f"public/storage/profilePictures/default/{file_name}"
                    full_path = os.path.join(APP_ROOT_PATH, f"storage/public/profilePictures/default/{file_name}")
                    
                    os.makedirs(os.path.dirname(full_path), exist_ok=True)
                    with open(full_path, 'wb') as f:
                        f.write(response.content)
                    os.chmod(full_path, 0o644)
EOT;

$replace_heal = <<<EOT
                    file_name = f"{uuid_str}.png"
                    rel_path = f"profilePictures/default/{file_name}"
                    
                    try:
                        s3.put_object(Bucket=S3_BUCKET, Key=rel_path, Body=response.content, ContentType='image/png')
                    except Exception as e:
                        Logger.error(f"Failed to upload healed avatar to S3: {e}")
EOT;
$content = str_replace($search_heal, $replace_heal, $content);

if (strpos($content, 'import re') === false) {
    $content = "import re\n" . $content;
}

file_put_contents('scripts/worker_system_tasks.py', $content);
echo "worker_system_tasks.py patched.\n";
