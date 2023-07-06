/* eslint-disable roblox-ts/no-private-identifier */
import Object from "@rbxts/object-utils";

type SignalConnection<T extends RBXScriptSignal> = ReturnType<T["Connect"]>;
type ConnectionParameters<T extends RBXScriptSignal> = Parameters<Parameters<T["Connect"]>[][0][0]>;
type GetArgs<T, F extends void | Callback = void> = F extends Callback
	? Parameters<F>
	: T extends RBXScriptSignal
	? ConnectionParameters<T>
	: Parameters<T>;
type GetArgsOptional<T> = T extends RBXScriptSignal ? Partial<ConnectionParameters<T>> : Partial<Parameters<T>>;
type MaybeConnection<T> = T extends RBXScriptSignal ? SignalConnection<T> : Parameters<T>;

abstract class EventObject {
	readonly destructionCallbacks: ((...args: unknown[]) => void)[] = [];
	doOnce?: boolean;

	once() {
		this.doOnce = true;
	}
	onDestroyed(callback: () => void): void {
		this.destructionCallbacks.push(callback);
	}
}

class EventCallback extends EventObject {
	unsubscribe!: (...args: unknown[]) => void;
	callback: (...args: unknown[]) => void;

	constructor(passedCallback: (...args: unknown[]) => void) {
		super();
		this.callback = passedCallback;
	}
}

export default class Event<
	Signal extends RBXScriptSignal | Callback,
	F extends void | Callback = void,
> extends EventObject {
	connection?: MaybeConnection<Signal>;
	callbacks: Array<EventCallback> = [];

	constructor(signal?: Signal, once?: boolean) {
		super();
		if (typeOf(signal) === "RBXScriptSignal") {
			this.connection = signal
				? ((signal as RBXScriptSignal).Connect((...args: GetArgs<Signal, F>) =>
						this.fire(...(args as GetArgs<Signal>)),
				  ) as MaybeConnection<Signal>)
				: undefined;
		}
		once && this.once();
	}
	subscribe(callback: (...args: GetArgs<Signal, F>) => void, prioritize?: boolean): EventCallback {
		const newCallback = new EventCallback(callback as (...args: unknown[]) => void);
		const unsubscribe = (...args: unknown[]) => {
			this.callbacks.remove(this.callbacks.indexOf(newCallback));

			if (newCallback.destructionCallbacks) {
				for (const destroyCallback of newCallback.destructionCallbacks) {
					destroyCallback(args);
				}
			}
		};

		if (prioritize) {
			this.callbacks.unshift(newCallback);
		} else {
			this.callbacks.push(newCallback);
		}

		newCallback.unsubscribe = unsubscribe;

		return newCallback;
	}
	async wait(...waitArgs: GetArgsOptional<Signal>) {
		return await new Promise<void>((resolve, reject, aborted) => {
			const subscribed = this.subscribe((...args) => {
				const wantSize = waitArgs.size();

				if (wantSize === 0) {
					// If waitArgs is empty or has more elements than args, resolve the promise
					resolve();
				}
				for (let i = 0; i < wantSize; i++) {
					if ((waitArgs as unknown[])[i] !== (args as unknown[])[i]) {
						// If waitArgs has a specific value at an index i and that value doesn't match the value received in args at the same index, return without resolving the promise
						return;
					}
				}
				// If all specific arguments match the received arguments up to the length of waitArgs, resolve the promise
				subscribed.unsubscribe();
				resolve();
			});
			aborted(() => subscribed.unsubscribe());
		});
	}
	fire(...args: GetArgs<Signal>): void {
		Object.copy(this.callbacks).forEach((eventCallback) => {
			const resolve = eventCallback.callback(...(args as defined[]));
			resolve !== undefined || (eventCallback.doOnce && eventCallback.unsubscribe(resolve));
		});

		this.doOnce && this.destroy();
	}
	destroy(): void {
		this.connection && (this.connection as RBXScriptConnection).Disconnect();
		this.callbacks.forEach((eventCallback) => eventCallback.unsubscribe());

		for (const destroyCallback of this.destructionCallbacks) {
			destroyCallback();
		}
	}
}
