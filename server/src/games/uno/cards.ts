import {Card, Color, ClientCard} from "../../commons";

const RED: Color = {name: "red", color:"FF0000", id: 0};
const YELLOW: Color = {name: "yellow", color:"FFFF00", id: 1};
const GREEN: Color = {name: "green", color:"00FF00", id: 2};
const BLUE: Color = {name: "blue", color:"0000FF", id: 3};
const WILD: Color = {name: "wild", color:"000000", id: 4};

export const COLORS = [RED, YELLOW, GREEN, BLUE, WILD];

export class UnoCard implements Card {
    name: string;
    color: Color;
    value: number;

    constructor(card: Card) {
        this.name = card.name;
        this.color = card.color;
        this.value = card.value;
    }
    canStack(card: UnoCard): boolean {
        if(this.color == card.color)
            return true;
        if(this.value == card.value)
            return true;
        if(card.isWild())
            return true;
        return false;
    }
    equals(card: Card) {
        if(this.color == card.color && this.value == card.value)
            return true;
        return false;
    }
    isRed() {
        return this.color.name == "red";
    }
    isYellow() {
        return this.color.name == "yellow";
    }
    isGreen() {
        return this.color.name == "green";
    }
    isBlue() {
        return this.color.name == "blue";
    }
    isWild() {
        return this.color.name == "wild";
    }
    isReverse() {
        return this.name.endsWith("-reverse");
    }
    isSkip() {
        return this.name.endsWith("-skip");
    }
    isPicker() {
        return this.name.endsWith("-picker");
    }
    isWildChanger() {
        return this.name.endsWith("-changer");
    }
    isWildPicker() {
        return this.name.endsWith("-pick-four");
    }
    toClient(): ClientCard {
        return {name: this.name, value: this.value, color: this.color.id};
    }
    static fromName(card: string) {
        if(!card)
            return null;
        return UNOCARDS[card];
    }
}

export function getNewWild(name: string, color: number) {
    if(color == null)
        return null;
    if(color < 0 || color > 3)
        return null;
    if(name == "wild-changer")
        return UNOCARDS[COLORS[color].name + "-changer"];
    if(name == "wild-pick-four")
        return UNOCARDS[COLORS[color].name + "-pick-four"];
    return null;
}

function generateUnoCards() {
    let cards: {[key: string]: UnoCard} = {};
    function push(card: UnoCard) {
        cards[card.name] = card;
    }
    for(let c = 0; c < 4; c++) {
        let color = COLORS[c];
        for(let i = 0; i < 10; i++) {
            push(new UnoCard({name:color.name+"-"+i, value: i, color: color}));
        }
        push(new UnoCard({name:color.name+"-skip", value: 10, color: color}));
        push(new UnoCard({name:color.name+"-reverse", value: 11, color: color}));
        push(new UnoCard({name:color.name+"-picker", value: 12, color: color}));
    }
    for(let c = 0; c < 5; c++) {
        let color = COLORS[c];
        push(new UnoCard({name:color.name+"-changer", value: 20, color: color}));
        push(new UnoCard({name:color.name+"-pick-four", value: 30, color: color}));
    }
    return cards;
}

export function drawRandom() {
    let deckTotal = 4 + 12*8 + 8;
    let n = getRandomIntInclusive(0, deckTotal - 1);
    let card = UNOCARDS[standardDeck[n]]
    if(!card)
        console.error("DRAW FAIL: " + deckTotal + ":" + n + ":" + card);
    return card;
}

function getRandomIntInclusive(min, max) {
    min = Math.ceil(min);
    max = Math.floor(max);
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

function generateDeck() {
    let cards: string[]  = [];
    for(let k = 0; k < 2; k++) {
        for(let c = 0; c < COLORS.length - 1; c++) {
            let color = COLORS[c];
            for(let i = 0; i < 10; i++) {
                if(i == 0 && k == 1)
                    continue;
                cards.push(color.name+"-"+i);
            }
            cards.push(color.name+"-skip");
            cards.push(color.name+"-reverse");
            cards.push(color.name+"-picker");
        }
    }
    for(let i = 0; i < 4; i++) {
        cards.push("wild-changer");
        cards.push("wild-pick-four");
    }
    return cards;
}

export function validateCard(card: string): UnoCard | null {
    if(card)
        return null;
    return UNOCARDS[card];
}

export const standardDeck = generateDeck();
export const UNOCARDS = generateUnoCards();