import { ClientCard, COLORS, Packet, ClientNetData, playerColors, removeFromArray } from "./commons.js";
import { ClientGame } from "./clientgame.js";
import { WebSocketHandler } from "./ws";
import { UICard, createCard, addElem, updatePlayer, addPlayerCard, showFrontMessage, setPlayerTurn, selectCol, updateCardPos, showColorSelector, playerHand, dist, spinnerAnimationTick, setSpinnerDirection, displayPlayable, skipAnimation, setStack, playOtherClientCard, showQuickTimeUno, hideQuickTimeUno, hidePlayCountSelect, showPlayCountSelect, unfreezeAll } from "./ui.js";
const UNOCARDS = generateUnoCards();
let topCard: UICard;

function generateUnoCards() {
    let cards: {[key: string]: ClientCard} = {};
    function push(card: ClientCard) {
        cards[card.name] = card;
    }
    for(let c = 0; c < 4; c++) {
        let color = COLORS[c];
        for(let i = 0; i < 10; i++) {
            push({name:color.name+"-"+i, value: i, color: color.id});
        }
        push({name:color.name+"-skip", value: 10, color: color.id});
        push({name:color.name+"-reverse", value: 11, color: color.id});
        push({name:color.name+"-picker", value: 12, color: color.id});
    }
    for(let c = 0; c < 5; c++) {
        let color = COLORS[c];
        push({name:color.name+"-changer", value: 20, color: color.id});
        push({name:color.name+"-pick-four", value: 30, color: color.id});
    }

    push({name:"back", value: -1, color: 4});

    return cards;
}

export class UnoGameClient extends ClientGame {
    private hand: ClientCard[];
    private myId: string;
    public static direction: number;
    public _turn: string;
    public static preformedAction = false;
    public rules: {
        canPlusStack: boolean,
        canJumpIn: boolean,
        drawUntilPlay: boolean,
        quicktime: boolean,
        playMultiple: boolean,
        startCards: number,
        specials: {
            ORotate: boolean,
            wildShuffleHands: boolean,
            wildPeek: boolean,
            wildExchangeHands: boolean,
            wildShufflePlayers: boolean
        }
    };
    public static countselect: (all: boolean) => void;
    public static instance: UnoGameClient;


    constructor(ws: WebSocketHandler, id: string) {
        super(ws);
        this.hand = [];
        this.myId = id;
        UnoGameClient.instance = this;
    }

    start() {
        console.log("GameClient start");
        UnoGameClient.load();
    }

    onnetevent(packet: Packet) {
        console.log("netevent", packet.type, packet.data);
        switch(packet.type) {
            case "game/uno/set-top":
                UnoGameClient.setTopCard(packet.data.card.name);
                unfreezeAll();
                UnoGameClient.instance.showHighlightedCards();
                break;
            case "game/uno/set-cards":
                let cards: ClientCard[] = packet.data.cards;
                for(let k in packet.data.counts)
                    updatePlayer(k, packet.data.counts[k], this.myId);
                break;
            case "game/uno/draw-card":
                if(packet.data.client.id == this.myId)
                    addPlayerCard(packet.data.card.name);
                break;
            case "game/uno/draw-card-finish":
                if(packet.data.client.id == this.myId)
                    UnoGameClient.instance.showHighlightedCards();
                break;
            case "game/uno/new-turn":
                let turndata = packet.data as {previous: ClientNetData, turn: ClientNetData};
                setPlayerTurn(turndata.turn.id);
                this._turn = turndata.turn.id
                if(turndata.turn.id == this.myId) {
                    showFrontMessage("It's Your Turn!", playerColors[turndata.previous.color], playerColors[turndata.turn.color]);
                    UnoGameClient.preformedAction = false;
                }
                UnoGameClient.instance.onMyRound();
                break;
            case "game/uno/reverse":
                let revdata = packet.data as {direction: number};
                UnoGameClient.direction = revdata.direction;
                setSpinnerDirection(UnoGameClient.direction);
                break;
            case "game/uno/skip":
                let skipdata = packet.data as {client: ClientNetData, color: number};
                skipAnimation(skipdata.client, skipdata.color, this.myId);
                break;
            case "game/uno/game-end":
                let enddata = packet.data as {winner: ClientNetData};
                alert("Winner: " + enddata.winner.name);
                break;
            case "game/uno/game-ready":
                this.ongameready();
                break;
            case "game/uno/stack":
                let stackdata = packet.data as {stack: number};
                setStack(stackdata.stack);
                break;
            case "game/uno/quicktime":
                showQuickTimeUno();
                break;
            case "game/uno/quicktime-finish":
                let quickfdata = packet.data as {quickest: ClientNetData};
                hideQuickTimeUno(quickfdata.quickest.color);
                break;
            case "game/uno/card-played":
                let playdata = packet.data as {client: ClientNetData, card: string};
                if(playdata.client.id != this.myId)
                    playOtherClientCard(playdata.client.id, playdata.card);
                break;
            case "game/uno/color-select":
                showColorSelector(true);
                break;
        }
    }

    ongameready() {
        UnoGameClient.io.request<{get: any}>("game/uno/rules", {}).then((data) => {
            this.rules = data.get;
        }).catch((e) => {

            console.error(e);
        });
    }

    isMyTurn() {
        return this._turn == this.myId;
    }

    async playCard(card: UICard) {
        if(UnoGameClient.preformedAction || !this.isMyTurn()) {
            unfreezeAll();
            updateCardPos();
            return;
        }
        UnoGameClient.preformedAction = true;
        console.log(card.name);
        card.setAttribute("freeze", "");
        let playAll = false;
        for(let e of playerHand) {
            if(e.name == card.name && e != card){
                showPlayCountSelect();
                let p = new Promise<boolean>((resolve, reject) => {
                    UnoGameClient.countselect = resolve;
                });
                playAll = await p;
                UnoGameClient.countselect = null;
                hidePlayCountSelect();
                break;
            }
        }
        UnoGameClient.io.request<{selectColor: boolean}>("game/uno/play-card", {card: card.name, all: playAll}).then((data) => {
            removeFromArray(playerHand, card);
            card.freezeRemove();
            if(playAll) {
                /*for(let e of playerHand) {
                    if(e.name == card.name){
                        removeFromArray(playerHand, e);
                        e.remove();
                        console.log("Removed: " + e.name);
                    }
                }*/
                let del = playerHand.filter((e) => {
                    return e.name == card.name;
                });
                for(let e of del) {
                    removeFromArray(playerHand, e);
                    e.remove();
                    console.log("Removed: " + e.name);
                }
            }
            updateCardPos();
            this.showHighlightedCards();
            UnoGameClient.preformedAction = true;
        }).catch((e) => {
            card.removeAttribute("freeze");
            UnoGameClient.preformedAction = false;
            updateCardPos();
            console.error(e);
        });
    }

    onMyRound() {
        this.showHighlightedCards();
    }

    showHighlightedCards() {
        let t = UNOCARDS[topCard.name];
        let r = displayPlayable((card) => {
            let c = UNOCARDS[card.name];
            if(!UnoGameClient.instance.isMyTurn())
                return false;
            if(t.value == c.value)
                return true;
            if(t.color == c.color)
                return true;
            if(c.color == 4)
                return true;
        });
        if(r || !UnoGameClient.instance.isMyTurn() || UNOCARDS[topCard.name].color == 4)
            document.getElementById("pile").removeAttribute("highlight");
        else
            document.getElementById("pile").setAttribute("highlight", "");
    }

    static setTopCard(name: string) {
        if(topCard)
            topCard.parentNode.removeChild(topCard);
        topCard = createCard(name);
        topCard.setAttribute("id", "top-card");
        addElem("board", topCard);
    
        let w = window.innerWidth;
        let h = window.innerHeight;
        topCard.setPos(w/2, h/2);
    }
    
    static sendSelectColor(color: number) {
        this.io.request("game/uno/select-color", {color: color}).then((data) => {
            console.log(data);
            selectCol(color);
        }).catch((e) => {
            console.error(e);
        });
    }

    static drawPile() {
        this.io.request("game/uno/draw-pile", {}).then((data) => {
            console.log(data)
        }).catch((e) => {
            console.error(e);
        });
    }

    static clickQuicktime() {
        this.io.request("game/uno/quicktime-click", {}).then((data) => {
        }).catch((e) => {
            console.error(e);
        });
    }

    static load() {
        //Events
        document.addEventListener("dragstart", (evt) => evt.preventDefault())
        document.addEventListener("dragend", (evt) => evt.preventDefault())
        document.addEventListener("drag", (evt) => evt.preventDefault())

        document.addEventListener('mousemove', (evt) => {
            if(UICard.dragged){
                UICard.dragged.setPos(evt.clientX + UICard.draggedStartX, evt.clientY + UICard.draggedStartY);
            }
        }, false)

        document.addEventListener('mouseup', (evt) => {
            if(UICard.dragged){
                UICard.dragged.removeAttribute("moving");
                
                let w = window.innerWidth;
                let h = window.innerHeight;
                if(dist(evt.clientX, evt.clientY, w/2, h/2) < 100) {
                    UICard.dragged.setPos(w/2, h/2);
                    UnoGameClient.instance.playCard(UICard.dragged);
                }
                else
                    updateCardPos();
                UICard.dragged = null;
            }
        }, false);
        
        document.getElementById('pile').addEventListener('click', (evt) => {
            UnoGameClient.drawPile();
        });

        document.getElementById('cSelRed').addEventListener('click', (evt) => {
            UnoGameClient.sendSelectColor(0);
        });
        document.getElementById('cSelYellow').addEventListener('click', (evt) => {
            UnoGameClient.sendSelectColor(1);
        });
        document.getElementById('cSelGreen').addEventListener('click', (evt) => {
            UnoGameClient.sendSelectColor(2);
        });
        document.getElementById('cSelBlue').addEventListener('click', (evt) => {
            UnoGameClient.sendSelectColor(3);
        });

        document.getElementById('quicktime').addEventListener('click', (evt) => {
            UnoGameClient.clickQuicktime();
        });

        document.getElementById('play-all').addEventListener('click', (evt) => {
            if(UnoGameClient.countselect)
                UnoGameClient.countselect(true);
        });

        document.getElementById('play-one').addEventListener('click', (evt) => {
            if(UnoGameClient.countselect)
                UnoGameClient.countselect(false);
        });

        window.requestAnimationFrame(UnoGameClient.AnimationTick);
    }

    static AnimationTick() {
        spinnerAnimationTick(UnoGameClient.direction);
        window.requestAnimationFrame(UnoGameClient.AnimationTick);
    }

    onjoined(packet) {

    }

    onleft(packet) {

    }
}





