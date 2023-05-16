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

	if (!id) id = 'anonymous';

	if (await PlayerModel.exists({ id }) && id != 'anonymous') {
		return res.status(400).json({ error: 'Player name already exist' });
	}

	const player : Player = { id, password };
	await PlayerModel.create(player);

	const jwtoken = jwt.sign({ id }, secretKey);
	res.json({ player, jwtoken });
});

//PUT /players/{id}: change the name of the player for another that deosnt exist jet
app.put('/player/:id', async (req : Request, res : Response) => {
	const playerId = req.params.id;
	const { newId } = req.body;

	const player = await PlayerModel.findOne({ 'id': playerId });
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


// try {
// 	void new App().start();
// } catch (e) {
// 	process.exit(1);
// }

// process.on("uncaughtException", () => {
// 	process.exit(1);
// });

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