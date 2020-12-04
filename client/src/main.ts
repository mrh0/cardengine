import { WebSocketHandler } from "./ws.js";
import { LobbyJoinRequest, ClientNetData, LobbyJoinResult, removeFromArray } from "./commons.js";
import { UICard, addElem, createCard, dist, updateCardPos, playerHand, createPlayer, populatePlayers, playerElements, startGameUI, showColorSelector, selectCol, getPlayerElement, setVisible } from "./ui.js";
import { ClientGame } from "./clientgame.js";
import { UnoGameClient } from "./uno.js";
import { MenuSystem, showMenu, hideMenu, addNavigate, addBack } from "./menu.js";
import { MessageHandler } from "./handler.js";

let connection: WebSocketHandler;
let ws:MessageHandler;

console.log("LOADED");

let game: ClientGame;
let myId: string;
let myName = "";

function joinLobby(lobby: string, name: string) {
    return ws.request<LobbyJoinResult>("lobby/join", {lobby: lobby, name: name} as LobbyJoinRequest).then((data) => {
        console.log(data);
        window.history.pushState('', 'Uno', '/uno/' + data.lobby);
    });
}

function createLobby(name: string) {
    return ws.request<any>("lobby/create", {}).then((data) => {
        console.log(data);
        return joinLobby(data.lobby, name);
    });
}

function startGame() {
    ws.request<{game: string}>("lobby/start", {}).then((data) => {
        console.log("I started: " + data.game);
    }).catch((e) => {
        console.error(e);
    });
}

async function openConnection(result: (accepted: boolean, error?: any) => void) {
    let adr = await (await fetch("/service/uno/")).text();
    console.log("GOT:", adr);
    connection = new WebSocketHandler(adr);
    ws = connection.msgh;
    connection.open = () => {
        console.log("OPEN");
    }
    connection.result = result;
    connection.oneventmessage = (packet) => {
        console.log(packet.type);
        if(packet.type == "lobby/me") {
            let data = packet.data as ClientNetData;
            myId = data.id;
        }
        else if(packet.type == "lobby/starting") {
            console.log("lobby started", packet.data);
            if(packet.data.game == "uno") {
                game = new UnoGameClient(connection, myId);
                game.start();
                if(menu.current().name != 'game')
                    menu.navigate('game');
            }
            startGameUI();
        }
        else if(packet.type == "lobby/left") {
            console.log("player left", packet.data);
            populatePlayers(packet.data.clients, myId);
            if(game)
                game.onleft(packet);
            let pe = getPlayerElement(packet.data.client.id);
            pe.setAttribute("disconnected", "");
        }
        else if(packet.type == "lobby/joined") {
            console.log("player joined", packet.data);
            populatePlayers(packet.data.clients, myId);
            if(game)
                game.onjoined(packet);
        }
        else {
            if(game)
                game.onnetevent(packet);
        }
    }
}

window["g"] = {joinLobby, createLobby, startGame};
let menu: MenuSystem;

window.onload = () => {
    let code = "";
    let paths = window.location.pathname.split('/');
    if(paths.length > 0 && paths[paths.length-1].length > 0) {
        code = paths[paths.length-1];
        console.log(code);
    }

    let nameInput = document.getElementById("nameInput") as HTMLInputElement;
    let joinCodeInput = document.getElementById("joinCodeInput") as HTMLInputElement;
    let joinBtn = document.getElementById("joinButton");
    let createBtn = document.getElementById("createButton");
    let joinLobbyBtn = document.getElementById("joinLobbyButton");
    let joinErrorText = document.getElementById("joinErrorText");
    let createErrorText = document.getElementById("createErrorText");

    menu = new MenuSystem({ 
        next: {
            'join': {
                open: (last) => {showMenu("joinMenu"); myName = nameInput.value},
                close: (last) => {hideMenu("joinMenu")},
                next: {
                    'joining': {
                        open: (last) => {
                            openConnection((accepted, err) => {
                                if(!accepted) {
                                    joinErrorText.innerText = err ? err : "Unknown connection error";
                                    menu.back();
                                    return;
                                }

                                joinLobby(joinCodeInput.value, myName).then((d) => {
                                    //hideMenu("bgMenu");
                                    menu.navigate('lobby');
                                }).catch((e) => {
                                    menu.back();
                                    console.error(e);
                                    joinErrorText.innerText = e.reason;
                                });
                            });
                        },
                        close: (last) => {showMenu("bgMenu")},
                        next: {
                            'lobby': {
                                open: (last) => {showMenu("lobbyMenu")},
                                close: (last) => {hideMenu("lobbyMenu")},
                                next: {
                                    'game': {
                                        name: 'game',
                                        open: (last) => {hideMenu("bgMenu"); setVisible("pile", true);},
                                        close: (last) => {showMenu("bgMenu"); setVisible("pile", false);}
                                    }
                                }
                            }
                        }
                    }
                }
            },
            'create': {
                open: (last) => {showMenu("createMenu"); myName = nameInput.value},
                close: (last) => {hideMenu("createMenu")},
                next: {
                    'creating': {
                        open: (last) => {
                            openConnection((accepted, err) => {
                                if(!accepted) {
                                    createErrorText.innerText = err ? err : "Unknown connection error";
                                    menu.back();
                                    return;
                                }
                                createLobby(myName).then((d) => {
                                    //hideMenu("bgMenu");
                                    menu.navigate('lobby-host');
                                }).catch((e) => {
                                    menu.back();
                                    console.error(e);
                                    createErrorText.innerText = e.reason;
                                });
                            });
                            
                        },
                        close: (last) => {showMenu("bgMenu")},
                        next: {
                            'lobby-host': {
                                open: (last) => {showMenu("lobbyHostMenu")},
                                close: (last) => {hideMenu("lobbyHostMenu")},
                                next: {
                                    'game': {
                                        name: 'game',
                                        open: (last) => {
                                            hideMenu("bgMenu");
                                            setVisible("pile", true);
                                            startGame();
                                        },
                                        close: (last) => {showMenu("bgMenu"); setVisible("pile", false);}
                                    }
                                }
                            }
                        }
                    }
                }
            },
            'about': {
                open: (last) => {showMenu("aboutMenu")},
                close: (last) => {hideMenu("aboutMenu")}
            }
        },
        open: (last) => {showMenu("mainMenu")},
        close: (last) => {hideMenu("mainMenu")}
    });

    addNavigate(menu, "joinButton", "join");
    addNavigate(menu, "createButton", "create");
    addNavigate(menu, "aboutButton", "about");
    addBack(menu, "joinMenuBack");
    addBack(menu, "createMenuBack");
    addBack(menu, "aboutMenuBack");

    addNavigate(menu, "joinLobbyButton", "joining");
    addNavigate(menu, "createLobbyButton", "creating");

    addNavigate(menu, "startButton", "game");

    nameInput.addEventListener('input', (evt) => {
        if(nameInput.value.length > 2) {
            joinBtn.removeAttribute("disable");
            createBtn.removeAttribute("disable");
        }
        else {
            joinBtn.setAttribute("disable", "");
            createBtn.setAttribute("disable", "");
        }
    });

    joinCodeInput.value = code;
    if(joinCodeInput.value.length == 4) {
        joinLobbyBtn.removeAttribute("disable");
    }

    joinCodeInput.addEventListener('input', (evt) => {
        if(joinCodeInput.value.length == 4) {
            joinLobbyBtn.removeAttribute("disable");
        }
        else {
            joinLobbyBtn.setAttribute("disable", "");
        }
    });    
};

