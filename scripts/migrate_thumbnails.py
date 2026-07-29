import os
import boto3
import io
from PIL import Image
from dotenv import load_dotenv

# Load environment variables
PROJECT_ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))
load_dotenv(os.path.join(PROJECT_ROOT, '.env'))

S3_ENDPOINT = "http://localhost:9000"
S3_ACCESS_KEY = os.getenv("AWS_ACCESS_KEY_ID")
S3_SECRET_KEY = os.getenv("AWS_SECRET_ACCESS_KEY")
S3_BUCKET = os.getenv("AWS_BUCKET")

if not S3_BUCKET:
    print("S3_BUCKET not configured. Please check .env")
    exit(1)

def get_s3_client():
    return boto3.client(
        's3',
        endpoint_url=S3_ENDPOINT,
        aws_access_key_id=S3_ACCESS_KEY,
        aws_secret_access_key=S3_SECRET_KEY,
        region_name='us-east-1'
    )

def main():
    s3 = get_s3_client()
    print(f"Connecting to S3 Bucket: {S3_BUCKET}")
    
    # Prefix for thumbnails
    prefix = 'thumbnails/'
    
    try:
        paginator = s3.get_paginator('list_objects_v2')
        pages = paginator.paginate(Bucket=S3_BUCKET, Prefix=prefix)
        
        count = 0
        for page in pages:
            if 'Contents' not in page:
                continue
                
            for obj in page['Contents']:
                key = obj['Key']
                
                # Check if it's a PNG thumbnail
                if key.endswith('.png'):
                    print(f"Found PNG thumbnail: {key}")
                    
                    try:
                        # Download to memory
                        response = s3.get_object(Bucket=S3_BUCKET, Key=key)
                        img_data = response['Body'].read()
                        
                        # Open with PIL
                        img = Image.open(io.BytesIO(img_data))
                        
                        # Convert to WebP
                        webp_io = io.BytesIO()
                        img.save(webp_io, "WEBP", quality=80)
                        webp_io.seek(0)
                        
                        # New key
                        new_key = key[:-4] + ".webp"
                        
                        # Upload WebP
                        s3.put_object(
                            Bucket=S3_BUCKET, 
                            Key=new_key, 
                            Body=webp_io, 
                            ContentType='image/webp'
                        )
                        print(f"  -> Converted and uploaded: {new_key}")
                        
                        # Delete old PNG (optional but recommended to free space)
                        s3.delete_object(Bucket=S3_BUCKET, Key=key)
                        print(f"  -> Deleted original PNG: {key}")
                        
                        count += 1
                        
                    except Exception as e:
                        print(f"  -> Error processing {key}: {e}")
        
        print(f"\nMigration complete! Converted {count} thumbnails to WebP.")
        
    except Exception as e:
        print(f"Error accessing S3: {e}")

if __name__ == '__main__':
    main()
