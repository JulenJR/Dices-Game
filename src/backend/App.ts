import { Server } from "./Server";
import express,{ Request, Response } from "express";
import jwt from 'jsonwebtoken';
import mongoose, { Schema, ConnectOptions } from 'mongoose';

interface Player {
	id : string;
	password : string;
}

const playerSchema = new Schema({
	id: { type: String, required: true },
	password: { type: String, required: true }
});

const PlayerModel = mongoose.model<Player>('Player', playerSchema);

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

	if (!id) id = 'anonymous'

	if (await PlayerModel.exists({ id })) {
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

	const player = await PlayerModel.findOne({ id: playerId });
	if (!player) {
		return res.status(404).json({ error: 'Player not found' });
	}

	if (await PlayerModel.exists({ id: newId })) {
		return res.status(400).json({ error: 'This name already exists' })
	}

	player.id = newId;
	await player.save();

	const jwtoken = jwt.sign({ id: playerId, newId }, secretKey);
	res.json({ player, jwtoken });
});

export class App {
	server?: Server;

	async start(): Promise<void> {
		const port = process.env.PORT ?? "8000";
		this.server = new Server(port);

		await this.server.listen();
	}
}

try {
	void new App().start();
} catch (e) {
	process.exit(1);
}

process.on("uncaughtException", () => {
	process.exit(1);
});

const options: ConnectOptions = {
};

// Connect to the database
mongoose.connect('mongodb+srv://dbuser:dbUserPss@atlascluster.ccvayit.mongodb.net/', options);
