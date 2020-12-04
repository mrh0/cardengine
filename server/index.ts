import {WSServer} from "./src/server";
import {app} from "./src/routes";
import {Prop, GameState} from "./src/gamestate";
import {createServer} from "http";
import { Lobby } from "./src/lobby";
import { LobbyJoinRequest } from "./src/commons";
import { Client } from "./src/client";
import { UnoGame } from "./src/games/uno/uno";
import { httpport, wsport } from "./src/opts";


const server = createServer(app);

let lobbies = {};

server.listen(httpport, () => console.log(`listening on port ${httpport}`)); 

const wss = new WSServer(wsport);

function getClientLobby(client: Client): Lobby | null {
    return lobbies[client.lobbyId];
}

wss.addRequestListener("server/ping", (client, data, result) => {
    result({message: "pong"});
});

wss.addRequestListener("lobby/create", (client, data, result, reject) => {
    let lobby = new Lobby(client);
    lobbies[lobby.id] = lobby;
    
    result({lobby: lobby.id});
    console.log("Create");
});

wss.addRequestListener("lobby/join", (client, data: LobbyJoinRequest, result, reject) => {
    let lobby: Lobby | null = lobbies[data.lobby];
    if(lobby) {
        if(lobby.playing)
            return reject("lobby has started");
        if(lobby.isFull())
            return reject("lobby is full");
        if(lobby.isIn(client))
            return reject("client allready in lobby");
        let color = 0;
        for(let i = 0; i < lobby.takenColors.length; i++) {
            if(!lobby.takenColors[i]) {
                lobby.takenColors[i] = client.id;
                color = i;
                break;
            }
        }
        console.log("COLOR:", color);
        client.join(() => lobbies[lobby.id], data.name, color);
        lobby.join(client);
        return result({name: lobby.host.name + "'s game.", clients: lobby.getAllClientData(), lobby: lobby.id});
    }
    return reject("invalid lobby id");
});

wss.addRequestListener("lobby/start", (client, data, result, reject) => {
    let lobby = client.getLobby();//getClientLobby(client);
    if(lobby) {
        if(client == lobby.host) {
            lobby.start(new UnoGame(() => lobby, () => wss));
            return result({game: lobby.game.name});
        }
    }
    return reject("not host");
});

wss.gameRedirect = (gameName, client, packet, result, reject) => {
    let lobby = client.getLobby();
    if(lobby && lobby.hasStarted()) {
        if(gameName == lobby.game.name) {
            lobby.game.onrequest(client, packet, result, reject);
        }
        else
            return reject("not in matching game");
    }
    else 
        return reject("game not started");
}

/*
let state = new GameState();

let p = state.create("PropName", "Test");
p.value = "Test2";
*/
//console.log(generateDeck());