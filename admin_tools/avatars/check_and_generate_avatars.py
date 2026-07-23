import os
import sys
import time
import string
import urllib.request
import urllib.parse
import ssl

try:
    import boto3
    BOTO3_AVAILABLE = True
except ImportError:
    BOTO3_AVAILABLE = False

def load_env_vars():
    script_dir = os.path.dirname(os.path.abspath(__file__))
    env_path = os.path.abspath(os.path.join(script_dir, '../../.env'))
    if not os.path.exists(env_path):
        env_path = os.path.abspath(os.path.join(script_dir, '../.env'))
    if os.path.exists(env_path):
        with open(env_path, 'r', encoding='utf-8') as f:
            for line in f:
                line = line.strip()
                if line and not line.startswith('#'):
                    parts = line.split('=', 1)
                    if len(parts) == 2:
                        os.environ[parts[0].strip()] = parts[1].strip()

def get_s3_client():
    if not BOTO3_AVAILABLE:
        return None
    key = os.environ.get('AWS_ACCESS_KEY_ID')
    secret = os.environ.get('AWS_SECRET_ACCESS_KEY')
    region = os.environ.get('AWS_DEFAULT_REGION')
    endpoint = os.environ.get('AWS_ENDPOINT')
    
    if not key or not secret:
        return None
        
    return boto3.client(
        's3',
        aws_access_key_id=key,
        aws_secret_access_key=secret,
        region_name=region,
        endpoint_url=endpoint if endpoint else None
    )

def generate_fallback_image(char_to_draw, hex_color, script_dir):
    try:
        from PIL import Image, ImageDraw, ImageFont
        import io
        
        def hex_to_rgb(hex_c):
            return tuple(int(hex_c[i:i+2], 16) for i in (0, 2, 4))
            
        img = Image.new('RGB', (256, 256), color=hex_to_rgb(hex_color))
        draw = ImageDraw.Draw(img)
        font_path = os.path.abspath(os.path.join(script_dir, '../public/assets/fonts/Inter-Bold.ttf'))
        
        try:
            font = ImageFont.truetype(font_path, 100)
            text_bbox = draw.textbbox((0, 0), char_to_draw, font=font)
            text_w = text_bbox[2] - text_bbox[0]
            text_h = text_bbox[3] - text_bbox[1]
            x = (256 - text_w) / 2
            y = (256 - text_h) / 2 - text_bbox[1]
            draw.text((x, y), char_to_draw, fill=(255, 255, 255), font=font)
        except IOError:
            font = ImageFont.load_default()
            draw.text((100, 100), char_to_draw, fill=(255, 255, 255), font=font)
            
        buf = io.BytesIO()
        img.save(buf, format='PNG')
        return buf.getvalue()
    except ImportError:
        print("[-] PIL (Pillow) is not installed. Cannot generate fallback image.")
        return None

def check_and_generate(category, chars, colors, base_dir, force_regenerate):
    s3_client = get_s3_client()
    bucket = os.environ.get('AWS_BUCKET')
    script_dir = os.path.dirname(os.path.abspath(__file__))
    
    for folder_name, char_to_draw in chars.items():
        folder_path = os.path.join(base_dir, category, str(folder_name))
        os.makedirs(folder_path, exist_ok=True)
        
        files_count = 0
        for color in colors:
            file_path = os.path.join(folder_path, f"{color}.png")
            if os.path.exists(file_path):
                files_count += 1
                
        if files_count != len(colors) or force_regenerate:
            print(f"[*] Generating avatars for {category}/{folder_name}...")
            for color in colors:
                file_path = os.path.join(folder_path, f"{color}.png")
                rel_path = f"profilePictures/default/{category}/{folder_name}/{color}.png"
                
                api_url = f"https://ui-avatars.com/api/?name={urllib.parse.quote(char_to_draw)}&background={color}&color=ffffff&size=256&font-size=0.5&format=png"
                
                image_content = None
                try:
                    ctx = ssl.create_default_context()
                    ctx.check_hostname = False
                    ctx.verify_mode = ssl.CERT_NONE
                    
                    req = urllib.request.Request(api_url, headers={'User-Agent': 'Mozilla/5.0'})
                    with urllib.request.urlopen(req, context=ctx, timeout=10) as response:
                        if response.status == 200:
                            image_content = response.read()
                except Exception as e:
                    print(f"[-] Request failed: {e}")
                
                time.sleep(0.5)
                
                if not image_content:
                    image_content = generate_fallback_image(char_to_draw, color, script_dir)
                
                if image_content:
                    with open(file_path, 'wb') as f:
                        f.write(image_content)
                    
                    if s3_client:
                        try:
                            s3_client.put_object(
                                Bucket=bucket,
                                Key=rel_path,
                                Body=image_content,
                                ContentType='image/png'
                            )
                        except Exception as e:
                            print(f"[!] Failed to upload {rel_path} to S3: {e}")
                else:
                    print(f"[!] Failed to generate image for {category}/{folder_name}/{color}")

def run_avatar_generator():
    force_regenerate = '--force' in sys.argv
    
    load_env_vars()
    
    colors = ['2563eb', '16a34a', '7c3aed', 'dc2626', 'ea580c', '374151']
    
    letters = {c: c for c in string.ascii_uppercase}
    numbers = {str(n): str(n) for n in range(10)}
    symbols = {'_symbol': 'U'}
    
    script_dir = os.path.dirname(os.path.abspath(__file__))
    base_dir = os.path.abspath(os.path.join(script_dir, '../storage/public/profilePictures/default'))
    
    print("[*] Checking and generating letters...")
    check_and_generate('letters', letters, colors, base_dir, force_regenerate)
    
    print("[*] Checking and generating numbers...")
    check_and_generate('numbers', numbers, colors, base_dir, force_regenerate)
    
    print("[*] Checking and generating symbols...")
    check_and_generate('letters', symbols, colors, base_dir, force_regenerate)
    
    print("[+] Done verifying avatars.")

if __name__ == '__main__':
    run_avatar_generator()
