export interface MenuRoute {
    name?: string,
    next?: {[key: string]: MenuRoute},
    open?: (from: MenuRoute) => void,
    close?: (to: MenuRoute) => void
};

export class MenuSystem {
    private _root: MenuRoute;
    private _current: MenuRoute;
    private _stack: MenuRoute[];

    constructor(root: MenuRoute) {
        this._root = root;
        this._current = root;
        this._stack = [root];
    }

    get(...path: string[]): MenuRoute {
        let m = this._root;
        for(let e in path) {
            m = MenuSystem.snav(e, m);
            if(!m)
                return this._root;
        }
        return m;
    }

    current() {
        return this._current;
    }

    navigate(name: string) {
        let n = this.current().next[name];
        this.nav(n);
        this._stack.push(this._current);
        console.log("push", this._stack)
    }

    rootNavigate(...path: string[]) {
        this._stack = [this._root];
        this._current = this._root;
        this.nav(this.get(...path));
        this._stack.push(this._current);
    }

    back() {
        this._stack.pop();
        let n = this._stack[this._stack.length-1];
        this.nav(n);
        console.log("pop", this._stack)
    }

    private nav(n: MenuRoute) {
        if(!n)
            return;
        if(this._current.close instanceof Function)
            this._current.close(n);
        if(n.open instanceof Function)
            n.open(this._current);
        this._current = n;
    }

    private static snav(n: string, m: MenuRoute) {
        if(!m.next)
            return null;
        return m.next[n];
    }
}

export function showMenu(name: string) {
    document.getElementById(name).removeAttribute("hide");
}
export function hideMenu(name: string) {
    document.getElementById(name).setAttribute("hide", "");
}
export function addNavigate(sys: MenuSystem,id: string, name: string) {
    let e = document.getElementById(id);
    e.addEventListener('click', (evt) => {
        if(e.hasAttribute("disable"))
            return;
        sys.navigate(name);
    });
}
export function addBack(sys: MenuSystem, id: string) {
    document.getElementById(id).addEventListener('click', (evt) => {
        sys.back();
    });
}