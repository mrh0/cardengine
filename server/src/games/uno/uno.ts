import { Game } from "../../game";
import { Card, waitFor } from "../../commons";
import { Client } from "../../client";
import { Hand } from "../../deck";
import { UnoCard, drawRandom, getNewWild } from "./cards";
import { Lobby } from "../../lobby";
import { mod } from "../../util";

type UnoPlayer = {hand: Hand};

export class UnoGame extends Game<UnoPlayer> {
    
    private _top: UnoCard;
    private _turn: Client;
    private _direction: number;
    private _turnActionPreformed: boolean;
    private _pause: boolean;
    private _awaitingColor: Client;
    private _hasDrawn: boolean;
    private _stack: number;
    private _quicktime: (client: Client) => void;
    private _colorselect: (client: Client) => void;
    private _rules = {
        canPlusStack: true,
        canJumpIn: false,
        drawUntilPlay: true,
        quicktime: true,
        playMultiple: true,
        startCards: 7,
        maxCards: 50,
        specials: {
            ORotate: false,
            wildShuffleHands: false,
            wildPeek: false,
            wildExchangeHands: false,
            wildShufflePlayers: false
        }
    };
    
    //setup
    get name() {
        return "uno";
    }

    get top() {
        return this._top;
    }

    get direction() {
        return this._direction;
    }

    getNextTurn(n = 1): Client {
        let lobby = this.getLobby();
        let clients = lobby.clients;
        let newTurn: Client = null;
        for(let i = 0; i < clients.length; i++) {
            if(clients[i] == this._turn) {
                newTurn = clients[mod(i+this.direction*n, clients.length)];
                break;
            }
        }
        if(!newTurn) {
            if(clients.length == 0)
                this.panic("No clients connected when calculating next turn");
            newTurn = clients[0];
        }
        return newTurn;
    }

    async onNewTurn(n) {
        let newTurn = this.getNextTurn(n);
        if(!newTurn)
            return false;
        this.broadcast({type: "game/uno/new-turn", data: {previous: this._turn.getData(), turn: newTurn.getData()}, accepted: true});
        this._turn = newTurn;
        this._turnActionPreformed = false;
        this._hasDrawn = false;
        this.netCards();
    }

    get turn() {
        return this._turn;
    }

    onPlayerInit(client: Client): UnoPlayer {
        return {hand: new Hand()};
    }

    onPlayerLeave(client: Client) {
        if(this.myTurn(client))
            this.nextTurn();
    }

    rules() {
        return this._rules;
    }

    setRules(r: any) {
        this._rules.canJumpIn = r.canJumpIn ? true : false;
        this._rules.canPlusStack = r.canPlusStack ? true : false;
        this._rules.drawUntilPlay = r.drawUntilPlay ? true : false;
        this._rules.playMultiple = r.playMultiple ? true : false;
        this._rules.quicktime = r.quicktime ? true : false;
        this._rules.startCards = r.startCards instanceof Number ? (r.startCards > 2 && r.startCard < 13 ? r.startCard : 7) : 7;
    }

    start() {
        super.start();
        console.log("server game start");
        this.beginGame();
        this._turn = this.getLobby().clients[0];
        this._stack = 0;
    }

    listeners() {
        this.addRequestListener("game/uno/play-card", async (client, data, result, reject) => {
            console.log(data.card);
            let card = UnoCard.fromName(data.card);
            if(!card)
                return reject("invalid card (" + card + ")");
            if(!this.canPlayerPlay(client, card))
                return reject("can't be played");
            if(!this.myTurn(client))
                return reject("not my turn");
            if(data.all && !this.rules().playMultiple)
                return reject("play multiple not enabled");
            if(data.all) {
                let pulled = this.getPlayer(client).hand.pullAll(card);
                console.log("removed", pulled);
                if(pulled.length < 1)
                    return reject("not synced, missing: (" + card + ")");
            }
            else {
                let pulled = this.getPlayer(client).hand.pull(card);
                if(!pulled)
                    return reject("not synced, missing: (" + card + ")");
            }
            this._turnActionPreformed = true;
            
            this.onPlayCard(client, card);
            
            let player = this.getPlayer(client);
            result({});

            if(card.isWild()) {
                this._awaitingColor = client;
                await this.onColorSelectRequest(client);
            }

            if(this.rules().canPlusStack && this._stack > 0) {
                if(!card.isPicker() && !card.isWildPicker()) {
                    await this.drawFromPile(client, this._stack);
                    await this.setStack(0);
                }
            }

            if(player.hand.isEmpty()) {
                await this.onGameEnd(client);
            }
            else if(player.hand.count() == 1 && this.rules().quicktime) {
                await this.onQuicktime(client);
            }
            if(card.isPicker()) {
                return await this.playPicker(2, this.getNextTurn());
            }
            else if(card.isSkip()) {
                return await this.playSkip();
            }
            else if(card.isReverse()) {
                return await this.playReverse();
            }
            
            this.nextTurn();
            return;
        });
        this.addRequestListener("game/uno/draw-pile", async (client, data, result, reject) => {
            if(!this.myTurn(client))
                return reject("not my turn");
            if(this._hasDrawn)
                return reject("already drawn this round");
            if(this._awaitingColor)
                return reject("can't draw when selecting a color");
            this._hasDrawn = true;
            result({});
            if(this.rules().canPlusStack && this._stack > 0) {
                await this.drawFromPile(client, 1);
                let r = this.getPlayer(client).hand.find((e) => {
                    return (e as UnoCard).isWildPicker() || ((e as UnoCard).isPicker() && (e as UnoCard).color == this._top.color);
                });
                if(!r || r.length < 1) {
                    await this.drawFromPile(client, this._stack);
                    await this.setStack(0);
                    this.nextTurn();
                }

            }
            else if(this.rules().drawUntilPlay) {
                let r = this.getPlayer(client).hand.find((e) => {
                    return this.top.canStack((e as UnoCard));
                });
                if(r && r.length > 0) {
                    await this.drawFromPile(client, 1);
                    this.nextTurn();
                }
                else {
                    await this.drawFromPileUntil(client, (card) => {
                        return !this.top.canStack(card);
                    });
                }
            }
            else {
                await this.drawFromPile(client, 1);
                this.nextTurn();
            }
        });
        this.addRequestListener("game/uno/select-color", async (client, data, result, reject) => {
            if(!this.myTurn(client))
                return reject("not my turn");
            if(this._awaitingColor == null || this._awaitingColor != client)
                return reject("not awaiting color select");

            result({});
            
            let w = getNewWild(this._top.name, data.color);
            if(w == null)
                return reject("invalid color");
            this._awaitingColor = null;
            this.setTop(w);

            if(w.isWildPicker()) {
                this.playPicker(4, this.getNextTurn());
                return;
            }
            else {
                if(this.rules().canPlusStack && this._stack > 0) {
                    await this.drawFromPile(client, this._stack);
                    await this.setStack(0);
                }
            }

            if(this._colorselect)
                this._colorselect(client);
            this._colorselect = null;
        });
        this.addRequestListener("game/uno/quicktime-click", async (client, data, result, reject) => {
            if(!this.rules().quicktime)
                return reject("quicktime event not enabled");
            if(this._quicktime)
                this._quicktime(client);
            this._quicktime = null;
            result({});
        });
        this.addRequestListener("game/uno/rules", async (client, data, result, reject) => {
            if(data.set) {
                if(client == this.getLobby().host) {
                    this.setRules(data.set);
                }
                else 
                    return reject("not host");
            }
            result({get: this.rules()});
        });
    }

    //game logic
    async playPicker(n: number, client: Client) {
        if(this.rules().canPlusStack) {
            await this.setStack(this._stack + n);
        }
        else {
            await this.drawFromPile(client, n);
        }
        await waitFor(250);
        this.nextTurn();
    }

    async playSkip() {
        this.broadcast({type: "game/uno/skip", data: {client: this.getNextTurn(1).getData(), color: this.top.color.id}, accepted: true});
        await waitFor(1000);
        this.nextTurn(2);
    }

    async playReverse() {
        this._direction = this._direction == 1 ? -1: 1;
        this.broadcast({type: "game/uno/reverse", data: {direction: this._direction}, accepted: true});
        await waitFor(250);
        this.nextTurn();
    }

    async onColorSelectRequest(client: Client) {
        client.send({type: "game/uno/color-select", data: {}, accepted: true});
        let p = new Promise<Client>((resolve, reject) => {
            this._colorselect = resolve;
        });
        let c = await p;
        this._colorselect = null;
    }
s
    onPlayCard(client: Client, card: UnoCard) {
        this.broadcast({type: "game/uno/card-played", data: {card: card.name, client: client.getData()}, accepted: true});
        this.netCards();
        this.setTop(card);
    }

    onGameEnd(winner: Client) {
        this.broadcast({type: "game/uno/game-end", data: {winner: winner.getData()}, accepted: true});
        this.setPaused(true);
        console.log("game ended");
    }

    async onQuicktime(client: Client) {
        this._quicktime = null;
        this.broadcast({type: "game/uno/quicktime", data: {}, accepted: true});
        this.setPaused(true);
        let p = new Promise<Client>((resolve, reject) => {
            this._quicktime = resolve;
        });
        let c = await p;
        if(c != client) {
            await this.drawFromPile(client, 2);
        }
        this.broadcast({type: "game/uno/quicktime-finish", data: {quickest: c.getData()}, accepted: true});
        this._quicktime = null;
    }

    isValidStack(card: UnoCard): boolean {
        return this.top.canStack(card);
    }

    setTop(card: UnoCard) {
        this._top = card;
        this.broadcast({type:"game/uno/set-top", data: {card: card.toClient()}, accepted: true});
    }

    canPlayerPlay(client: Client, card: UnoCard) {
        return this.turn == client && this.isValidStack(card) && !this._turnActionPreformed;
    }

    async setStack(n: number) {
        this._stack = n;
        this.broadcast({type: "game/uno/stack", data: {stack: this._stack}, accepted: true});
        await waitFor(250);
    }

    async drawFromPile(client: Client, n: number) {
        for(let i = 0; i < n; i++) {
            await waitFor(250);
            if(this.getPlayer(client).hand.count() >= this.rules().maxCards)
                break;
            this.drawCard(client);
        }
        await waitFor(250);
        client.send({type: "game/uno/draw-card-finish", data: {client: client.getData()}, accepted: true});
    }

    async drawFromPileUntil(client: Client, func: (card: UnoCard) => boolean) {
        let c: UnoCard = null;
        do {
            await waitFor(250);
            if(this.getPlayer(client).hand.count() >= this.rules().maxCards)
                break;
            c = this.drawCard(client);
        } while(func(c));
        await waitFor(250);
        client.send({type: "game/uno/draw-card-finish", data: {client: client.getData()}, accepted: true});
    }

    async beginGame() {
        //Set top card
        this.broadcast({type: "game/uno/game-ready", data: {}, accepted: true});
        let tc = drawRandom();
        while(tc.isWild())
            tc = drawRandom();
        this.setTop(tc);

        this._direction = 1;
        for(let i = 0; i < this.rules().startCards; i++) {
            await waitFor(250);
            for(let c of this.getLobby().clients) {
                this.drawCard(c);
            }
        }
        await waitFor(250);
        this.nextTurn();
    }

    drawCard(client: Client): UnoCard {
        let c = drawRandom();
        this.broadcastExcept({type: "game/uno/draw-card", data: {client: client.getData()}, accepted: true}, client);
        client.send({type: "game/uno/draw-card", data: {client: client.getData(), card: c.toClient()}, accepted: true});
        this.getPlayer(client).hand.add(c);
        this.netCards();
        return c;
    }

    netCards() {
        let lobby = this.getLobby();
        let counts: {[key: string]: number} = {};
        for(let c of lobby.clients) {
            let player = this.getPlayer(c);
            counts[c.id] = player.hand.cards.length;
        }
        for(let c of lobby.clients) {
            let player = this.getPlayer(c);
            c.send({type: "game/uno/set-cards", data: {cards: player.hand.cards, counts: counts}, accepted: true});
        }
    }

    isPaused() {
        return this._turnActionPreformed || this._pause;
    }

    setPaused(b: boolean) {
        this._pause = b;
    }

    myTurn(client: Client) {
        return this._turn == client;
    }

    isAwaitingColor(): boolean {
        return this._awaitingColor != null;
    }
}