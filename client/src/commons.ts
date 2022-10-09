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

const RED: Color = {name: "red", color:"FF0000", id: 0};
const YELLOW: Color = {name: "yellow", color:"FFFF00", id: 1};
const GREEN: Color = {name: "green", color:"00FF00", id: 2};
const BLUE: Color = {name: "blue", color:"0000FF", id: 3};
const WILD: Color = {name: "wild", color:"000000", id: 4};

export const COLORS = [RED, YELLOW, GREEN, BLUE, WILD]

export type PendingMessage = {promise: {resolve:(o: object) => any, reject:(reason?: any) => any}, timeout: NodeJS.Timeout};
export type Packet = {type: string, id?: string, data: any, error?: {reason: string}, accepted: boolean};
export type ClientNetData = {id: string, name: string, color: number};
export type LobbyJoinRequest = {name: string, lobby: string};
export type LobbyJoinResult = {name: string, lobby: string, clients: ClientNetData[]};

export const playerColors = [
    "#BE5655",
    "#30B17D",
    "#0E9AB3",
    "#C0B24E",
    "#9b42f4",
    "#f49541",
    "#4179f4",
    "#ff608a",
    "#c90079",
    "#91b500"
];

export function removeFromArray<T>(array: T[], value: T): void {
    let k = -1;
    for(let i = 0; i < array.length; i++){
        if(array[i] == value){
            k = i;
            break;
        }
    }
    if(k >= 0)
        array.splice(k, 1);
}

export function waitFor(ms: number, passthrough: any = null){
    return new Promise<any>((resolve) => {
      let id = setTimeout(() => {
        clearTimeout(id);
        resolve(passthrough)
      }, ms)
    })
}

export function pick(...v: any[]) {
    return v[Math.round(Math.random()*(v.length-1))];
}