import { HttpClient, HttpResponse } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable} from 'rxjs';
import { Player } from '../classes/player';


@Injectable({
  providedIn: 'root'
})
export class GameService {

  private URL = "http://localhost:8080/api/eciPixelsGame";

  currentPlayer:Player;

  constructor(private httpClient:HttpClient) { }

  //Service to get the Board
  getBoard(): Observable<number[][]> {
    return this.httpClient.get<number[][]>(`${this.URL}/board`);
  }

  //Service to get the Players
  getPlayers(): Observable<Player[]> {
    return this.httpClient.get<Player[]>(`${this.URL}/players`);
  }

  //Service to get the LeaderBoard
  getLeaderBoard(): Observable<Player[]> {
    return this.httpClient.get<Player[]>(`${this.URL}/leaderBoard`);
  }

  //Service to add a player to the game
  addPlayer(name:string): Observable<HttpResponse<any>> {
    return this.httpClient.post<any>(`${this.URL}/addPlayer`, name, { observe: 'response' });
  }

  setCurrentPlayer(player:Player){
    this.currentPlayer = player;
  }

  getCurrentPlayer(): Player{
    return this.currentPlayer;
  }

}
