# Guías de Arquitectura Frontend - Project Rosaura

Este documento contiene las reglas, estándares y patrones de diseño utilizados en el frontend del proyecto. Si vas a crear nuevas secciones, asegúrate de seguir estos patrones para mantener la coherencia y el rendimiento.

## 1. Sistema de Carga de Imágenes y Fallbacks (Fade-in)

Para garantizar una experiencia visual "Premium" sin parpadeos blancos ni saltos bruscos cuando una imagen carga lento o no existe (error 404), todas las imágenes de la plataforma (avatares, miniaturas de lienzos, imágenes de chat, etc.) utilizan el **Patrón de Esqueleto Sólido + Fade-In**.

### ¿Cómo funciona?
1. El contenedor de la imagen tiene un color de fondo oscuro nativo (`var(--bg-surface-alt)`).
2. La etiqueta `<img>` nace completamente invisible (`opacity: 0`) gracias a una clase CSS (`.image-lazy-fade`).
3. El navegador intenta descargar la imagen. Mientras tanto, el usuario solo ve el "esqueleto" (rectángulo gris oscuro).
4. **Si la imagen carga con éxito:** Javascript detecta el evento `onload` y le añade la clase `.image-loaded`, haciéndola aparecer suavemente con una transición de 0.3s.
5. **Si la imagen falla (404):** Javascript detecta el evento `onerror`, cancela futuros errores (`this.onerror=null`), sustituye la URL por la imagen por defecto (`fallback`) local que carga instantáneamente de la caché, y finalmente le añade `.image-loaded` para hacer el fade-in de la imagen por defecto.

### Implementación (Ejemplo de Código)

Siempre que vayas a inyectar o escribir HTML para una imagen, utiliza esta estructura exacta:

```html
<div class="component-avatar-container">
    <img src="URL_IMAGEN_AQUI" 
         alt="Texto descriptivo" 
         class="image-lazy-fade" 
         loading="lazy" 
         decoding="async"
         onload="this.classList.add('image-loaded')"
         onerror="this.onerror=null; this.src='URL_IMAGEN_FALLBACK_AQUI'; this.classList.add('image-loaded');">
</div>
```

**Nota sobre CSS:**
- Asegúrate de que las clases globales en `components.css` (`.image-lazy-fade` e `.image-loaded`) no sean borradas.
- Si creas un nuevo contenedor (ej. `.mi-nuevo-avatar`), asegúrate de que tenga `background-color: var(--bg-surface-alt, #1c1c20);` en el CSS para que actúe como esqueleto.

---
*(Este documento se irá expandiendo conforme se implementen nuevos estándares en el frontend).*
