import Object from "@rbxts/object-utils";
import { isTable } from "./utility";

export default function reconcile<O extends TableType = {}, N extends TableType = {}>(
	t1: O,
	t2: N,
	overwriteValues?: boolean,
): MergeResult<O, N> {
	if (overwriteValues) {
		for (const [key, value] of Object.entries(t2)) {
			if (isTable(t1[key as keyof O]) && isTable(value)) {
				reconcile(t1[key as keyof O] as TableType, value as TableType, true) as MergeResult<
					O,
					N
				>[keyof MergeResult<O, N>];
			} else {
				t1[key as keyof O] = value as O[keyof O];
			}
		}
	} else {
		for (const [key, val] of Object.entries(t2)) {
			if (t1[key as keyof O] === undefined) {
				t1[key as keyof O] = val as O[keyof O];
			} else if (isTable(t1[key as keyof O]) && isTable(t2[key as keyof N])) {
				reconcile(t1[key as keyof O] as TableType, t2[key as keyof N] as TableType) as MergeResult<
					O,
					N
				>[keyof MergeResult<O, N>];
			}
		}
	}

	return t1 as MergeResult<O, N>;
}
