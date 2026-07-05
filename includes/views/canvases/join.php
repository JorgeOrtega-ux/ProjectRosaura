<?php // includes/views/canvases/join.php ?>
<div class="view-content" style="height: 100vh; display: flex; align-items: center; justify-content: center; background: radial-gradient(circle at center, var(--bg-level-2), var(--bg-level-0));">
    <div class="join-container" style="max-width: 450px; width: 100%; text-align: center; padding: 40px 30px; background: rgba(var(--bg-level-1-rgb), 0.6); backdrop-filter: blur(12px); border-radius: 24px; box-shadow: 0 10px 40px rgba(0,0,0,0.2), inset 0 1px 0 rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.05); transform: translateY(-20px); animation: fadeUp 0.6s ease-out forwards;">
        
        <div class="join-icon" style="width: 72px; height: 72px; border-radius: 20px; background: linear-gradient(135deg, var(--color-primary), var(--color-secondary)); margin: 0 auto 24px; display: flex; align-items: center; justify-content: center; box-shadow: 0 8px 24px rgba(var(--color-primary-rgb), 0.3);">
            <span class="material-symbols-rounded" style="font-size: 36px; color: #fff;">link</span>
        </div>

        <h1 style="font-size: 28px; font-weight: 700; margin-bottom: 8px; font-family: var(--font-primary); color: var(--text-primary);">Unirse al lienzo</h1>
        <p style="color: var(--text-secondary); font-size: 15px; margin-bottom: 32px; line-height: 1.5;">Ingresa el código de invitación que recibiste para unirte y empezar a colaborar.</p>

        <form id="form-join-canvas" style="display: flex; flex-direction: column; gap: 20px;">
            <div style="position: relative;">
                <input type="text" name="code" id="join-code-input" placeholder="Ej: A9X-2B4" required autocomplete="off"
                       style="width: 100%; padding: 18px 24px; font-size: 24px; text-align: center; font-weight: 600; letter-spacing: 2px; text-transform: uppercase; border-radius: 16px; background: rgba(0,0,0,0.2); border: 1px solid rgba(255,255,255,0.1); color: var(--text-primary); transition: all 0.3s ease; box-shadow: inset 0 2px 4px rgba(0,0,0,0.1);">
                <div class="input-focus-ring" style="position: absolute; inset: -2px; border-radius: 18px; border: 2px solid var(--color-primary); opacity: 0; pointer-events: none; transition: opacity 0.3s ease;"></div>
            </div>

            <button type="submit" class="component-button component-button--primary" style="width: 100%; height: 56px; border-radius: 16px; font-size: 16px; font-weight: 600; justify-content: center; gap: 8px; transition: transform 0.2s, box-shadow 0.2s;">
                <span>Validar Código</span>
                <span class="material-symbols-rounded" style="font-size: 20px;">arrow_forward</span>
            </button>
        </form>
    </div>
</div>

<style>
@keyframes fadeUp {
    from { opacity: 0; transform: translateY(20px); }
    to { opacity: 1; transform: translateY(0); }
}
#join-code-input:focus {
    outline: none;
    border-color: transparent;
}
#join-code-input:focus + .input-focus-ring {
    opacity: 1;
}
#join-code-input::placeholder {
    color: rgba(255,255,255,0.2);
    font-weight: 400;
    letter-spacing: normal;
    text-transform: none;
}
.join-container button:hover {
    transform: translateY(-2px);
    box-shadow: 0 6px 20px rgba(var(--color-primary-rgb), 0.4);
}
</style>