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

export function makeId(length: number): string {
    let result           = '';
    let characters       = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let charactersLength = characters.length;
    for ( var i = 0; i < length; i++ )
        result += characters.charAt(Math.floor(Math.random() * charactersLength));
    return result;
}

export function makeLobbyId(length: number): string {
    let result           = '';
    let characters       = '23456789ABCFGHJKLRSTXYZ';
    let charactersLength = characters.length;
    for ( var i = 0; i < length; i++ )
        result += characters.charAt(Math.floor(Math.random() * charactersLength));
    return result;
}

export function mod(x, m) {
    return (x%m + m)%m;
}