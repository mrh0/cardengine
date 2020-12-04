import { ClientNetData, playerColors, waitFor, pick } from "./commons.js";

export function generateList<T>(root: HTMLElement, list: T[], func: (item: T, index: number) => HTMLElement) {
    for(let i = 0; i < list.length; i++) {
        root.appendChild(func(list[i], i));
    }
}
//Source https://css-tricks.com/snippets/javascript/htmlentities-for-javascript/ 2020-07-28
export function safe(str: string): string {
    return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

export function createCardDom(image: string): {card: HTMLElement, img: HTMLElement} {
    let img = elem("img", {src: "/resources/uno/cards/"+image, alt: image});
    let card = elem("div", {class: "card"}, 
        img
    );
    return {card: card, img: img};
}

export function addElem(id: string, elem: HTMLElement): HTMLElement {
    document.getElementById(id).appendChild(elem);
    return elem;
}

type ChildType = HTMLElement | Array<HTMLElement> | string;

export function elem(name: string | Function, props: {[key: string]: string}, ... children: ChildType[]): HTMLElement {
    //let children = args.length ? [].concat(...args) : null;

    if(name instanceof Function)
        return name(props);

    let el= document.createElement(name);

    if(props) {
        for(let key in props) {
            let val = props[key];
            if(key === 'content') {
                el.innerText = safe(val);
                continue;
            }
            if(val) // key !== "selected" || 
                el.setAttribute(key, val);
        }
       
        for(let child of children) {
            if(typeof child === 'string' || typeof child !== 'object')
                el.appendChild(document.createTextNode(safe(child)))
            else if (child instanceof Array)
                child.map(c=>el.appendChild(c));
            else
                el.appendChild(child);
        }
        return el;
    }
}

export class UICard extends HTMLElement{
    private _shadow: ShadowRoot;
    private _name: string;
    private _x: number;
    private _y: number;
    private _can_drag = false;
    static dragged: UICard;
    static draggedStartX = 0;
    static draggedStartY = 0;

    constructor() {
        super();
        this._shadow = this.attachShadow({mode: 'open'});
        this.addEventListener('mousedown', (evt) => {
            if(!UICard.dragged && this.canDrag()){
                UICard.draggedStartX = this._x - evt.clientX;
                UICard.draggedStartY = this._y - evt.clientY;
                UICard.dragged = this;
                this.setAttribute("moving", "");
            }
        }, false);
        this.addEventListener('mouseover', (evt) => {
            if(this.canDrag()){
                let h = window.innerHeight;
                this.setPos(this._x, h-120);
                this.setRot(0);
                this.setAttribute("hover", "");
            }
        }, false);
        this.addEventListener('mouseout', (evt) => {
            if(this.canDrag()){
                let h = window.innerHeight;
                updateCardPos();
                this.removeAttribute("hover");
            }
        }, false);
    }

    get name() {
        return this._name;
    }

    getImagePath(): string {
        return this._name.replace(/-/g, "_") + ".png";
    }

    render() {
        this._name = this.getAttribute("name");
        this._shadow.appendChild(createCardDom(this.getImagePath()).card);
    }

    remove() {
        this.parentNode.removeChild(this);
    }

    async freezeRemove() {
        this._can_drag = false;
        this.setAttribute("freeze", "");
        await waitFor(300);
        this.remove();
    }

    canDrag() {
        return this._can_drag && !this.hasAttribute("freeze");
    }

    setDraggable(b: boolean) {
        this._can_drag = b;
    }

    get width() {
        return 130;
    }

    get height() {
        return 182;
    }

    get x() {
        return this._x;
    }

    get y() {
        return this._y;
    }

    setPos(x: number, y: number) {
        let w = window.innerWidth;
        let h = window.innerHeight;

        this.style.left = "calc(" + (x/w)*100 + "vw - " + this.width/2 + "px)";
        this.style.top = "calc(" + (y/h)*100 + "vh - " + this.height/2 + "px)";
        this._x = x;
        this._y = y;
    }

    setRot(angle: number) {
        this.style.transform = "rotateZ("+angle+"deg)";
    }

    setHighlighted(state: boolean) {
        if(state)
            this.setAttribute("highlight", "");
        else
            this.removeAttribute("highlight");
    }
}
customElements.define('ui-card', UICard);

export function createCard(name: string) {
    let c = document.createElement("ui-card") as UICard;
    c.setAttribute("name", name);
    c.render();
    return c;
}

export function dist(x1: number, y1: number, x2: number, y2: number) {
    return Math.sqrt((x1-x2) ** 2 + (y1-y2) ** 2);
}

export const playerHand:UICard[] = [];

export function updateCardPos() {
    let w = window.innerWidth;
    let h = window.innerHeight;
    for(let i = 0; i < playerHand.length; i++) {
        if(playerHand[i].hasAttribute("freeze"))
            continue;
        let cs = Math.min(100, w/playerHand.length);
        let d = playerHand.length * cs;
        let mid = w/2 + 65;
        playerHand[i].setPos(mid + i * cs - d/2, h - 100);
        playerHand[i].setRot((i - playerHand.length/2) / playerHand.length * 20);
        playerHand[i].style.zIndex = i+"";
    }
}

export function displayPlayable(func: (card: UICard) => boolean) {
    let r = false;
    for(let i = 0; i < playerHand.length; i++) {
        let k = func(playerHand[i]);
        playerHand[i].setHighlighted(k);
        if(k)
            r = true;
    }
    return r;
}

export const playerElements: {[key: string]:{player: HTMLElement, cards: HTMLElement, count: HTMLElement}} = {};

export function createPlayer(id: string, name: string, me: boolean, color: number) {
    let count = elem("p", {class: "player-cards-number", content: "0"});
    let cards = elem("div", {class: "player-cards"});
    let player = elem("div", {class: "player", id: "player-" + id},
        elem("p", {class: "player-username", content: name}),
        count,
        cards
    )
    if(me)
        player.setAttribute("me", "");
    player.style.borderLeft = "8px solid var(--pcol"+color+")";
    player.style.animationName = "playerFade"+color;
    addElem("players", player);
    playerElements[id] = {player: player, cards: cards, count: count};
    return playerElements[id];
}

export function populatePlayers(clients: ClientNetData[], myId: string) {
    let players = document.getElementsByClassName("player");
    /*for(let p of players) {
        p.parentNode.removeChild(p);
    }*/
    document.getElementById("players").innerHTML = ""; //Why does only this work???
    while(clients[0].id != myId)
        clients.push(clients.shift());
    for(let i = 0; i < clients.length; i++) {
        let c = clients[i];
        let p = createPlayer(c.id, c.name, c.id == myId, c.color);
        p.player.setAttribute("index", i+"");
    }
}

export function getPlayerPos(id: string): {x: number, y: number} {
    let ww = window.innerWidth;
    let wh = window.innerHeight;
    let all = document.getElementsByClassName("player");
    let p = getPlayerElement(id);
    if(p.hasAttribute("me") || p.getAttribute("index") == "0" || all.length-1 <= 0)
        return {x: ww/2, y: wh-64};
    let i = Number.parseInt(p.getAttribute("index")) - 1;
    let w = ww / (all.length-1);
    console.log(w, ww, all.length-1, i);
    return {x: (w * i + w/2), y: 48}
}

export function updatePlayer(id: string, count: number, myid: string) {
    let p = playerElements[id];
    if(p) {
        p.count.innerText = safe(count+"");
        if(id == myid)
            return;
        //for(let e of p.cards.children)
        //    p.cards.removeChild(e);
        p.cards.innerHTML = "";
        for(let i = 0; i < Math.min(count, 20); i++) {
            let e = document.createElement("div");
            e.className = "player-card";
            p.cards.appendChild(e);
        }
    }
}

export async function addPlayerCard(name: string) {
    let c = createCard(name) as UICard;
    c.setDraggable(true);
    for(let i = 0; i < playerHand.length+1; i++) {
        if(i >= playerHand.length) {
            playerHand.push(c);
            break;
        }
        if(playerHand[i].name > c.name) {
            playerHand.splice(i, 0, c);
            break;
        }
    }
    addElem("player-hand", c); 
    c.setPos(-24, window.innerHeight/2);
    await waitFor(100);
    updateCardPos();
}

export function showFrontMessage(text: string, col1: string, col2: string): void {
    let fm = document.getElementById("frontmessage");
    let fmb = document.getElementById("frontmessagebar");
    fm.style.backgroundColor = col1;
    fmb.style.backgroundColor = col2;
    fm.setAttribute("show", "");
    document.getElementById("frontmessagetext").innerHTML = text;
    setTimeout(() => {
        let fm = document.getElementById("frontmessage");
        let fmb = document.getElementById("frontmessagebar");
        fm.removeAttribute("show");
        fm.style.backgroundColor = fmb.style.backgroundColor;
    }, 2000);
}

export function showColorSelector(b: boolean): void {
    let sel = document.getElementById("colorSelector");
    if(b){
        sel.removeAttribute("hide");
        sel.removeAttribute("selcol_0");
        sel.removeAttribute("selcol_1");
        sel.removeAttribute("selcol_2");
        sel.removeAttribute("selcol_3");
    }
    else{
      sel.setAttribute("hide", "");
    }
}

export function selectCol(col: number): void {
    let sel = document.getElementById("colorSelector");
    sel.setAttribute("selcol_"+col, "");
    setTimeout(() => {
        showColorSelector(false);
    }, 500);
}

export function setPlayerTurn(id: string) {
    let a = document.getElementsByClassName("player");
    for(let e of a) {
        e.removeAttribute("turn");
    }
    let p = getPlayerElement(id);
    p.setAttribute("turn", "");
}

export function getPlayerElement(id: string) {
    return document.getElementById("player-"+id);
}

export function startGameUI() {
    let d = document.getElementById("darkout");
    d.style.opacity = "0";
    setTimeout(() => {
        d.style.visibility = "hidden";
    }, 1000)
}


let spinnerAngle = 0;

export function spinnerAnimationTick(direction: number): void {
    let elem = document.getElementById("dirIndic");
    elem.style.transform = "rotate(" + spinnerAngle * (direction || 1) + "deg)";
    spinnerAngle += 30 * (1/60);
    if(spinnerAngle > 360)
        spinnerAngle %= 360;
}

export function setSpinnerDirection(direction: number){
    let elem = document.getElementById("dirIndic");
    if(direction == 1)
      document.getElementById("dirIndic").removeAttribute("reverse");
    else
        document.getElementById("dirIndic").setAttribute("reverse", "");
    
    elem.setAttribute("fx", "");
    setTimeout(() => {
        document.getElementById("dirIndic").removeAttribute("fx");
    }, 250);
}

export async function skipAnimation(client: ClientNetData, color: number, myid: string) {
    let ww = window.innerWidth;
    let wh = window.innerHeight;
    const a = [
        'skip-red',
        'skip-yellow',
        'skip-green',
        'skip-blue'
    ];
    let p = getPlayerElement(client.id);
    console.log(color, a[color], document.getElementById(a[color]));
    let e = document.getElementById(a[color]);
    e.removeAttribute("hide");
    await waitFor(250);
    let pos = getPlayerPos(client.id);
    console.log(pos);
    e.style.left = (pos.x - 24) + "px";
    e.style.top = (pos.y - 24) + "px";
    await waitFor(2000);
    e.setAttribute("hide", "");
    e.style.top = "calc(50vh - 24px)";
    e.style.left = "calc(50vw - 24px)";
}

export async function setStack(n: number) {
    let e = document.getElementById("stack");
    if(n > 0) {
        e.innerText = "+" + n;
        e.removeAttribute("hide");
    }
    else {
        e.setAttribute("hide", "");
    }
}

export async function showQuickTimeUno() {
    let e = document.getElementById("quicktime");
    e.removeAttribute("hide");
    e.removeAttribute("over");
    let x = pick(25, 50, 75);
    let y = pick(25, 50, 75);
    e.style.left = "calc("+x+"vw - 100px)";
    e.style.top = "calc("+y+"vh - 50px)";
}

export async function hideQuickTimeUno(color: number) {
    let e = document.getElementById("quicktime");
    e.style.borderColor = playerColors[color];
    e.style.color = playerColors[color];
    e.setAttribute("over", "");
    await waitFor(1500);
    e.setAttribute("hide", "");
    e.removeAttribute("over");
}

export async function playOtherClientCard(client: string, card: string) {
    let pos = getPlayerPos(client);
    let c = createCard(card);
    addElem("card-play", c);
    c.setPos(pos.x, pos.y);
    await waitFor(100);
    c.setPos(window.innerWidth/2, window.innerHeight/2);
    await waitFor(2000);
    c.remove();
}

export function setVisible(name: string, b: boolean) {
    let e = document.getElementById(name);
    if(!e)
        return;
    if(b)
        e.removeAttribute("hide");
    else
        e.setAttribute("hide", "");
}

export function updateRules(rules: any, elem: string) {
    let b = document.getElementById(elem);

}

export function showPlayCountSelect() {
    setVisible("play-count", true);
}

export function hidePlayCountSelect() {
    setVisible("play-count", false);
}

export function unfreezeAll() {
    let cards = document.getElementsByClassName("card");
    for(let c of cards) {
        c.removeAttribute("freeze");
    }
}