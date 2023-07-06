type MergeResult<O extends TableType, N extends TableType> = O extends unknown[]
	? N extends unknown[]
		? unknown[]
		: O & N
	: N extends unknown[]
	? N & O
	: O & N;
type TableType = Record<string | symbol | number, unknown> | unknown[];
