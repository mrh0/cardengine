import { Client } from "./client";
import { Packet } from "./commons";
import { Lobby } from "./lobby";
import { WSServer, RequestEvent, RejectEvent, ResultEvent } from "./server";

export abstract class Game<P> {
    private _gameturncount: number;
    private _lobbysupplier: () => Lobby;
    private _serversupplier: () => WSServer;
    private _requestevents: {[key: string]: RequestEvent};
    private _playerdata: {[key: string]: P};

    constructor(lobbySupplier: () => Lobby,  serverSupplier: () => WSServer) {
        this._lobbysupplier = lobbySupplier;
        this._serversupplier = serverSupplier;
        this._requestevents = {};
        this._playerdata = {};
    }

    panic(message: string = "Unexpected error!") {
        console.error("[GAMEPANIC]:" + message);
    }

    start(): void {
        for(let client of this.getLobby().clients) {
            this._playerdata[client.id] =  this.onPlayerInit(client);
        }
        this.listeners();
    }

    getLobby() {
        return this._lobbysupplier();
    }

    getServer() {
        return this._serversupplier();
    }

    broadcast(packet: Packet): void {
        this.getLobby().broadcast(packet);
    }

    broadcastExcept(packet: Packet, client: Client): void {
        this.getLobby().broadcastExcept(packet, client);
    }

    broadcastSelect(packet: Packet, clients: Client[]): void {
        this.getLobby().broadcastSelect(packet, clients);
    }

    async nextTurn(n = 1) {
        if(this.onNewTurn(n))
            this._gameturncount++;
    }

    abstract async onNewTurn(n?: number);

    getPlayer(client: Client): P {
        return this._playerdata[client.id];
    }

    getAllPlayers() {
        return this._playerdata;
    }

    onPlayerLeave(client: Client): void {

    }

    abstract onPlayerInit(client: Client): P;

    onrequest(client: Client, packet: Packet, result: ResultEvent, reject: RejectEvent): void {
        let re: RequestEvent = this._requestevents[packet.type];
        if(!re) {
            return reject("Unknown game packet type ("+packet.type+").");
        }
        return re(client, packet.data, result, reject);    
    }

    addRequestListener(name: string, callback: RequestEvent): void {
        this._requestevents[name] = callback;
    }

    get name(): string {
        return "Game";
    }

    abstract listeners(): void;

    disband() {
        
    }
}