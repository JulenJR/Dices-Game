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
	id : string;
}

let players : Player[];

app.use(express.json());

//POST /player: create a new player if the name doesnt exist jet
app.post('/player', (req : Request, res : Response) => {
	
	let { id } = req.body;

	if (!id) id = 'anonymous'

	if (players.find((player) => player.id === id && player.id != 'anonymous')){
		return res.status(400).json({ error: 'Player name already exist' });
	}

	const player : Player = { id };
	players.push(player);

	const jwtoken = jwt.sign({ id }, secretKey);
	res.json({ player, jwtoken });
});

//PUT /players/{id}: change the name of the player for another that deosnt exist jet
app.put('/player/:id', (req : Request, res : Response) => {

	const playerId = req.params.id;
	const { newId } = req.body;

	const playerIndex = players.findIndex((player) => player.id === playerId);
  if (playerIndex === -1) {
    return res.status(404).json({ error: 'Player not found' });
  }

  if (players.find((player) => player.id === newId)){
	return res.status(400).json({ error: 'This name already' })
  }

  players[playerIndex].id = newId;

  const jwtoken = jwt.sign({ id: playerId, newId }, secretKey);
  res.json({ player: players[playerIndex], jwtoken });

});




app.listen(8000, () => {
	console.log('Server is listening on port 8000');
  });