
$path = 'f:\htdocs\ProjectRosaura\translations\es-419\general.json'
$content = Get-Content $path -Raw -Encoding UTF8

$regex = '(?m)^\s*"(perm\.desc_manage_store_packages|perm\.desc_manage_store_perks|perm\.desc_view_user_purchases|desc_view_user_purchases|msg_confirm_delete_perk|admin_store_new_perk|admin_store_edit_perk|admin_store_create_perk|admin_store_new_package)[^"]*"\s*:\s*".*?"\s*,?\r?\n'

$newContent = [regex]::Replace($content, $regex, '')
$newContent = [regex]::Replace($newContent, ',\s*\}', "
}")

Set-Content $path -Value $newContent -Encoding UTF8

