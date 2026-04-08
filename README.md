# Remitos Distribuidora - MVP HTML + Airtable

Sistema mobile-first para:
- cargar clientes
- crear pedidos/remitos
- buscar clientes por comercio o contacto
- buscar productos por código, nombre o marca
- editar remitos existentes
- exportar remito imprimible

## Importante
Esta versión **no usa backend**.
Eso significa que **no es segura para producción** si dejás el token activo dentro del código o del navegador.

## Recomendación inmediata
Ya que tu token anterior quedó expuesto, **revocalo y generá uno nuevo** antes de usar esta app.

## Cómo usar

### 1. Configurá Airtable
Abrí la pestaña **Configuración** dentro de la app y cargá:
- `AIRTABLE_PAT`
- `AIRTABLE_BASE_ID`

La configuración se guarda en `localStorage` de este dispositivo.

### 2. Ejecutar local
Como son archivos estáticos, podés usar una extensión tipo Live Server o cualquier hosting estático.

### 3. Subir a GitHub Pages
- Subí estos archivos a un repositorio
- Activá GitHub Pages
- Entrá al sitio publicado
- Pegá tu token y base ID en la pestaña Configuración

## Estructura
- `index.html`
- `styles.css`
- `config.js`
- `airtable.js`
- `utils.js`
- `remito.js`
- `app.js`

## Tablas usadas
- `CLIENTES`
- `PRODUCTOS`
- `PEDIDOS`
- `LÍNEAS DE PEDIDO`

## Notas técnicas
- No descuenta stock
- No edita clientes desde celular
- El estado del pedido no aparece en el remito exportado
- Los subtotales y totales visibles en la app se recalculan del lado cliente, pero Airtable sigue siendo la fuente principal de datos
