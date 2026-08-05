const PREFIX = "column:";

/**
 * El id "sortable" de una columna se prefija para no chocar con el id (sin
 * prefijo) que usa su zona de drop de tarjetas — ver el comentario en
 * `KanbanColumn`. Compartido entre `KanbanColumn` y `KanbanBoard` para que
 * ambos generen/interpreten el mismo formato.
 */
export function columnDragId(statusId: string): string {
  return `${PREFIX}${statusId}`;
}

export function isColumnDragId(id: string): boolean {
  return id.startsWith(PREFIX);
}

export function statusIdFromColumnDragId(id: string): string {
  return id.slice(PREFIX.length);
}
