import {Packet, PendingMessage} from "./commons.js";

const timeoutLength = 5000//ms
const packetIdLength = 16;

export class MessageHandler {
  ws: WebSocket;
  pending: {[key: string]: PendingMessage};
  constructor(ws: WebSocket) {
    this.ws = ws;
    this.pending = {};
  }

  request<T>(type: string, data = {}) {
    let timeout: number;
    let resolve;
    let reject: (reason?: any) => void;
    let pkg = makePacket(type, data);
    let r = new Promise<T>((_resolve, _reject) => {
      resolve = _resolve;
      reject = _reject;
      timeout = setTimeout(() => {
        reject({accepted: false, error: {reason: "timeout"}});
        this.cancelRequest(pkg.id)
      }, timeoutLength)
    });
    this.pending[pkg.id] = {promise: {resolve:resolve, reject:reject}, timeout: timeout};
    this.ws.send(JSON.stringify(pkg));
    return r;
  }

  getRequest(id: string): PendingMessage {
    let r = this.pending[id];
    if(r)
      delete this.pending[id];
    return r;
  }

  cancelRequest(id: string) {
    if(this.pending[id]){
      clearTimeout(this.pending[id].timeout);
      //this.pending[id].promise.reject();
    }
  }
}

function makePacket(type: string, data: any, accepted = true): Packet {
  return {
    type: type,
    id: makeId(packetIdLength),
    data: data,
    accepted: accepted
  }
}

function makeId(length: number): string {
  let result           = '';
  let characters       = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let charactersLength = characters.length;
  for ( var i = 0; i < length; i++ )
     result += characters.charAt(Math.floor(Math.random() * charactersLength));
  return result;
}
