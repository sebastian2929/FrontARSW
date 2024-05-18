import { Head } from "./head";


export class Player {
    playerId: number;
    playerName: string;
    head: Head;
    color: string;
    isAlive: boolean;
    pixelsOwned: string[];
    pixelsRoute: string[];
    gainedArea: number;
}
