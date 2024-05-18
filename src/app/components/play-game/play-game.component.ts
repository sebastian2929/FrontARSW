import { Component, OnInit, ViewChild, ElementRef, HostListener } from '@angular/core';
import { GameService } from '../../services/game.service';
import { Player } from '../../classes/player';
import { WebSocketServiceService } from '../../services/web-socket-service.service';
import { GameState } from '../../classes/game-state';
import { Router } from '@angular/router';

@Component({
  selector: 'app-play-game',
  templateUrl: './play-game.component.html',
  styleUrls: ['./play-game.component.css']
})
export class PlayGameComponent implements OnInit {

  @ViewChild('canvas', { static: true }) canvas: ElementRef<HTMLCanvasElement>;
  private ctx: CanvasRenderingContext2D;

  gameState : GameState;
  player : Player;
  playerId: number; 
  currentDirection: string = 'stop';
  moveTimeout: any;

  constructor(private gameService: GameService,private webSocketService:WebSocketServiceService, private router:Router) { }

  ngOnInit(): void {
    const canvas = this.canvas.nativeElement;
    const context = canvas.getContext('2d');
  
    if (!context) {
      console.error('No se pudo obtener el contexto del canvas');
      return;
    }

    this.ctx = context;
  
    this.webSocketService.initconnectionSocket();
    this.webSocketService.movePlayerInServer();
    this.getGameStateLogging();
    this.getGameStateMovements();
    this.getPlayer();
  }
  
  getPlayer() {
    this.player = this.gameService.getCurrentPlayer();
    if (this.player) {
      this.playerId = this.player.playerId;
    }
  }

  updatePlayer() {
    if (this.gameState && this.playerId) {
      const updatedPlayer = this.gameState.players.find(player => player.playerId === this.playerId);
      if (updatedPlayer) {
        this.player = updatedPlayer;
      }
    }
  }

  getGameStateLogging(){
    this.webSocketService.getGameStateObservableLogging().subscribe(
      (data: GameState) => {
        this.gameState = data
        this.resizeCanvas();
        this.drawBoard();
      },
      (error) => {
        console.error("Error al recibir el estado del juego:", error);
      },
    );
  }

  getGameStateMovements(){
    this.webSocketService.getGameStateObservableMovements().subscribe(
      (data: GameState) => {
        this.gameState = data
        this.updatePlayer();
        this.resizeCanvas();
        this.drawBoard();
      },
      (error) => {
        console.error("Error al recibir el estado del juego:", error);
      },
    );
  }

  @HostListener('document:keydown', ['$event'])
  handleKeyboardEvent(event: KeyboardEvent) {
    if (!this.playerId) return;

    let newDirection: string;

    switch (event.key) {
      case 'ArrowUp':
        newDirection = 'up';
        break;
      case 'ArrowDown':
        newDirection = 'down';
        break;
      case 'ArrowLeft':
        newDirection = 'left';
        break;
      case 'ArrowRight':
        newDirection = 'right';
        break;
      case 'p':
        this.stop();
        return;
      default:
        return;
    }

    if (this.isOppositeDirection(newDirection, this.currentDirection)) {
      this.stop(); 
      return;
    }

    if (this.currentDirection !== newDirection) {
     
      if(this.currentDirection !== 'stop'){
        this.stop();
      }
      
      this.currentDirection = newDirection;
      
      switch (newDirection) {
        case 'up':
          this.moveUp();
          break;
        case 'down':
          this.moveDown();
          break;
        case 'left':
          this.moveLeft();
          break;
        case 'right':
          this.moveRight();
          break;
      }
    }
  }

  moveUp() {
    this.movePlayer(0, -1);
  }

  moveDown(){
    this.movePlayer(0, 1);
  }

  moveLeft(){
    this.movePlayer(-1, 0);
  }

  moveRight(){
    this.movePlayer(1, 0);
  }


  movePlayer(deltaX: number, deltaY: number) {
    if (!this.player) return;
  
    let lastSentPosition = { row: this.player.head.row, col: this.player.head.col };
  
    const moveHead = () => {
  
      if (!this.player.isAlive) {
        this.startNewGame();
        return;
      }
  
      if (this.currentDirection === "stop") {
        return;
      }
  
      const newRow = this.player.head.row + deltaY;
      const newCol = this.player.head.col + deltaX;
  
      if (newRow === lastSentPosition.row && newCol === lastSentPosition.col) {
        setTimeout(moveHead, 800);
        return;
      }
  
      this.player.head.row = newRow;
      this.player.head.col = newCol;
  
      this.webSocketService.sendMessageToMovePlayer(this.player.playerId, newRow, newCol);
  
      lastSentPosition = { row: newRow, col: newCol };
  
      this.moveTimeout = setTimeout(moveHead, 400);
    };
  
    moveHead();
  }
  
  stop() {
    this.currentDirection = "stop";
    clearTimeout(this.moveTimeout);
  }

  isOppositeDirection(direction1: string, direction2: string): boolean {
    switch (direction1) {
        case 'up':
            return direction2 === 'down';
        case 'down':
            return direction2 === 'up';
        case 'left':
            return direction2 === 'right';
        case 'right':
            return direction2 === 'left';
        default:
            return false;
    }
  }

  resizeCanvas(): void {
    if (!this.gameState.board) return;

    const canvasWidth = this.gameState.board[0].length * 20;
    const canvasHeight = this.gameState.board.length * 20;

    this.canvas.nativeElement.width = canvasWidth;
    this.canvas.nativeElement.height = canvasHeight;
  }

  drawBoard(): void {
    if (!this.ctx || !this.gameState.board) return;

    this.ctx.clearRect(0, 0, this.canvas.nativeElement.width, this.canvas.nativeElement.height);
  
    for (let y = 0; y < this.gameState.board.length; y++) {
      for (let x = 0; x < this.gameState.board[y].length; x++) {
        const cellValue = this.gameState.board[y][x];
        const color = this.getColor(cellValue);
  
        if (cellValue != null) {
          this.ctx.strokeStyle = 'black';
          this.ctx.strokeRect(x * 20, y * 20, 20, 20);
        }
        
        this.ctx.fillStyle = color;
        this.ctx.fillRect(x * 20, y * 20, 20, 20);
  
        const playerWithHead = this.gameState.players.find(player => player.head.row === y && player.head.col === x);
        if (playerWithHead?.isAlive) {
            let headColor = this.getPlayerColor(playerWithHead.color);
            this.ctx.fillStyle = headColor;
            this.ctx.beginPath();
            this.ctx.arc((x * 20) + 10, (y * 20) + 10, 10, 0, 2 * Math.PI);
            this.ctx.fill();
        }
      }      
    }

    this.drawPlayersPixels();
  }

  drawPlayersPixels(): void {
    for (const player of this.gameState.players) {
      if (!player.pixelsRoute) continue;
  
      const playerColor = this.getPlayerColor(player.color);
  
      for (const pixel of player.pixelsRoute) {
        const [row, col] = pixel.split(',').map(Number);
  
        if ((row === player.head.row && col === player.head.col) || (row === 0 && col === 0)) continue;
  
        // Dibujar los bordes en negro
        this.ctx.strokeStyle = 'black';
        this.ctx.strokeRect(col * 20, row * 20, 20, 20);

        // Pintar el pixel
        this.ctx.fillStyle = playerColor;
        this.ctx.fillRect(col * 20, row * 20, 20, 20);
      }
    }
  }
  
  getPlayerColor(color: string): string {
    switch (color) {
      case "blue": return 'lightblue';
      case "red": return 'lightcoral';
      case "yellow": return 'darkgoldenrod';
      case "green": return 'lightGreen';
      case "purple": return 'darkorchid';
      default: return 'white';
    }
  }
  
  getColor(cellValue: number): string {
    if (cellValue === 0) {
      return 'gray';
    }

    if (cellValue === null) {
      return 'white';
    }

    const playerId = cellValue; 
    const foundPlayer = this.gameState.players.find(player => player.playerId === playerId);
    
    if (!foundPlayer) {
      return 'blue';
    }
    
    switch (foundPlayer.color) {
      case "blue": return 'blue';
      case "red": return 'red';
      case "yellow": return 'yellow';
      case "green": return 'green';
      case "purple": return 'purple';
      default: return 'gray';
    }
  }

  orderByGainedAreaDesc(players: Player[]): Player[] {
    return players.sort((a, b) => b.gainedArea - a.gainedArea);
  }

  startNewGame(){
    this.router.navigate(['Ecipixels']);
  }
}