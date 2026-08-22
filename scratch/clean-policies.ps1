
$tc = 'f:\htdocs\ProjectRosaura\translations\es-419\site-policy\terms-conditions.json'
$content = Get-Content $tc -Raw -Encoding UTF8
$regex = '(?m)^\s*"terms_conditions_section_4_p3".*?\r?\n'
$content = [regex]::Replace($content, $regex, '')
$content = $content.Replace('Las suscripciones y la adquisición de Monedas de la tienda se procesan exclusivamente en USD. Las Monedas son licencias digitales no monetizables y se pierden si se cancela o suspende la cuenta.', 'Las suscripciones se procesan exclusivamente en USD.')
$content = $content.Replace(', paquetes de la Tienda Virtual o Monedas', '')
$content = $content.Replace(' o saldo de Monedas', '')
$content = $content.Replace(' y disponiendo de una Tienda Virtual para la adquisición de licencias digitales de carácter consumible', '')
$content = $content.Replace(' la adquisición de créditos consumibles en la Tienda Virtual', '')
$content = [regex]::Replace($content, ',\s*\}', "
}")
Set-Content $tc -Value $content -Encoding UTF8

$cp = 'f:\htdocs\ProjectRosaura\translations\es-419\site-policy\cookies-policy.json'
$content = Get-Content $cp -Raw -Encoding UTF8
$content = $content.Replace(' o realizar transacciones en la Tienda Virtual', '')
$content = [regex]::Replace($content, ',\s*\}', "
}")
Set-Content $cp -Value $content -Encoding UTF8

$ln = 'f:\htdocs\ProjectRosaura\translations\es-419\site-policy\legal-notice.json'
$content = Get-Content $ln -Raw -Encoding UTF8
$content = $content.Replace(' o la adquisición de créditos consumibles en la Tienda Virtual', '')
$content = [regex]::Replace($content, ',\s*\}', "
}")
Set-Content $ln -Value $content -Encoding UTF8

$pp = 'f:\htdocs\ProjectRosaura\translations\es-419\site-policy\privacy-policy.json'
$content = Get-Content $pp -Raw -Encoding UTF8
$content = $content.Replace(' o compras en la Tienda Virtual', '')
$content = [regex]::Replace($content, ',\s*\}', "
}")
Set-Content $pp -Value $content -Encoding UTF8

