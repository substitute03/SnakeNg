import { Component, HostListener, OnInit, ViewChild } from '@angular/core';
import { Router } from '@angular/router';
import { Cell } from 'src/domain/cell';
import { Direction } from 'src/domain/direction';
import { CellType, EventType, GameMode, GameState } from 'src/domain/enums';
import { GameboardComponent } from '../gameboard/gameboard.component';
import { KeypressService } from '../shared/keypress-service';
import { StorageService } from '../shared/storage-service';
import * as utils from 'src/app/utils';
import { GameCardComponent } from '../game-card/game-card.component';
import { ModalComponent } from '../modal/modal.component';

@Component({
    selector: 'sng-game-delivery',
    templateUrl: './game-delivery.component.html',
    styleUrls: ['./game-delivery.component.css']
})
export class GameDeliveryComponent implements OnInit {
    @ViewChild('gameboard') gameboard?: GameboardComponent;
    @ViewChild('highScoreModal') highScoreModal?: ModalComponent;  
    @ViewChild('gameCard') gameCard?: GameCardComponent;

    public readonly gameMode: GameMode = GameMode.Delivery;
    public playerName: string = '';
    public highScore: number = 0;
    public score: number = 0;
    public message: string = '';
    public gameState: GameState = GameState.PreGame;

    public get isPreGameOrGameOver(): boolean {
        return (
            this.gameState === GameState.PreGame ||
            this.gameState === GameState.GameOver
        );
    }

    constructor(private _keypressService: KeypressService,
        private _router: Router,
        private _storageService: StorageService) { }

    ngOnInit(): void {
        let playerName = this._storageService.getPlayerName();

        if (playerName) {
            this.playerName = playerName;
            let highScore = this._storageService.getHighScore(playerName, this.gameMode);

            if (highScore) {
                this.highScore = highScore.score;
            }
        }
        else {
            this.returnToMenu();
        }
    }

    public async startGameLoop(): Promise<void> {
        await this.prepareGame();

        do {
            while(this.gameState === GameState.Paused){
              await utils.sleep(1);
              continue;
            }

            let nextDirection: Direction = this._keypressService.getNextDirection();
            await this.gameboard!.moveSnake(nextDirection);
            this.score = this.gameboard!.snake.countPelletsConsumed;
            await utils.sleep(120);
        } while (
            !this.gameboard!.snake.isOutOfBounds &&
            !this.gameboard!.snake.hasCollidedWithSelf
        );

        this.handleGameOver();
    }

    public reset(): void {
        this.gameCard!.stopSpinLogo();
        this.gameboard!.reset();
        this.score = 0;
        this._keypressService.clearDirectionQueue();
    }

    private async playCountdown(): Promise<void> {
        for (let i: number = 4; i >= 0; i--) {
            if (i > 1) {
                this.message = `${i - 1}`;
                utils.playSound(EventType.CountdownInProgress);
                await utils.sleep(700);
            } else if (i === 1) {
                this.message = 'Go!';
                utils.playSound(EventType.CountdownEnd);
                await utils.sleep(700);
            } else {
                this.message = '';
            }
        }
    }

    public handlePelletConsumed(): void {
        utils.playSound(EventType.PelletConsumed);
        this.gameboard!.spawnParcel();
        this.gameboard!.spawnDeliveryPoint();
    }

    private async prepareGame(): Promise<void> {
        this.gameState = GameState.Setup;
        this.reset();
        this.gameboard!.spawnSnake();
        this.gameboard!.spawnParcel();
        this.gameboard!.spawnDeliveryPoint();
        await this.playCountdown();
        this.gameState = GameState.InProgress;
    }

    private handleGameOver(): void {
        utils.playSound(EventType.GameOver);
        this.gameCard!.spinLogo();
        this.gameState = GameState.GameOver;
        this.checkHighScore();
    }

    private checkHighScore(): void{

    }

    public returnToMenu(): void {
        this._router.navigate([""]);
    }

    @HostListener('document:keydown', ['$event'])
    public handleKeyboardEvent(event: KeyboardEvent) {
      if (this.gameState != GameState.InProgress && this.gameState != GameState.Paused) {
        return;
    }

        if (event.key === " "){
          if (this.gameState != GameState.Paused && this.gameState === GameState.InProgress){
            this.gameState = GameState.Paused;
            this.message = "Paused"
          }
          else if (this.gameState === GameState.Paused){
            this.gameState = GameState.InProgress;
            this.message = "";
          }
        }        

        this._keypressService.setNextDirection(Direction.fromKey(event.key),
            this.gameboard!.snake.currentDirection);
    }
}
