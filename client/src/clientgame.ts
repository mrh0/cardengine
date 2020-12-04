import { Packet } from "./commons";
import { WebSocketHandler } from "./ws";
import { MessageHandler } from "./handler";

export class ClientGame {
    private static _ws: WebSocketHandler;
    public static io: MessageHandler;
    constructor(ws: WebSocketHandler) {
        ClientGame._ws = ws;
        ClientGame.io = ws.msgh;
    }
    static get ws() {
        return this._ws;
    }

    onnetevent(packet: Packet) {

    }

    onleft(packet: Packet) {

    }

    onjoined(packet: Packet) {

    }

    start() {
        
    }
}