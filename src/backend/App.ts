/* eslint-disable*/
import { Server } from "./Server";
import express,{ Request, Response } from "express";
import jwt from 'jsonwebtoken';
import mongoose, { Schema, ConnectOptions } from 'mongoose';

interface Player {
	id : string;
	password : string;
}
interface Game {
	player : string;
	rounds : GameRound[];
}

interface GameRound {
	player : string;
	result : number;
}

const playerSchema = new Schema({
	id: { type: String, required: true },
	password: { type: String, required: true }
});

//to access player db
const PlayerModel = mongoose.model<Player>('Player', playerSchema);

const gameRoundSchema = new Schema<GameRound>({
	player: { type: String, required: true },
	result: { type: Number, required: true }
});

const gameSchema = new Schema<Game>({
	player: { type: String, required: true },
	rounds: [gameRoundSchema]
});

const GameModel = mongoose.model<Game>('Game', gameSchema);

const app = express();
const secretKey = 'my_secret_key';

app.use(express.json());

//POST /login: authenticate if the data provided by user are correct
app.post('/login', async (req: Request, res : Response) => {
	const { id, password } = req.body;

	const user = await PlayerModel.findOne({ id });
	if(!user || password !== user.password ){
		return res.status(401).json({ error : 'The username or password are incorrect' });
	}

	const token = jwt.sign({id : user.id}, secretKey);

	res.json({token});
});

//POST /player: create a new player if the name doesnt exist jet
app.post('/player', async (req : Request, res : Response) => {
	let { id, password } = req.body;

	if (!id) {id = 'anonymous';}

	if (await PlayerModel.exists({ id }) && id != 'anonymous') {
		return res.status(400).json({ error: 'Player name already exist' });
	}

	const player : Player = { id, password };
	await PlayerModel.create(player);

	const jwtoken = jwt.sign({ id }, secretKey);
	res.json({ player, jwtoken });
});

//GET /players: shows all the players with them winrates
app.get('/players', async (req : Request, res : Response) => {
	try {
		const players = await PlayerModel.find();
	
		const winRates = await Promise.all(
		  players.map(async (player) => {
			const games = await GameModel.find({ player: player.id });
	
			let wins = 0;
			let totalRounds = 0;
	
			games.forEach((game) => {
			  game.rounds.forEach((round) => {
				totalRounds++;
				if (round.result === 7) {
				  wins++;
				}
			  });
			});
			const winRate = (wins / totalRounds) * 100;
	
			return { player: player.id, winRate };
		  })
		);
	
		res.json(winRates);
	  } catch (err) {
		console.error(err);
		res.status(500).json({ err: 'Failed to retrieve players' });
	  }
});

//PUT /players/{id}: change the name of the player for another that deosnt exist jet
app.put('/player/:id', async (req: Request, res: Response) => {
	const playerId = req.params.id;
	const { newId } = req.body;
  
	const player = await PlayerModel.findOne({ id: playerId });
	if (!player) {
	  return res.status(404).json({ error: 'Player not found' });
	}
  
	if (await PlayerModel.exists({ id: newId })) {
	  return res.status(400).json({ error: 'This name already exists' });
	}
  
	player.id = newId;
	await player.save();
  
	const jwtoken = jwt.sign({ id: playerId, newId }, secretKey);
	res.json({ player, jwtoken });
  });
  

// POST /games/:id: play a round of dice for the given player ID
app.post('/games/:id', async (req: Request, res: Response) => {
	const playerId = req.params.id;

	const user = await PlayerModel.findOne({ 'id' : playerId });
	if (!user) {
		return res.status(404).json({ error: 'Player not found' });
	}

	const dice1 = Math.floor(Math.random() * 6);
	const dice2 = Math.floor(Math.random() * 6);

	const result = dice1 + dice2;
	const round: GameRound = { player: playerId, result };
	await GameModel.updateOne({ player: playerId }, { $push: { rounds: round } }, { upsert: true });

	if (result === 7) {
		res.json({ message: `${dice1} + ${dice2} = ${result}: You won the game!` });
	} else {
		res.json({ message: `${dice1} + ${dice2} = ${result}: Better luck next time :c` });
	}
});

// GET /games/:id: get all rounds played by the given player ID
app.get('/games/:id', async (req: Request, res: Response) => {
	const playerId = req.params.id;

	const rounds = await GameModel.findOne({ player : playerId }).select('rounds');
	if (!rounds) {
		return res.status(404).json({ error: 'Player not found' });
	}

	res.json({ rounds });
});

//DELETE /games/:id: delete all the games of the given player ID
app.delete('/games/:id', async (req: Request, res: Response) => {
	const player = req.params.id;
  
	const user = await PlayerModel.findOne({ id: player });
	if (!user) {
	  return res.status(404).json({ error: 'Player not found' });
	}
  
	await GameModel.deleteMany({ player: player });
  
	res.json({ message: 'Games deleted successfully' });
  });

  app.get('/ranking', async (req: Request, res: Response) => {
	try {
	  const players = await PlayerModel.find();
  
	  const winRates = await Promise.all(
		players.map(async (player) => {
		  const games = await GameModel.find({ player: player.id });
  
		  let wins = 0;
		  let totalRounds = 0;
  
		  games.forEach((game) => {
			game.rounds.forEach((round) => {
			  totalRounds++;
			  if (round.result === 7) {
				wins++;
			  }
			});
		  });
		  const winRate = (wins / totalRounds) * 100;
  
		  return { player: player.id, winRate };
		})
	  );
	  const sortedPlayers = winRates.sort((a, b) => b.winRate - a.winRate);
  
	  res.json(sortedPlayers);
	} catch (err) {
		console.error(err);
	  res.status(500).json({ err: 'Failed to retrieve ranking' });
	}
  });

  //GET /ranking/loser: shows the player with the best winrate
  app.get('/ranking/winner', async (req : Request, res : Response) => {
	try {
		const players = await PlayerModel.find();
	
		const winRates = await Promise.all(
		  players.map(async (player) => {
			const games = await GameModel.find({ player: player.id });
	
			let wins = 0;
			let totalRounds = 0;
	
			games.forEach((game) => {
			  game.rounds.forEach((round) => {
				totalRounds++;
				if (round.result === 7) {
				  wins++;
				}
			  });
			});
			const winRate = (wins / totalRounds) * 100;
	
			return { player: player.id, winRate };
		  })
		);
		const sortedPlayers = winRates.sort((a, b) => b.winRate - a.winRate);
		const winner = sortedPlayers[0];
	
		res.json(winner);
	  } catch (err) {
		console.error(err);
		res.status(500).json({ err: 'Failed to retrieve ranking' });
	  }
  });
  
  //GET /ranking/loser: shows the player with the worst winrate
  app.get('/ranking/loser', async (req: Request, res: Response) => {
	try {
	  const players = await PlayerModel.find();
  
	  const winRates = await Promise.all(
		players.map(async (player) => {
		  const games = await GameModel.find({ player: player.id });
  
		  let wins = 0;
		  let totalRounds = 0;
  
		  games.forEach((game) => {
			game.rounds.forEach((round) => {
			  totalRounds++;
			  if (round.result === 7) {
				wins++;
			  }
			});
		  });
  
		  const winRate = (wins / totalRounds) * 100;
  
		  return { player: player.id, winRate };
		})
	  );
  
	  const sortedPlayers = winRates.sort((a, b) => b.winRate - a.winRate);
  
	  const worstPlayer = sortedPlayers[sortedPlayers.length - 1];
  
	  res.json(worstPlayer);
	} catch (err) {
	  res.status(500).json({ error: 'Failed to retrieve loser ranking' });
	}
  });
  
  
  

export class App {
	server?: Server;

	async start(): Promise<void> {
		const port = process.env.PORT ?? "8000";
		this.server = new Server(port);

		await this.server.listen();
	}

}


app.listen(8000, () => {
	console.log(
		`✅ Backend App is running at http://localhost:8000 in development mode
✋ Press CTRL-C to stop`);
  });


// Connect to the database
mongoose.connect('mongodb+srv://dbuser:dbuserpp@atlascluster.ccvayit.mongodb.net/', {
	useNewUrlParser: true,
	useUnifiedTopology: true,
  } as ConnectOptions)
  .then(() => {
	console.log("Database connected");
  })
  .catch((error) => {
	console.error("ERROR on db: ", error);
	process.exit(1);
  });