import { ChangeDetectorRef, Component, HostListener, OnInit, ViewChild } from '@angular/core';
import { Direction } from 'src/domain/direction';
import { GameState } from 'src/domain/enums';
import { GameboardComponent } from '../gameboard/gameboard.component';
import { timer, of, Subscription } from 'rxjs';

@Component({
  selector: 'sng-game-blitz',
  templateUrl: './game-blitz.component.html',
  styleUrls: ['./game-blitz.component.css']
})
export class GameBlitzComponent {
  @ViewChild('gameboard') gameboard?: GameboardComponent;

  private stopwatchSubscription = new Subscription();
  private readonly timeLimit: number = 5;
  private timeleft: number = this.timeLimit;
  public score: number = 0;
  public message: string = "";
  public gameState: GameState = GameState.PreGame;
  private storedKeyPresses: string[] = [];
  private timerLength: number = 10000;

  public get isPreGameOrGameOver(): boolean{
    return this.gameState === GameState.PreGame ||
           this.gameState === GameState.GameOver;
  }

  constructor(private changeDetector: ChangeDetectorRef) {}
  
  public async startGameLoop(): Promise<void>{
    this. gameState = GameState.Setup;
    this.reset();
    this.gameboard!.spawnSnake();
    this.gameboard!.spawnPellet();   
    await this.playCountdown();
    this.gameState = GameState.InProgress;
    this.startTimer();

    do{
      let nextDirection: Direction = Direction.fromKey(this.storedKeyPresses[0])
      
      if (this.storedKeyPresses.length > 0){
        this.storedKeyPresses.shift();
      }

      await this.gameboard!.moveSnake(nextDirection);
      this.score = this.gameboard!.snake.countPelletsConsumed;
      await sleep(80);   
    } while(!this.gameboard!.snake.isOutOfBounds &&
            !this.gameboard!.snake.hasCollidedWithSelf &&
             this.timeleft != 0);
    
    this.stopwatchSubscription.unsubscribe();
    this.gameState = GameState.GameOver;
    this.message = "Game over!";
  }

  public reset(): void{
    this.gameboard!.reset();
    this.score = 0;
    this.storedKeyPresses = [];
  }

  private async playCountdown(): Promise<void>{
    this.message = "3"; await sleep(850);
    this.message = "2"; await sleep(850);
    this.message = "1"; await sleep(850);
    this.message = "Go!"; await sleep(850);
    this.message = "";
  }

  private async startTimer(): Promise<void>{
    const stopwatch = timer(0, 1000);

    this.stopwatchSubscription = stopwatch.subscribe(secondsPassed => { 
      this.timeleft = this.timeLimit - secondsPassed;
      this.message = this.timeleft.toString() 
    });
  }

  public handlePelletConsumed(): void{
    this.gameboard?.spawnPellet();
  }

  @HostListener('document:keydown', ['$event'])
  public handleKeyboardEvent(event: KeyboardEvent) { 
     let key: string = event.key;

     if (this.gameState != GameState.InProgress){
       return;
     }

     let directionToMove: Direction = Direction.fromKey(key);

     if (directionToMove === Direction.none){
       return;
     }

     let nextDirection: Direction = Direction.fromKey(this.storedKeyPresses[0]);

     if (this.storedKeyPresses.length === 0){
       if (this.gameboard!.snake.currentDirection.isEqualTo(directionToMove) ||
           this.gameboard!.snake.currentDirection.isOppositeTo(directionToMove)){
         return;
       }
     }
     else if (this.storedKeyPresses.length > 0){
       if (nextDirection.isEqualTo(directionToMove) ||
           nextDirection.isOppositeTo(directionToMove)){
          return;
       }
     }

     if (this.storedKeyPresses.length === 2){
       this.storedKeyPresses.shift();
     }

     this.storedKeyPresses.push(key);
  }
}

function sleep(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}