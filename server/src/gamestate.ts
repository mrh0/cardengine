export class Prop<T> {
    private _value: T;
    private _state: GameState;
    private _name: string;
    constructor(name:string, value: any, state: GameState) {
        this._state = state;
        this._name = name;
        this._value = value;
    }
    get value(): T {
        return this._value;
    }
    set value(value: T) {
        this._state.onChange(this);
        this._value = value;
    }
    get name(): string {
        return this._name;
    }
}

export class GameState {
    private _props = {};
    onChange(prop: Prop<any>) {
        console.log("Change!");
    }
    create<T>(name: string, value?: T): Prop<T> {
        return this._props[name] = new Prop<T>(name, value, this);
    }
    get(name: string) {
        return this._props[name];
    }
}