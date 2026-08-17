
$path = 'f:\htdocs\ProjectRosaura\translations\es-419\general.json'
$content = Get-Content $path -Raw -Encoding UTF8

$regex = '(?m)^\s*"(store_coins_|store_content_|err_insufficient_coins|type_coins|coins|tab_coins_virtual|msg_coins_adjusted_success|btn_adjust_coins|lbl_user_coins|lbl_adjust_coins|lbl_coins_amount|lbl_coin_reason_|perm_cat_store|perm\.manage_store_packages|perm\.manage_store_perks|perm\.view_user_purchases|lbl_allow_purchases|desc_allow_purchases|store\.bomb_perks_use_direct|admin_store_perks_title|th_perk_price|lbl_perk_price|desc_perk_price|msg_confirm_bulk_purchase_title|desc_allow_purchase_perk|msg_create_first_perk)[^"]*"\s*:\s*".*?"\s*,?\r?\n'

$newContent = [regex]::Replace($content, $regex, '')
$newContent = [regex]::Replace($newContent, ',\s*\}', "
}")

Set-Content $path -Value $newContent -Encoding UTF8

