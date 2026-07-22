import os
import re
import json

views_dir = 'f:/htdocs/ProjectRosaura/includes/views/site-policy'
translations_dir = 'f:/htdocs/ProjectRosaura/translations/es-419/site-policy'
app_name_php = '<?php echo $appName; ?>'

files = ['legal-notice.php', 'privacy-policy.php', 'cookies-policy.php', 'terms-conditions.php', 'refund-policy.php']

for filename in files:
    filepath = os.path.join(views_dir, filename)
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()
    
    basename = filename.replace('.php', '')
    prefix = basename.replace('-', '_')
    
    translations = {}
    counter = 1
    
    def replacer(match):
        global counter
        tag = match.group(1)
        classes = match.group(2)
        inner_html = match.group(3)
        
        # Don't touch if already translated
        if '<?php echo __(' in inner_html:
            return match.group(0)
            
        key = f"{prefix}_text_{counter}"
        counter += 1
        
        # Clean up inner html for json
        json_val = inner_html.strip()
        has_app_name = app_name_php in json_val
        
        if has_app_name:
            json_val = json_val.replace(app_name_php, '{appName}')
        
        # Remove extra spaces in json_val but preserve basic newlines if any, actually just normalize space
        json_val = re.sub(r'\s+', ' ', json_val)
        
        translations[key] = json_val
        
        if has_app_name:
            php_code = f"<?php echo __('{key}', ['appName' => $appName]); ?>"
        else:
            php_code = f"<?php echo __('{key}'); ?>"
            
        return f"<{tag} {classes}>\n                    {php_code}\n                </{tag}>"

    # Match subtitles
    content = re.sub(r'<(p)\s+(class="policy-subtitle")>(.*?)</\1>', replacer, content, flags=re.DOTALL)
    
    # Match h2
    content = re.sub(r'<(h2)\s+(class="policy-section-title")>(.*?)</\1>', replacer, content, flags=re.DOTALL)
    
    # Match p
    content = re.sub(r'<(p)\s+(class="policy-text")>(.*?)</\1>', replacer, content, flags=re.DOTALL)
    
    # Match ul/li if they have specific classes or just li inside policy-section
    # Some files might have ul/li. Let's just catch basic tags.
    # Actually privacy-policy might have <ul><li>...
    
    # Let's save the JSON
    json_path = os.path.join(translations_dir, f"{basename}.json")
    with open(json_path, 'w', encoding='utf-8') as f:
        json.dump(translations, f, ensure_ascii=False, indent=4)
        
    # Save the PHP
    with open(filepath, 'w', encoding='utf-8') as f:
        f.write(content)
        
    print(f"Processed {filename}: {len(translations)} keys extracted.")
