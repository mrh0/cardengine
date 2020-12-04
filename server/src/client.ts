import WS = require('ws');
import {Packet, ClientNetData} from "./commons";
import { makeId } from './util';
import { Lobby } from './lobby';

export class Client {
    private _name = "anonymous";
    private _color: number;
    private _id: string;
    private _socket: WS;
    private _lobby_id: string;
    private _lobby_supplier: () => Lobby;

    constructor(socket: WS) {
        this._id = makeId(16);
        this._socket = socket;
        this._color = 0;
    }

    get id() {
        return this._id;
    }

    get name() {
        return this._name;
    }

    get ws() {
        return this._socket;
    }

    get color() {
        return this._color;
    }

    get lobbyId(): string | null {
        return this._lobby_id;
    }

    join(lobbySupplier: () => Lobby, name: string, color: number) {
        this._lobby_supplier = lobbySupplier;
        this._lobby_id = this.getLobby().id;
        this._name = name;
        this._color = color;
    }

    getData(): ClientNetData {
        return {
            id: this._id,
            name: this._name,
            color: this._color
        };
    }

    getLobby() {
        if(!this._lobby_supplier)
            return null;
        return this._lobby_supplier();
    }

    inLobby(): boolean {
        return this.getLobby()?true:false;
    }

    send(packet: Packet) {
        if(this._socket.readyState != WS.OPEN)
            this.close();
        this._socket.send(JSON.stringify(packet));
        console.log("sent", packet);
    }

    close() {
        let lobby = this.getLobby();
        if(lobby) {
            lobby.leave(this);
        }
        console.error(this.name + " disconnected.");
    }
}
