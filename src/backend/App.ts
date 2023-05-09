import { Server } from "./Server";
import express,{ Request, Response } from "express";
import jwt from 'jsonwebtoken';

export class App {
	server?: Server;

	async start(): Promise<void> {
		const port = process.env.PORT ?? "8000";
		this.server = new Server(port);

		await this.server.listen();
	}
}

const app = express();
const secretKey = 'my_secret_key';

interface Player {
	name : string;
}

let players : Player[];

app.use(express.json());

app.post('/player', (req : Request, res : Response) => {
	const { name } = req.body;

	if (players.find((player) => player.name === name)){
		return res.status(400).json({ error: 'Player name already exist' });
	}

	const player : Player = { name };
	players.push(player);

	const jwtoken = jwt.sign({ name }, secretKey);
	res.json({ player, jwtoken });
});

app.listen(8000, () => {
	console.log('Server is listening on port 8000');
  });
