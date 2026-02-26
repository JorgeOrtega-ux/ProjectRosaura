<div class="view-content" style="padding: 24px;">
    <h1 style="font-size: 24px; font-weight: 600; margin-bottom: 8px;">Prueba de Componentes 2FA</h1>
    <p style="color: #666; font-size: 15px; margin-bottom: 32px;">Elige la variación que más te guste para la lista de 10 códigos de recuperación.</p>

    <div style="margin-bottom: 40px; border: 1px solid #00000020; padding: 24px; border-radius: 12px; background: #fff;">
        <h3 style="font-size: 16px; margin-bottom: 16px; color: #111;">Variación 1: Minimalista Suave</h3>
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px;">
            <?php 
            $codes = ['a1b2c3d4', 'e5f6g7h8', 'i9j0k1l2', 'm3n4o5p6', 'q7r8s9t0', 'u1v2w3x4', 'y5z6a7b8', 'c9d0e1f2', 'g3h4i5j6', 'k7l8m9n0'];
            foreach($codes as $code): 
            ?>
            <span style="padding: 10px 14px; background: #f5f5fa; border-radius: 6px; font-family: monospace; font-size: 15px; letter-spacing: 2px; text-align: center; color: #111; border: 1px solid #00000010;">
                <?php echo $code; ?>
            </span>
            <?php endforeach; ?>
        </div>
    </div>

    <div style="margin-bottom: 40px; border: 1px solid #00000020; padding: 24px; border-radius: 12px; background: #fff;">
        <h3 style="font-size: 16px; margin-bottom: 16px; color: #111;">Variación 2: Alto Contraste Oscuro</h3>
        <div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(130px, 1fr)); gap: 10px;">
            <?php foreach($codes as $code): ?>
            <span style="padding: 8px 12px; background: #111111; border-radius: 4px; font-family: monospace; font-size: 14px; letter-spacing: 1.5px; text-align: center; color: #ffffff; font-weight: 500;">
                <?php echo $code; ?>
            </span>
            <?php endforeach; ?>
        </div>
    </div>

    <div style="margin-bottom: 40px; border: 1px solid #00000020; padding: 24px; border-radius: 12px; background: #fff;">
        <h3 style="font-size: 16px; margin-bottom: 16px; color: #111;">Variación 3: Tarjetas con Ícono</h3>
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px;">
            <?php foreach($codes as $code): ?>
            <div style="display: flex; align-items: center; justify-content: space-between; padding: 10px 16px; border: 1px solid #00000020; border-radius: 8px; background: #fff;">
                <span class="material-symbols-rounded" style="font-size: 18px; color: #666666;">key</span>
                <span style="font-family: monospace; font-size: 14px; letter-spacing: 1.5px; color: #111111; font-weight: bold;">
                    <?php echo $code; ?>
                </span>
            </div>
            <?php endforeach; ?>
        </div>
    </div>

    <div style="margin-bottom: 40px; border: 1px solid #00000020; padding: 24px; border-radius: 12px; background: #fff;">
        <h3 style="font-size: 16px; margin-bottom: 16px; color: #111;">Variación 4: Consola / Terminal</h3>
        <div style="background: #0f172a; border-radius: 8px; padding: 20px; display: grid; grid-template-columns: 1fr 1fr; gap: 12px 32px; border: 1px solid #1e293b;">
            <?php foreach($codes as $code): ?>
            <span style="font-family: monospace; font-size: 15px; letter-spacing: 2px; color: #10b981; display: flex; gap: 8px;">
                <span style="color: #64748b;">></span> <?php echo $code; ?>
            </span>
            <?php endforeach; ?>
        </div>
    </div>

    <div style="margin-bottom: 40px; border: 1px solid #00000020; padding: 24px; border-radius: 12px; background: #fff;">
        <h3 style="font-size: 16px; margin-bottom: 16px; color: #111;">Variación 5: Etiquetas Delineadas</h3>
        <div style="display: flex; flex-wrap: wrap; gap: 10px; justify-content: center;">
            <?php foreach($codes as $code): ?>
            <span style="padding: 8px 16px; border: 1.5px solid #111111; border-radius: 999px; font-family: monospace; font-size: 14px; letter-spacing: 1.5px; color: #111111; font-weight: 600; background: transparent;">
                <?php echo $code; ?>
            </span>
            <?php endforeach; ?>
        </div>
    </div>

    <div style="margin-bottom: 40px; border: 1px solid #00000020; padding: 24px; border-radius: 12px; background: #fff;">
        <h3 style="font-size: 16px; margin-bottom: 16px; color: #111;">Variación 6: Lista Estructurada (Estilo Bancario)</h3>
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 0; border: 1px solid #00000020; border-radius: 8px; overflow: hidden;">
            <?php 
            $i = 1;
            foreach($codes as $index => $code): 
                $isRight = $index % 2 !== 0;
                $isBottom = $index >= count($codes) - 2;
                
                $borderRight = $isRight ? 'none' : '1px solid #00000020';
                $borderBottom = $isBottom ? 'none' : '1px solid #00000020';
            ?>
            <div style="padding: 12px 16px; border-bottom: <?php echo $borderBottom; ?>; border-right: <?php echo $borderRight; ?>; display: flex; justify-content: space-between; align-items: center; background: <?php echo ($index % 4 === 0 || $index % 4 === 3) ? '#fcfcfc' : '#ffffff'; ?>;">
                <span style="color: #999999; font-size: 12px; font-weight: bold;"><?php echo str_pad($i, 2, '0', STR_PAD_LEFT); ?></span>
                <span style="font-family: monospace; font-size: 15px; letter-spacing: 2px; color: #111111; font-weight: 500;">
                    <?php echo $code; ?>
                </span>
            </div>
            <?php 
            $i++;
            endforeach; 
            ?>
        </div>
    </div>

</div>