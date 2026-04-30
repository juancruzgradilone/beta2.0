# Migración a Google Sheets - Onda Crocante

## Qué trae esta versión

- Web adaptada para dejar Airtable y usar Google Sheets.
- Backend en Google Apps Script.
- Alta de clientes.
- Alta, edición y eliminación de pedidos.
- Líneas de pedido.
- Checkbox por producto: `Desde stock`.
- Movimientos automáticos de stock cuando `Desde stock = SI`.
- Remitos PDF e impresión semanal se mantienen en la web.

## Hojas requeridas

El Google Sheets debe tener estas hojas con estos nombres exactos:

- `CLIENTES`
- `PRODUCTOS`
- `PEDIDOS`
- `LINEAS_PEDIDO`
- `STOCK`
- `MOVIMIENTOS_STOCK`

## Columnas obligatorias

### CLIENTES
`ID_CLIENTE | Nombre contacto | Nombre comercio | Celular | Dirección | Ciudad | Horario atención | CUIL | Estado cliente | Fecha alta | Notas`

### PRODUCTOS
`ID_PRODUCTO | Código | Nombre producto | Marca | Tipo | Categoría | Costo | % Markup | Precio final | Ganancia unitaria | Activo`

Importante: la web toma el precio desde `Precio final` y el costo desde `Costo`.

### PEDIDOS
`ID_PEDIDO | N° Remito | ID_CLIENTE | Fecha creación | Fecha entrega | Estado pedido | Estado cobro | Observaciones | Total pedido | Ganancia total`

### LINEAS_PEDIDO
`ID_LINEA | ID_PEDIDO | ID_PRODUCTO | Cantidad bultos | Precio unitario | Costo unitario | Subtotal | Costo total | Ganancia | Desde stock`

### STOCK
`ID_PRODUCTO | Código | Nombre producto | Stock actual | Stock mínimo | Stock máximo | Última actualización`

### MOVIMIENTOS_STOCK
`ID_MOVIMIENTO | Fecha | ID_PRODUCTO | Código | Nombre producto | Tipo | Cantidad | Origen | ID_REFERENCIA | Observaciones`

## Cómo instalar Apps Script

1. Abrí tu Google Sheet.
2. Andá a `Extensiones > Apps Script`.
3. Borrá el contenido inicial.
4. Pegá el contenido del archivo `apps-script/Code.gs`.
5. Guardá.
6. Tocá `Implementar > Nueva implementación`.
7. Tipo: `Aplicación web`.
8. Ejecutar como: `Yo`.
9. Quién tiene acceso: `Cualquier persona`.
10. Copiá la URL que termina en `/exec`.

## Cómo conectar la web

1. Subí los archivos de esta carpeta a GitHub.
2. Abrí tu web.
3. Entrá en `Configuración`.
4. Pegá la URL del Apps Script en `SCRIPT_URL`.
5. Guardá.
6. Tocá `Actualizar`.

## Stock

En cada línea del pedido aparece un checkbox `Desde stock`.

- Si está tildado: crea un movimiento `SALIDA` en `MOVIMIENTOS_STOCK` y actualiza `STOCK`.
- Si no está tildado: no toca stock.

Para cargar stock grande, agregá entradas en `MOVIMIENTOS_STOCK` con:

- `Tipo = ENTRADA`
- `Origen = COMPRA`

Luego el stock se actualiza cuando haya movimientos desde la web. Más adelante se puede hacer un botón para recalcular todo el stock.

## Advertencia importante

Esta es la primera versión migrada a Sheets. No cargues producción completa sin probar antes:

- 1 cliente
- 2 productos
- 1 pedido
- 2 líneas
- una línea con Desde stock y otra sin Desde stock
