# Motor de Audio AAA / Cine Oscuro & Terror (`perks_sound_effects.md`)

Se ha actualizado el motor de audio **[SoundManager.js](file:///f:/htdocs/ProjectRosaura/public/assets/js/modules/app/design/SoundManager.js)** para proporcionar un sonido caótico, profundo, pesado y con atmósfera de terror cinematográfico estilo juegos AAA (Doom, Cyberpunk 2077, Battlefield).

---

## 🎛️ Nuevas Tecnologías DSP de Terror Implementadas

### 1. Procesador de Distorsión Analógica (`WaveShaperNode Valve Saturation`)
- Se incorporó un nodo de distorsión de saturación de válvulas (`makeDistortionCurve(25)` con oversampling 4x).
- **Resultado:** Elimina el sonido sintético "tipo 8-bit" y le otorga a las explosiones un crunch pesado, caótico y metálico que destruye la sensación de audio simple.

### 2. Generador de Sub-Graves Sísmicos (20Hz - 38Hz Sub-Drop)
- Las detonaciones incluyen capas de osciladores sub-octava en el rango ultra-grave (20Hz - 38Hz).
- **Resultado:** Hace retumbar los subwoofers y auriculares con un impacto sordo de terror.

### 3. Ruido Marrón Oscuro Filtrado con Resonancia Pesada
- Generadores de Ruido Marrón de alta definición procesados con filtros pasa-bajas `BiquadFilterNode` y factor $Q = 5-7$.
- **Resultado:** Simula ondas de choque atmosféricas, succión de vacío y expansiones de aire masivas.

---

## 📁 4. Cargador de Archivos de Audio Reales MP3 (`sampleCache`)

Si deseas colocar archivos de audio `.mp3` grabados de estudio cinematográfico, el sistema los detecta y reproduce de forma nativa manteniendo el panner 3D y el compresor limiter activos.

**Ubicación recomendada de archivos MP3:**
- `public/assets/sounds/canon_orbital.mp3`
- `public/assets/sounds/bomba_atomica.mp3`
- `public/assets/sounds/agujero_negro.mp3`
- `public/assets/sounds/lluvia_meteoritos.mp3`
- `public/assets/sounds/bomba_racimo.mp3`
- `public/assets/sounds/pixel_misil.mp3`
- `public/assets/sounds/proteccion.mp3`
- `public/assets/sounds/minas.mp3`

Si el archivo `.mp3` existe en esa ruta, **SoundManager lo reproducirá prioritariamente**. Si no existe, generará automáticamente la síntesis pesada de terror descrita arriba.
