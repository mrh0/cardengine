import WS = require("ws");
import {Client} from "./client";
import { Packet } from "./commons";

export type ResultEvent = (data: any, accepted?: boolean) => void;
export type RejectEvent = (reason?: string) => void;
export type RequestEvent = (client: Client, data: any, result: ResultEvent, reject?: RejectEvent) => void;


export class WSServer {
    private wss: WS.Server;
    //private clients: Client[];
    private requestevents: {[key: string]: RequestEvent};

    constructor(port: number) {
        this.wss = new WS.Server({ port: port });
        this.events();
        this.requestevents = {};
    }
 
    private events() {
        this.wss.on('connection', (ws) => {
            ws.on('message', (msg) => {
                let packet: Packet = JSON.parse(msg.toString());
                let client: Client = ws["client"];
                if(packet.id)
                    this.onrequest(client, packet, 
                        (data, accepted = true) => client.send({id: packet.id, type: packet.type, data: data, accepted: accepted}),
                        (reason = "server error.") => client.send({id: packet.id, type: packet.type, data: null, accepted: false, error: {reason: reason}})
                    );
                else
                    console.error("Packet missing id.");
            });
            ws.on('close', () => {
                let client: Client = ws["client"];
                this.onclose(client);
            });
            
            let client = new Client(ws);
            ws["client"] = client;
            client.send({accepted: true, type:"lobby/me", data: client.getData()});
        });
    }

    private onrequest(client: Client, packet: Packet, result: ResultEvent, reject: RejectEvent) {
        let re: RequestEvent = this.requestevents[packet.type];
        let path = packet.type.split("/");
        if(path[0] == "game") {
            this.gameRedirect(path[1], client, packet, result, reject);
        }
        else if(re) {
            re(client, packet.data, result, reject);
        }
        else
            reject("Unknown packet type ("+packet.type+").");
    }

    private onclose(client: Client) {
        client.close();
    }

    addRequestListener(name: string, callback: RequestEvent): void {
        this.requestevents[name] = callback;
    }

    gameRedirect(gameName: string, client: Client, packet: Packet, result: ResultEvent, reject: RejectEvent) {

    }
}

