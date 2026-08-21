# Experiencia de carga con botella de perfume

Se incorporó una animación premium de una botella llenándose para que los resultados del asesor y del comparador no aparezcan de forma abrupta.

## Módulos incluidos

- **Tus recomendaciones personalizadas**
  - La animación aparece al terminar el cuestionario.
  - Duración aproximada: 2.2 segundos.
  - Mensajes progresivos explican que se está construyendo el perfil olfativo.

- **Compara Nuestras Fragancias**
  - La animación aparece antes de mostrar por primera vez el carrusel y los detalles.
  - Se repite de forma breve cuando se cambia una fragancia seleccionada.
  - Duración inicial aproximada: 1.9 segundos.
  - Duración en cambios posteriores: 1.15 segundos.

## Accesibilidad

- `role="status"` y `aria-live="polite"` para lectores de pantalla.
- `aria-busy` en cada módulo mientras se preparan los resultados.
- Con `prefers-reduced-motion: reduce`, la animación se detiene y la espera se reduce a menos de medio segundo.
- No se bloquea la lógica real de recomendaciones, selección, persistencia o comparación.

## Archivos

- `app/components/PerfumeLoadingExperience.jsx`
- `app/components/PerfumeLoadingExperience.module.css`
- `app/components/PersonalizedFragrance.jsx`
- `app/components/FragranceComparator.jsx`
