import {Client} from "./client";
import {removeFromArray, makeId, makeLobbyId} from "./util";
import { Packet, ClientNetData } from "./commons";
import { Game } from "./game";

export class Lobby {
    private _id: string;
    private _clients: Client[];
    private _state: {playing: boolean};
    private _game: Game<any> | null;
    private _host: Client;
    public takenColors: string[];

    constructor(host: Client) {
        this._id = makeLobbyId(4);
        this._clients = [];
        this._host = host;
        this._state = {playing: false};
        this.takenColors = [];
        for(let i = 0; i < this.maxClients; i++) {
            this.takenColors[i] = null;
        }
    }

    get host(): Client {
        return this._host;
    }
    get id(): string {
        return this._id;
    }
    get playing(): boolean {
        return this._state.playing;
    }
    get game(): Game<any> {
        return this._game;
    }
    get clients(): Client[] {
        return this._clients;
    }
    get maxClients() {
        return 10;
    }
    start(game: Game<any>) {
        this._game = game;
        this._state.playing = true;
        this.broadcast({type: "lobby/starting", data: {game: game.name}, accepted: true});
        setTimeout(() => {
            this.game.start();
        }, 500);
    }
    join(client: Client): boolean {
        if(!this.playing && !this.isIn(client)) {
            this._clients.push(client);
            this.broadcast({type: "lobby/joined", data: {client: client.getData(), clients: this.getAllClientData()}, accepted: true});
            return true;
        }
        return false;
    }
    leave(client: Client): void {
        if(this.isIn(client)) {
            removeFromArray<Client>(this._clients, client);
            if(this.game)
                this.game.onPlayerLeave(client);
            for(let i = 0; i < this.takenColors.length; i++) {
                if(this.takenColors[i] == client.id)
                    this.takenColors[i] = null;
            }
            this.broadcast({type: "lobby/left", data: {client: client.getData(), clients: this.getAllClientData()}, accepted: true});
        }
        if(this.clients.length == 0) {
            this.disband();
        }
    }
    isIn(client: Client): boolean {
        for(let c of this._clients){
            if(c == client)
                return true;
        }
        return false;
    }
    broadcast(packet: Packet): void {
        for(let c of this.clients) {
            c.send(packet);
        }
    }
    broadcastExcept(packet: Packet, client: Client): void {
        for(let c of this.clients) {
            if(c != client)
                c.send(packet);
        }
    }
    broadcastSelect(packet: Packet, clients: Client[]): void {
        for(let c of clients) {
            c.send(packet);
        }
    }
    isFull() {
        return this._clients.length >= this.maxClients;
    }
    getAllClientData(): ClientNetData[] {
        let data: ClientNetData[] = [];
        let i = 0;
        for(let c of this.clients) {
            data[i++] = c.getData();
        }
        return data;
    }
    hasStarted(): boolean {
        return this.game != null && this.playing;
    }
    disband() {
        if(this.game) {
            this.game.disband();
            delete this._game;
        }
        console.log("Disbanded lobby.");
    }
}