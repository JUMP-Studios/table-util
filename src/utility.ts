export function isTable(value: unknown): value is TableType {
	return type(value) === "table";
}
