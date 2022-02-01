import { ChangeDetectorRef, Component, HostListener, ViewChild } from '@angular/core';
import { Direction } from 'src/domain/direction';
import { CellType, GameState } from 'src/domain/enums';
import { GameboardComponent } from '../gameboard/gameboard.component';
import { timer, Subscription } from 'rxjs';
import * as utils from 'src/app/utils'

@Component({
  selector: 'sng-game-blitz',
  templateUrl: './game-blitz.component.html',
  styleUrls: ['./game-blitz.component.css']
})
export class GameBlitzComponent {
  @ViewChild('gameboard') gameboard?: GameboardComponent ;

  private stopwatchSubscription = new Subscription();
  private readonly timeLimit: number = 60;
  private timeleft: number = this.timeLimit;
  public score: number = 0;
  public message: string = "";
  public gameState: GameState = GameState.PreGame;
  private storedKeyPresses: string[] = [];
  public progressBarPercentage: number = 0;
  private blazingCounter: number = 0;
  
  public get isPreGameOrGameOver(): boolean{
    return this.gameState === GameState.PreGame ||
           this.gameState === GameState.GameOver;
  }

  constructor(private changeDetector: ChangeDetectorRef) {}
  
  public async startGameLoop(): Promise<void>{
    await this.prepareGame();

    do{
      let nextDirection: Direction = Direction.fromKey(this.storedKeyPresses[0])
      
      if (this.storedKeyPresses.length > 0){
        this.storedKeyPresses.shift();
      }

      await this.gameboard!.moveSnake(nextDirection);
      this.score = this.gameboard!.snake.countPelletsConsumed;
      await utils.sleep(80);   
    } while(!this.gameboard!.snake.isOutOfBounds &&
            !this.gameboard!.snake.hasCollidedWithSelf &&
             this.timeleft != 0);
      
      this.handleGameOver();
  }

  public reset(): void{
    this.progressBarPercentage = 0;
    this.blazingCounter = 0;
    this.gameboard!.reset();
    this.score = 0;
    this.storedKeyPresses = [];
  }

  private async playCountdown(): Promise<void>{
    for (let i: number = 4; i >= 0; i--){
      this.message = i > 1 ? (i-1).toString() : i === 1 ? "Go!" : "";
      
      if (i > 0) await utils.sleep(700);
    }
  }

  private async startTimer(): Promise<void>{
    const stopwatch = timer(0, 1000);

    this.stopwatchSubscription = stopwatch.subscribe(secondsPassed => { 
      this.timeleft = this.timeLimit - secondsPassed;
      this.message = utils.secondsToMinutes(this.timeleft);
    });
  }

  public handlePelletConsumed(): void{
    this.gameboard?.spawnPellet();

    if (!this.gameboard!.snake.isBlazing){
      if (this.blazingCounter < 5){
        this.blazingCounter++;
        this.progressBarPercentage = 20 * this.blazingCounter;
      }
      
      if (this.blazingCounter === 5){
        this.gameboard!.snake.isBlazing = true;
        this.handleBlazing();
      }
    }
    else if (this.gameboard!.snake.isBlazing){
      if (this.progressBarPercentage < 100){
        this.progressBarPercentage = this.progressBarPercentage + 20 > 100 ? 100 : this.progressBarPercentage + 20;
      }
    }
  }

  private async handleBlazing(): Promise<void>{
    do {
      await utils.sleep(50);
      this.progressBarPercentage = this.progressBarPercentage - 1;
    }
    while (this.progressBarPercentage > 0);

    this.gameboard!.snake.isBlazing = false;
    this.blazingCounter = 0;
  }

  private async prepareGame(): Promise<void>{
    this. gameState = GameState.Setup;
    this.reset();
    this.gameboard!.spawnSnake();
    this.gameboard!.spawnPellet();   
    await this.playCountdown();
    this.gameState = GameState.InProgress;
    this.startTimer();
  }

  private handleGameOver(): void{
    this.stopwatchSubscription.unsubscribe();
    this.gameState = GameState.GameOver;
    this.message = "Game over!";

    if (this.gameboard!.snake.isBlazing){
      this.gameboard!.snake.isBlazing = false;
      this.progressBarPercentage = 0;
    }
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
