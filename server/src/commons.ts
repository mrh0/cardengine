export interface Card {
    name: string,
    color: Color,
    value: number
}
export interface ClientCard {
    name: string,
    color: number,
    value: number
}
export interface Color {
    name: string,
    color: string,
    id: number
}

export type PendingMessage = {promise: {resolve:(o: object) => any, reject:() => any}, timeout: number};
export type Packet = {type: string, id?: string, data: {[key: string]: string | number | object}, error?: {reason: string}, accepted: boolean};
export type ClientNetData = {id: string, name: string, color: number};
export type LobbyJoinRequest = {name: string, lobby: string};
export type LobbyJoinResult = {name: string, lobby: string, clients: ClientNetData[]};

export function waitFor(ms: number, passthrough: any = null){
    return new Promise<any>((resolve) => {
      let id = setTimeout(() => {
        clearTimeout(id);
        resolve(passthrough)
      }, ms)
    })
}