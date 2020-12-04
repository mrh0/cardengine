import {Card, Color} from "./commons";

export type CardMatchPattern = (card: Card) => boolean;

export class Collection {
    private _cards: Card[];

    constructor() {
        this._cards = [];
    }

    find(match: CardMatchPattern): Card[] {
        let result: Card[] = [];
        for(let c of this._cards)
            if(match(c))
                result.push(c);
        return result;
    }
    add(card: Card): void {
        this._cards.push(card);
    }
    pull(card: Card): Card | null {
        let r = -1;
        for(let i = 0; i < this._cards.length; i++) {
            let c = this._cards[i];
            if(c.name == card.name && c.color == card.color) {
                r = i;
                break;
            }
        }
        
        if(r >= 0) {
            let e = this._cards[r];
            this._cards.splice(r, 1);
            return e;
        }
        return null;
    }
    pullAll(card: Card): Card[] {
        let p: Card;
        let r: Card[] = [];
        do{
            p = this.pull(card);
            if(p)
                r.push(p);
        } while(p)
        return r;
    }
    transfer(card: Card, collection: Collection): boolean {
        let p = this.pull(card);
        if(p != null){
            collection.add(card);
            return true;
        }
        return false;
    }
    draw(): Card | null {
        if(this.isEmpty())
            return null;
        return this._cards.pop();
    }
    isEmpty(): boolean {
        return this._cards.length <= 0;
    }
    count(): number {
        return this._cards.length;
    }
    get cards() {
        return this._cards;
    }
}
export class Hand extends Collection {

}