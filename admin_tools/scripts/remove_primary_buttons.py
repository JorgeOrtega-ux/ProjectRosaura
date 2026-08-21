import os
import re
import sys

# Archivos a procesar
script_dir = os.path.dirname(os.path.abspath(__file__))
project_dir = os.path.abspath(os.path.join(script_dir, '../../'))

files_to_modify = [
    # 1. Vistas PHP
    'includes/views/auth/login.php',
    'includes/views/auth/register.php',
    'includes/views/auth/forgot-password.php',
    'includes/views/auth/reset-password.php',
    'includes/views/settings/profile/your-account.php',
    'includes/views/settings/billing/billing.php',
    'includes/views/settings/security/security.php',
    'includes/views/settings/security/2fa.php',
    'includes/views/settings/security/2fa-recovery-codes.php',
    
    # 2. Módulos PHP
    'includes/modules/moduleDesignTools.php',
    
    # 3. Plantillas JS
    'public/assets/js/core/components/ModalTemplates.js',
    'public/assets/js/core/components/NoticeTemplates.js',
    'public/assets/js/core/components/CardTemplates.js',
    'public/assets/js/modules/admin/AdminModalTemplates.js',
    
    # 4. Controladores JS
    'public/assets/js/modules/auth/AuthController.js',
    'public/assets/js/modules/admin/users/AdminUserEditController.js',
    'public/assets/js/modules/admin/logs/AdminLogsViewerController.js',
    'public/assets/js/modules/settings/BillingController.js',
    'public/assets/js/modules/app/design/DesignInteractions.js'
]

def clean_file(rel_path):
    abs_path = os.path.join(project_dir, rel_path)
    if not os.path.exists(abs_path):
        print(f"No existe: {rel_path}")
        return 0

    with open(abs_path, 'r', encoding='utf-8') as f:
        content = f.read()

    original_content = content

    # Reemplazos específicos por archivo o generales
    if rel_path.endswith('.php') or 'Templates.js' in rel_path or 'AuthController.js' in rel_path:
        # Reemplazar 'component-button component-button--primary' por 'component-button'
        content = content.replace('component-button component-button--primary', 'component-button')
        # Reemplazar cualquier 'component-button--primary ' o ' component-button--primary'
        content = content.replace(' component-button--primary', '')
        content = content.replace('component-button--primary ', '')
        content = content.replace("'component-button--primary'", "''")
        content = content.replace('"component-button--primary"', '""')

    if rel_path == 'public/assets/js/core/components/CardTemplates.js':
        content = content.replace("cancelAtEnd ? 'component-button--brand' : 'component-button--primary'", "cancelAtEnd ? 'component-button--brand' : ''")

    if rel_path == 'public/assets/js/modules/admin/users/AdminUserEditController.js':
        content = content.replace("confirmClass: 'component-button--primary',", "confirmClass: '',")

    if rel_path == 'public/assets/js/modules/admin/logs/AdminLogsViewerController.js':
        content = content.replace("toggleSyntaxBtn.classList.toggle('component-button--primary', this.isSyntaxModeEnabled);", "toggleSyntaxBtn.classList.toggle('active', this.isSyntaxModeEnabled);")

    if rel_path == 'public/assets/js/modules/settings/BillingController.js':
        content = content.replace("renewalBtn.classList.remove('component-button--primary');\n", "")
        content = content.replace("renewalBtn.classList.remove('component-button--primary');", "")
        content = content.replace("renewalBtn.classList.add('component-button--primary');\n", "")
        content = content.replace("renewalBtn.classList.add('component-button--primary');", "")

    if rel_path == 'public/assets/js/modules/app/design/DesignInteractions.js':
        content = content.replace("this.btnPlacePixels.classList.replace('component-button--primary', 'component-button--danger');\n", "")
        content = content.replace("this.btnPlacePixels.classList.replace('component-button--primary', 'component-button--danger');", "")
        content = content.replace("this.btnPlacePixels.classList.replace('component-button--primary', 'component-button--success');\n", "")
        content = content.replace("this.btnPlacePixels.classList.replace('component-button--primary', 'component-button--success');", "")
        content = content.replace("this.btnPlacePixels.classList.replace('component-button--success', 'component-button--primary');", "this.btnPlacePixels.classList.remove('component-button--success');")
        content = content.replace("this.btnPlacePixels.classList.replace('component-button--danger', 'component-button--primary');", "this.btnPlacePixels.classList.remove('component-button--danger');")

    if content != original_content:
        with open(abs_path, 'w', encoding='utf-8', newline='') as f:
            f.write(content)
        print(f"Modificado: {rel_path}")
        return 1
    else:
        print(f"Sin cambios: {rel_path}")
        return 0

if __name__ == '__main__':
    modified_count = 0
    for file_rel in files_to_modify:
        modified_count += clean_file(file_rel)
    print(f"\nTotal archivos modificados: {modified_count}")
