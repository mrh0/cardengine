import { MessageHandler } from "./handler.js";
import { Packet } from "./commons";

export class WebSocketHandler {
  ws: WebSocket;
  msgh: MessageHandler;
  constructor(url: string) {
    this.ws = new WebSocket(url);
    this.msgh = new MessageHandler(this.ws);
    this.listeners();
    console.log("created");
  }

  oneventmessage(packet: Packet) {
    console.error("Other type not implemented: ", packet.type);
  }

  open() {
    console.log("open")
  }

  result(accepted: boolean, error?: any) {

  }

  listeners() {
    this.ws.onopen = (evt) => {
      this.open();
      this.result(true);
    }

    this.ws.onerror = (evt) => {
      console.error("err", evt)
      this.result(false, evt);
    }

    this.ws.onclose = (evt) => {
      console.error("close", evt)
    }

    this.ws.onmessage = (evt) => {
      let o: Packet = JSON.parse(evt.data);
      if (!o.type)
        return;
      if (o.id) {
        let req = this.msgh.getRequest(o.id);
        if (req) {
          if(o.accepted)
            return req.promise.resolve(o.data);
          else
          return req.promise.reject(o.error);
        }
      }
      else {
        this.oneventmessage(o);
      }
    }
  }
}
